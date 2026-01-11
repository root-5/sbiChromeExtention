/**
 * サービスワーカーから受信したデータをUI表示用に調整するモジュール
 */
export class UIDataAdapter {
    /**
     * ポートフォリオテーブル表示用のデータ生成
     * @param {Object} accountViewData
     * @returns {Object} TemplateEngineに渡すためのデータセット
     */
    static preparePortfolioData(accountViewData) {
        const { netTotalMarketCap, totalMarketCap, leverageManagementData, tableTextData, totalProfit, buyingPower } = accountViewData;

        // レバレッジ管理用行データ
        const leverageRows = leverageManagementData.map((d) => ({
            ...d,
            diff: d.diffText,
        }));

        // ポートフォリオテーブル行データ
        const tableRows = tableTextData.map((item) => ({
            ...item,
            quantity: item.quantityText,
            buyPrice: item.buyPriceText,
            currentPrice: item.currentPriceText,
            marketCap: item.marketCapText,
        }));

        // 概要データ（合計、レバレッジ率など）
        const summaryData = {
            netTotalMarketCap: `¥${netTotalMarketCap.toLocaleString()}`,
            leverage: `${((totalMarketCap / netTotalMarketCap) * 100).toFixed(2)}%`,
            buyingPower: `¥${buyingPower.toLocaleString()}`,
            totalProfit: `¥${totalProfit.toLocaleString()}`,
            totalMarketCap: `¥${totalMarketCap.toLocaleString()}`,
        };

        // スタイルクラス（合計損益の色分け）
        const totalProfitClass = totalProfit > 0 ? 'positive' : totalProfit < 0 ? 'negative' : '';
        const classData = {
            totalProfit: `profit ${totalProfitClass}`,
        };

        return { leverageRows, tableRows, summaryData, classData };
    }

    /**
     * 取引履歴テーブル用のデータ生成（当日約定の追記処理含む）
     * @param {Array} currentLog 現在表示中の取引履歴（キャッシュ）
     * @param {Array} todayExecutions 当日約定データ
     * @returns {Array} 結合された取引履歴リスト
     */
    static mergeTodayExecutions(currentLog, todayExecutions) {
        if (!todayExecutions || todayExecutions.length === 0) return currentLog;
        // 当日約定を先頭に追加
        return [...todayExecutions, ...currentLog];
    }
}
