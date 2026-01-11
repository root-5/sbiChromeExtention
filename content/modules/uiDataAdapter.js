// =======================================
// UI表示用データ変換モジュール
// =======================================

export class UIDataAdapter {
    /**
     * ポートフォリオテーブル表示用のデータ生成
     * @param {Object} accountViewData
     * @returns {Object} Preactコンポーネントに渡すためのデータセット
     */
    static preparePortfolioData(accountViewData) {
        const { netTotalMarketCap, totalMarketCap, leverageManagementData, tableTextData, totalProfit, buyingPower, graphData } = accountViewData;

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

        return { leverageRows, tableRows, summaryData, classData, graphData };
    }
}
