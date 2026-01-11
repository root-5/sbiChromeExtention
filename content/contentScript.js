/**
 * ==============================================================
 * SBI証券のWebページにテンプレートを挿入、データの取得やUI改善を行う
 * ==============================================================
 */

import { BackendClient } from './modules/backendClient.js';
import { UIDataAdapter } from './modules/uiDataAdapter.js';
import { TemplateEngine } from './modules/templateEngine.js';
import { DynamicView } from './modules/dynamicView.js';

// グローバル変数
let jpyAccountChart = null;
let tradingLogCache = [];

// ポートフォリオページが表示されたときにのみ実行
const title = document.title;
if (title.includes('ポートフォリオ')) main();

/**
 * メイン処理
 */
async function main() {
    const TEMPLATE = 'content/templates/portfolioPanel.html';
    const TARGET_ELE_ID = 'TIMEAREA01';

    // 初期描画
    await TemplateEngine.setTemplate(TARGET_ELE_ID, TEMPLATE);

    // 初回データ取得（取引履歴）
    const { tradingLog } = await BackendClient.fetchInitialData();
    tradingLogCache = tradingLog || [];

    // 取引履歴テーブル描画
    TemplateEngine.bindTableRows('jpyAccountTradingLogRow', tradingLogCache);

    // レバレッジ計算機初期化
    DynamicView.initializeLeverageCalculator();

    // 最初のデータ更新
    await updateJpyAccount();
    TemplateEngine.updateTime('lastUpdateTime');

    // 定期実行スケジューラー
    const scheduler = setInterval(() => schedulerTask(), 1000);
    window.addEventListener('beforeunload', () => clearInterval(scheduler));
}

/**
 * 円建て口座データを取得して、グラフとテーブルを描画
 */
async function updateJpyAccount() {
    // データ取得
    const { accountViewData, todayExecutions, priceChangePivot } = await BackendClient.fetchRefreshData();

    // UI用データ加工
    const { leverageRows, tableRows, summaryData, classData } = UIDataAdapter.preparePortfolioData(accountViewData);
    const mergedLog = UIDataAdapter.mergeTodayExecutions(tradingLogCache, todayExecutions);

    // テーブル描画
    TemplateEngine.bindTableRows('leverageManagementRow', leverageRows);
    TemplateEngine.bindTableRows('jpyAccountTableRow', tableRows);
    TemplateEngine.bindData(summaryData);
    TemplateEngine.bindClass(classData);
    TemplateEngine.bindPivotTable(priceChangePivot);
    TemplateEngine.bindTableRows('jpyAccountTradingLogRow', mergedLog);

    // チャート描画
    jpyAccountChart = DynamicView.drawCircleChart(accountViewData.graphData, jpyAccountChart);
}

/**
 * 定期実行タスク
 */
function schedulerTask() {
    // 現在時刻更新
    TemplateEngine.updateTime('currentTime');

    // 平日の場中（9:00〜15:30）以外は処理をスキップ
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (day === 0 || day === 6) return; // 土日
    if (hours < 9 || (hours === 15 && minutes > 30) || hours > 15) return; // 時間外

    // 毎分0秒にデータ更新
    if (now.getSeconds() === 0) {
        updateJpyAccount();
        TemplateEngine.updateTime('lastUpdateTime');
    }
}
