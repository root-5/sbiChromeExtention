/**
 * SBI証券拡張機能のサービスワーカー
 * バックグラウンドでの処理やメッセージのやり取りを担当
 */

import { JpyAccountFetch } from './modules/jpyAccountFetch.js';
import { JpyAccountParse } from './modules/jpyAccountParse.js';
import { UsdAccountFetch } from './modules/usdAccountFetch.js';
import { UsdAccountParse } from './modules/usdAccountParse.js';
import { IdecoAccountFetch } from './modules/idecoAccountFetch.js';
import { IdecoAccountParse } from './modules/idecoAccountParse.js';
import { ExternalResourceFetch } from './modules/externalResourceFetch.js';
import { ExternalResourceParse } from './modules/externalResourceParse.js';
import { ExternalResourcePost } from './modules/externalResourcePost.js';

// インストール時の初期化処理
chrome.runtime.onInstalled.addListener(() => {
    console.log('SBI証券拡張機能がインストールされました');
});

// キャッシュ変数
let cachedUsdData = null; // 外貨建口座データ
let cachedIdecoData = null; // iDeCo口座データ
let cachedTotaledTradingLog = null; // 集計後の取引履歴データ
let cachedClosePriceData = null; // 終値データ
let postData = null; // 送信データ

// 初期化用のプロミス。複数回同時にリクエストが来ることを防ぐ
let initialDataPromise = null;
// 全口座データ取得用のプロミス。重複取得を防ぐ
let allAccountDataPromise = null;

/**
 * 全口座データ（外貨建て・iDeCo 口座）を取得・キャッシュする共通ヘルパー
 * すでにキャッシュ済みの場合はそれを返し、取得中の場合は同じプロミスを返す
 */
const fetchAllAccountData = () => {
    if (cachedUsdData) return Promise.resolve({ usdAccountData: cachedUsdData, idecoAccountData: cachedIdecoData });
    if (allAccountDataPromise) return allAccountDataPromise;

    allAccountDataPromise = (async () => {
        const [usdJson, idecoHtml] = await Promise.all([UsdAccountFetch.fetchAccountAPI(), IdecoAccountFetch.fetchAccountAPI()]);
        cachedUsdData = UsdAccountParse.parseAccountJSON(usdJson);
        cachedIdecoData = idecoHtml ? IdecoAccountParse.parseAccountHTML(idecoHtml) : [];
        return { usdAccountData: cachedUsdData, idecoAccountData: cachedIdecoData };
    })().finally(() => {
        allAccountDataPromise = null;
    });

    return allAccountDataPromise;
};

// メッセージハンドラ定義
const MESSAGE_HANDLERS = {
    /**
     * 初回データ取得（取引履歴、および iDeCo/外貨建口座情報）
     */
    GET_INITIAL_DATA: async () => {
        // すでに取得中であれば、そのプロミスを返す
        if (initialDataPromise) {
            return await initialDataPromise;
        }

        initialDataPromise = (async () => {
            try {
                // 取引履歴の取得・パース・集計・フォーマット
                const tradingLogCsv = await JpyAccountFetch.fetchTradingLogCsv();
                const parsedTradingLog = JpyAccountParse.parseTradingLogCsv(tradingLogCsv);
                cachedTotaledTradingLog = JpyAccountParse.summarizeTradingLog(parsedTradingLog.tradingLog);
                const formattedLog = cachedTotaledTradingLog.map((item) => ({
                    ...item,
                    quantity: item.quantity.toLocaleString(),
                    price: Math.floor(item.price).toLocaleString(),
                }));

                return { tradingLog: formattedLog };
            } finally {
                // 取得完了またはエラー終了後、プロミスをクリア
                initialDataPromise = null;
            }
        })();

        return await initialDataPromise;
    },

    /**
     * 全口座データ取得（外貨建て・iDeCo 口座）
     * fetchAllAccountData ヘルパーに委譲することで重複取得を防ぐ
     */
    GET_ALL_ACCOUNT_DATA: async () => {
        return await fetchAllAccountData();
    },

    /**
     * 定期更新データ取得（口座情報、ポートフォリオ、当日約定、株価等）
     */
    GET_REFRESH_DATA: async () => {
        // まだ初期データの取得が完了していない場合は待機または実行を促す
        if (!cachedTotaledTradingLog) {
            if (initialDataPromise) {
                await initialDataPromise;
            } else {
                await MESSAGE_HANDLERS.GET_INITIAL_DATA();
            }
        }

        // 1. 各種データ取得
        const [accountHtml, portfolioCsv, todayExecutionHtml] = await Promise.all([JpyAccountFetch.fetchAccountPage(), JpyAccountFetch.fetchPortfolioCSV(), JpyAccountFetch.fetchTodayExecutionPage()]);

        // 2. 変換処理
        const accountData = JpyAccountParse.parseAccountHTML(accountHtml);
        const portfolioData = JpyAccountParse.parsePortfolioCSV(portfolioCsv);
        const todayExecutionData = JpyAccountParse.parseTodayExecution(todayExecutionHtml);

        // 3. テーブル・チャート用データ生成
        const mergedJpyData = {
            buyingPower: accountData.buyingPower,
            cashBalance: accountData.cashBalance,
            stocks: portfolioData.portfolio,
        };
        const accountViewData = JpyAccountParse.formatAccountDataForTable(mergedJpyData);

        // 4. 現在値取得
        // 保有中の銘柄に加え、取引履歴に登場する銘柄も対象とする
        // （保有中でない銘柄の変化率を正しく計算するために現在価格が必要なため）
        const portfolioCodes = accountViewData.graphData.filter((d) => d.code).map((d) => d.code);
        const tradingLogCodes = cachedTotaledTradingLog.map((trade) => trade.code).filter(Boolean);
        const codes = [...new Set([...portfolioCodes, ...tradingLogCodes])];
        const currentPricePromises = codes.map(async (code) => {
            const result = await ExternalResourceFetch.fetchCurrentPriceHTML(code);
            return {
                code: code,
                price: ExternalResourceParse.parseCurrentPriceHTML(result.html),
            };
        });
        const currentPrices = await Promise.all(currentPricePromises);

        // 5. 集計後取引履歴＆終値データのキャッシュ確認・取得
        if (!cachedClosePriceData) {
            const stockCodes = [...new Set(cachedTotaledTradingLog.map((trade) => trade.code).filter(Boolean))];
            if (stockCodes.length > 0) {
                const csv = await ExternalResourceFetch.fetchClosePrices(stockCodes, 15);
                const data = ExternalResourceParse.parseClosePriceCSV(csv);
                cachedClosePriceData = data;
            } else {
                cachedClosePriceData = [];
            }
        }

        // 6. 当日約定データの処理
        const processedTodayExecutions = JpyAccountParse.summarizeTodayExecutions(todayExecutionData.todayExecutions);
        const formattedTodayExecutions = processedTodayExecutions.map((item) => ({
            ...item,
            quantity: item.quantity.toLocaleString(),
            price: Math.floor(item.price).toLocaleString(),
        }));

        // 7. 価格変動ピボットテーブルの計算
        const priceChangePivot = ExternalResourceParse.calculatePriceChangePivot(currentPrices, cachedTotaledTradingLog, cachedClosePriceData);

        // 8. バックグラウンドで全口座データを取得してから外部サーバーへ送信
        // （円口座の表示をブロックしないよう await せず非同期で実行する）
        (async () => {
            await fetchAllAccountData();
            const mergedAllData = {
                buyingPower: accountData.buyingPower,
                cashBalance: accountData.cashBalance,
                stocks: [...portfolioData.portfolio, ...(cachedUsdData?.stocks ?? []), ...(cachedIdecoData ?? [])],
            };
            const newPostData = {
                accountData: mergedAllData,
                tradingLog: [...processedTodayExecutions, ...cachedTotaledTradingLog],
            };
            if (JSON.stringify(newPostData) !== JSON.stringify(postData)) {
                postData = newPostData;
                ExternalResourcePost.postAccountData(postData);
            }
        })();

        // 円口座データをすぐに返す（全口座データ取得・送信はバックグラウンドで継続）
        return {
            accountViewData, // テーブル・チャート用
            todayExecutions: formattedTodayExecutions, // 取引履歴への追記用
            priceChangePivot, // 株価変動テーブル用
        };
    },
};

// コンテンツスクリプトからのメッセージを受信、対応表に基づいて処理を実行
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!MESSAGE_HANDLERS[message.type]) return false; // ハンドラが存在しない場合は処理しない
    const handler = MESSAGE_HANDLERS[message.type];
    handler(message.params)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスを返すため
});
