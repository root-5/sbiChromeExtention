/**
 * ==============================================================
 * SBI証券のWebページに挿入され、データの取得やUI改善を行う
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
    // テンプレートを読み込み
    const TARGET_ELE_ID = 'TIMEAREA01';
    const TEMPLATE = 'content/templates/portfolioPanel.html';
    await TemplateEngine.setTemplate(TARGET_ELE_ID, TEMPLATE);

    // 初期描画
    const { tradingLog } = await JpyAccount.extractAccountDataJustOnce();
    JpyAccount.drawTradingLogTable(tradingLog);

    // 最初の更新（取引履歴を渡す）
    await updateJpyAccount(tradingLog);
    TemplateEngine.updateTime('lastUpdateTime');

    // 1秒ごとに定期実行するスケジューラーをセット（取引履歴を渡す）
    const scheduler = setInterval(() => schedulerTask(tradingLog), 1000);
    window.addEventListener('beforeunload', () => clearInterval(scheduler));
}

/**
 * 円建て口座データを取得して、グラフとテーブルを描画
 * @param {Array} tradingLog 取引履歴データ
 */
async function updateJpyAccount(tradingLog = []) {
    // データ取得
    const { buyingPower, cashBalance, stocks, todayExecution } = await JpyAccount.extractAccountDataPerMinute();
    const jpyAccountTableData = JpyAccount.convertToTable({ cashBalance, stocks });
    const numberOfDays = 20;
    const { closePriceData } = await ExternalResource.fetchClosePriceData(stocks, numberOfDays);

    // UI更新（チャートはグローバル変数で保持）
    jpyAccountChart = JpyAccount.drawCircleChart(jpyAccountTableData, jpyAccountChart);
    JpyAccount.drawPortfolioTable({ buyingPower, cashBalance, stocks }, jpyAccountTableData);
    JpyAccount.drawTodayExecutionToTradingLogTable(todayExecution);
    JpyAccount.drawPriceChangeTable(closePriceData, jpyAccountTableData, tradingLog);
}

/**
 * 時刻更新と円建て口座データの定期更新する関数
 * @param {Array} tradingLog 取引履歴データ
 */
function schedulerTask(tradingLog) {
    const now = new Date();

    // 時刻表示を更新
    TemplateEngine.updateTime('currentTime');

    // 平日の場中（9:00〜15:30）以外は処理をスキップ
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    // if (day === 0 || day === 6) return;
    // if (hours < 9 || (hours === 15 && minutes > 30) || hours > 15) return;

    // 毎分0秒に口座情報と最終更新時刻を更新
    if (now.getSeconds() === 0) {
        updateJpyAccount(tradingLog);
        TemplateEngine.updateTime('lastUpdateTime');
    }
}
