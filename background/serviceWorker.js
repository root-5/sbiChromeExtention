/**
 * SBI証券拡張機能のサービスワーカー
 * バックグラウンドでの処理やメッセージのやり取りを担当
 */

import { parseJpyAccountHTML, parseJpyPortfolioCSV, parseJpyTradingLogCsv, parseJpyTodayExecution } from './modules/jpyAccount.js';
import { fetchClosePriceData, fetchCurrentPriceData } from './modules/externalResource.js';
import { totalTradingLog, processAccountDataForTable, processTodayExecutions, calculatePriceChangePivot } from './modules/dataFormatter.js';

// キャッシュ変数
let cachedTradingLogOriginal = null; // CSVパース直後の生データ
let cachedTotaledTradingLog = null; // 集計後の取引履歴データ
let cachedClosePriceData = null; // 終値データ

// インストール時の初期化処理
chrome.runtime.onInstalled.addListener((details) => {
    console.log('SBI証券拡張機能がインストールされました:', details.reason);
});

// メッセージハンドラ定義
const MESSAGE_HANDLERS = {
    /**
     * 初回データ取得（取引履歴）
     */
    GET_INITIAL_DATA: async () => {
        try {
            const rawData = await parseJpyTradingLogCsv(); // 取引履歴CSV取得＆パース
            cachedTradingLogOriginal = rawData.tradingLog; // キャッシュ保存
            cachedTotaledTradingLog = totalTradingLog(cachedTradingLogOriginal); // 集計

            // 表示形式になるようフォーマット
            const formattedLog = cachedTotaledTradingLog.map((item) => ({
                ...item,
                quantity: item.quantity.toLocaleString(),
                price: Math.floor(item.price).toLocaleString(),
            }));

            return { tradingLog: formattedLog };
        } catch (error) {
            console.error('GET_INITIAL_DATA Error:', error);
            throw error;
        }
    },

    /**
     * 定期更新データ取得（口座情報、ポートフォリオ、当日約定、株価等）
     */
    GET_REFRESH_DATA: async () => {
        try {
            // 1. 各種データを並列取得
            const [accountData, portfolioData, todayExecutionData] = await Promise.all([parseJpyAccountHTML(), parseJpyPortfolioCSV(), parseJpyTodayExecution()]);

            // 2. 口座データとポートフォリオのマージとテーブル用データ生成
            // (HTML由来の buyingPower, cashBalance と CSV由来の portfolio を使用)
            const mergedData = {
                buyingPower: accountData.buyingPower,
                cashBalance: accountData.cashBalance,
                stocks: portfolioData.portfolio,
            };
            const accountViewData = processAccountDataForTable(mergedData);

            // 3. グラフ・テーブル内の銘柄コード抽出
            const codes = accountViewData.graphData
                .filter((d) => d.code) // 調整後現金などを除外
                .map((d) => d.code);

            // 4. 現在値取得
            const currentPrices = await fetchCurrentPriceData(codes);

            // 5. 終値取得
            // 終値キャッシュがない場合は取得
            if (!cachedClosePriceData) {
                // 全取引履歴に含まれる銘柄コードを抽出
                const stockCodes = [...new Set(cachedTotaledTradingLog.map((trade) => trade.code).filter(Boolean))];
                // 銘柄数が0でなければ取得
                if (stockCodes.length > 0) {
                    const res = await fetchClosePriceData(stockCodes, 15);
                    cachedClosePriceData = res && res.success !== false ? res.closePriceData : [];
                } else {
                    cachedClosePriceData = [];
                }
            }

            // 6. 当日約定データの処理
            // processTodayExecutions は集計のみ返す。View側でフォーマットが必要なためここでフォーマットも行う
            const processedTodayExecutions = processTodayExecutions(todayExecutionData.todayExecutions);
            const formattedTodayExecutions = processedTodayExecutions.map((item) => ({
                ...item,
                quantity: item.quantity.toLocaleString(),
                price: Math.floor(item.price).toLocaleString(),
            }));

            // 7. 価格変動ピボットテーブルの計算
            const priceChangePivot = calculatePriceChangePivot(currentPrices, cachedTotaledTradingLog, cachedClosePriceData);

            // すべてまとめて返す
            return {
                accountViewData, // テーブル・チャート用
                todayExecutions: formattedTodayExecutions, // 取引履歴への追記用
                priceChangePivot, // 株価変動テーブル用
            };
        } catch (error) {
            console.error('GET_REFRESH_DATA Error:', error);
            throw error;
        }
    },
};

// コンテンツスクリプトからのメッセージを受信、対応表に基づいて処理を実行
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    const handler = MESSAGE_HANDLERS[message.type];
    if (typeof handler === 'function') {
        handler(message.params || {})
            .then((data) => sendResponse({ success: true, data }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true; // 非同期レスポンスを返すため
    } else {
        // 未知のメッセージタイプ
        console.warn('Unknown or invalid message type:', message.type);
        sendResponse({ success: false, error: 'Unknown or invalid message type' });
    }
});
