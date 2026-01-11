/**
 * ==============================================================
 * SBI証券のWebページにテンプレートを挿入、データの取得やUI改善を行う
 * ==============================================================
 */

// グローバル変数
let jpyAccountChart;

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
    const { tradingLog } = await JpyAccount.fetchInitialData(); // 昨日以前の取引履歴は毎回取得する必要がないため初回だけ取得
    JpyAccount.drawTradingLogTable(tradingLog);
    setupLeverageCalculator();

    // 最初のデータ更新
    await updateJpyAccount();
    TemplateEngine.updateTime('lastUpdateTime');

    // 1秒ごとに定期実行するスケジューラーをセット
    const scheduler = setInterval(() => schedulerTask(), 1000);
    window.addEventListener('beforeunload', () => clearInterval(scheduler));
}

/**
 * 円建て口座データを取得して、グラフとテーブルを描画
 */
async function updateJpyAccount() {
    const { accountViewData, todayExecutions, priceChangePivot } = await JpyAccount.fetchRefreshData();

    jpyAccountChart = JpyAccount.drawCircleChart(accountViewData.graphData, jpyAccountChart); // チャートデータ更新
    JpyAccount.drawPortfolioTable(accountViewData); // テーブル再描画
    JpyAccount.drawTodayExecutionToTradingLogTable(todayExecutions); // 当日約定追記
    JpyAccount.drawPriceChangeTable(priceChangePivot); // 価格変動テーブル描画
}

/**
 * 時刻更新と updateJpyAccount 実行を行う関数（定期更新用）
 */
function schedulerTask() {
    // 時刻表示を更新
    TemplateEngine.updateTime('currentTime');
    
    // 平日の場中（9:00〜15:30）以外は処理をスキップ
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (day === 0 || day === 6) return;
    if (hours < 9 || (hours === 15 && minutes > 30) || hours > 15) return;

    // 毎分0秒に口座情報と最終更新時刻を更新
    if (now.getSeconds() === 0) {
        updateJpyAccount();
        TemplateEngine.updateTime('lastUpdateTime');
    }
}
