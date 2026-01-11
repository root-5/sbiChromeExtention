/**
 * SBI証券拡張機能のサービスワーカー
 * バックグラウンドでの処理やメッセージのやり取りを担当
 */

import { JpyAccountFetch } from './modules/jpyAccountFetch.js';
import { JpyAccountParse } from './modules/jpyAccountParse.js';
import { UsdAccountFetch } from './modules/usdAccountFetch.js';
import { UsdAccountParse } from './modules/usdAccountParse.js';
import { ExternalResourceFetch } from './modules/externalResourceFetch.js';
import { ExternalResourceParse } from './modules/externalResourceParse.js';

// インストール時の初期化処理
chrome.runtime.onInstalled.addListener(() => {
    console.log('SBI証券拡張機能がインストールされました');
});

// キャッシュ変数
let cachedTradingLogOriginal = null; // CSVパース直後の生データ
let cachedTotaledTradingLog = null; // 集計後の取引履歴データ
let cachedClosePriceData = null; // 終値データ

// メッセージハンドラ定義
const MESSAGE_HANDLERS = {
    /**
     * 初回データ取得（取引履歴、および外貨建て口座情報）
     */
    GET_INITIAL_DATA: async () => {
        // 並行して実行
        const [csv, usdJson] = await Promise.all([
            JpyAccountFetch.fetchTradingLogCsv(),
            UsdAccountFetch.fetchAccountAPI().catch((e) => {
                return {}; // 失敗時も空オブジェクトで続行
            }),
        ]);

        // 取引履歴パース
        const rawData = JpyAccountParse.parseTradingLogCsv(csv);
        cachedTradingLogOriginal = rawData.tradingLog;

        // 集計
        cachedTotaledTradingLog = JpyAccountParse.summarizeTradingLog(cachedTradingLogOriginal);

        // 表示用にフォーマットして返却
        const formattedLog = cachedTotaledTradingLog.map((item) => ({
            ...item,
            quantity: item.quantity.toLocaleString(),
            price: Math.floor(item.price).toLocaleString(),
        }));

        // 外貨口座パース
        const usdData = await UsdAccountParse.parseAccountJSON(usdJson);

        return {
            tradingLog: formattedLog,
            usdAccountData: usdData,
        };
    },

    /**
     * 定期更新データ取得（口座情報、ポートフォリオ、当日約定、株価等）
     */
    GET_REFRESH_DATA: async () => {
        // 1. 各種データ取得
        const [accountHtml, portfolioCsv, todayExecutionHtml] = await Promise.all([JpyAccountFetch.fetchAccountPage(), JpyAccountFetch.fetchPortfolioCSV(), JpyAccountFetch.fetchTodayExecutionPage()]);

        // 2. 変換処理
        const accountData = JpyAccountParse.parseAccountHTML(accountHtml);
        const portfolioData = JpyAccountParse.parsePortfolioCSV(portfolioCsv);
        const todayExecutionData = JpyAccountParse.parseTodayExecution(todayExecutionHtml);

        // 3. テーブル・チャート用データ生成
        const mergedData = {
            buyingPower: accountData.buyingPower,
            cashBalance: accountData.cashBalance,
            stocks: portfolioData.portfolio,
        };
        const accountViewData = JpyAccountParse.formatAccountDataForTable(mergedData);

        // 4. 現在値取得
        const codes = accountViewData.graphData.filter((d) => d.code).map((d) => d.code);
        const currentPricePromises = codes.map(async (code) => {
            const result = await ExternalResourceFetch.fetchCurrentPriceHTML(code);
            return {
                code: code,
                price: ExternalResourceParse.parseCurrentPriceHTML(result.html),
            };
        });
        const currentPrices = await Promise.all(currentPricePromises);

        // 5. 集計後取引履歴＆終値データのキャッシュ確認・取得
        if (!cachedTotaledTradingLog) {
            const csv = await JpyAccountFetch.fetchTradingLogCsv();
            const rawData = JpyAccountParse.parseTradingLogCsv(csv);
            cachedTradingLogOriginal = rawData.tradingLog;
            cachedTotaledTradingLog = JpyAccountParse.summarizeTradingLog(cachedTradingLogOriginal);
        }
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

        // すべてまとめて返す
        return {
            accountViewData, // テーブル・チャート用
            todayExecutions: formattedTodayExecutions, // 取引履歴への追記用
            priceChangePivot, // 株価変動テーブル用
        };
    },
};

// コンテンツスクリプトからのメッセージを受信、対応表に基づいて処理を実行
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handler = MESSAGE_HANDLERS[message.type];
    handler(message.params)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスを返すため
});
