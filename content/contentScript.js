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
    // テンプレートを読み込み、指定要素にセット
    const TARGET_ELE_ID = 'TIMEAREA01';
    const TEMPLATE = 'content/templates/portfolioPanel.html';
    await TemplateEngine.setTemplate(TARGET_ELE_ID, TEMPLATE);

    // 初期描画 (データ取得)
    const { tradingLog } = await JpyAccount.fetchInitialData();
    // 整形はSWで済み
    JpyAccount.drawTradingLogTable(tradingLog);
    setupLeverageCalculator();

    // 最初の更新
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
    try {
        const { accountViewData, todayExecutions, priceChangePivot } = await JpyAccount.fetchRefreshData();

        jpyAccountChart = JpyAccount.drawCircleChart(accountViewData.graphData, jpyAccountChart); // チャートデータ更新
        JpyAccount.drawPortfolioTable(accountViewData); // テーブル再描画
        JpyAccount.drawTodayExecutionToTradingLogTable(todayExecutions); // 当日約定追記
        JpyAccount.drawPriceChangeTable(priceChangePivot); // 価格変動テーブル描画
    } catch (e) {
        console.error('Update Jpy Account Failed:', e);
    }
}

/**
 * 時刻更新と円建て口座データの定期更新する関数
 */
function schedulerTask() {
    const now = new Date();

    // 時刻表示を更新
    TemplateEngine.updateTime('currentTime');

    // 平日の場中（9:00〜15:30）以外は処理をスキップ
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
