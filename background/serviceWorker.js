/**
 * SBI証券拡張機能のサービスワーカー
 * バックグラウンドでの処理やメッセージのやり取りを担当
 */

import { parseJpyAccountHTML, parseJpyPortfolioCSV, parseJpyTradingLogCsv, parseJpyTodayExecution } from './modules/jpyAccount.js';
import { fetchClosePriceData } from './modules/externalResource.js';

// インストール時の初期化処理
chrome.runtime.onInstalled.addListener((details) => {
    console.log('SBI証券拡張機能がインストールされました:', details.reason);
});

// メッセージタイプと対応するハンドラ関数の対応表
const MESSAGE_HANDLERS = {
    PARSE_JPY_ACCOUNT_HTML: parseJpyAccountHTML,
    PARSE_JPY_PORTFOLIO_CSV: parseJpyPortfolioCSV,
    PARSE_JPY_TRADING_LOG_CSV: parseJpyTradingLogCsv,
    PARSE_JPY_TODAY_EXECUTION: parseJpyTodayExecution,
    FETCH_CLOSE_PRICE_DATA: ({ codes, daysAgo }) => fetchClosePriceData(codes, daysAgo),
};

// コンテンツスクリプトからのメッセージを受信、対応表に基づいて処理を実行
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handler = MESSAGE_HANDLERS[message.type];
    handler(message.params || {})
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスを返すため
});
