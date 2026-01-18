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

    /**
     * 全口座ポートフォリオ表示用のデータ生成
     * @param {Object} accountData JPY口座データ (DataRefreshResponse)
     * @param {Object} usdAccountData USD口座データ
     * @param {Array} idecoAccountData iDeCo口座データ
     * @returns {Object} Preactコンポーネントに渡すためのデータセット
     */
    static prepareAllAccountPortfolioData(accountData, usdAccountData, idecoAccountData) {
        if (!accountData || !usdAccountData) return null;

        // JPY側数値パース (カンマと¥記号を除去して数値化)
        const parseNum = (str) => (typeof str === 'string' ? parseFloat(str.replace(/[¥,]/g, '')) : str || 0);

        const viewData = accountData.accountViewData;
        const jpyNetTotal = parseNum(viewData.netTotalMarketCap);
        const jpyTotal = parseNum(viewData.totalMarketCap);
        const jpyBuyingPower = parseNum(viewData.buyingPower);
        const jpyStocks = viewData.tableTextData || [];

        // USDデータの集計
        const usdStocks = usdAccountData.stocks || [];
        const usdTotalStockVal = usdStocks.reduce((sum, s) => sum + s.marketCap, 0);
        const usdDeposit = usdAccountData.totalUsdDepositAsJpy || 0;
        const usdNetAsset = usdTotalStockVal + usdDeposit; // USD純資産

        // iDeCoデータの集計
        const idecoStocks = idecoAccountData || [];
        const idecoTotalVal = idecoStocks.reduce((sum, s) => sum + s.marketCap, 0);

        // 合算計算
        const marginOpenInterest = jpyTotal - jpyNetTotal;
        const newNetTotal = jpyNetTotal + usdNetAsset + idecoTotalVal; // 新純資産 = JPY純資産 + USD純資産 + iDeCo
        const newTotal = newNetTotal + marginOpenInterest; // 新総資産 = 新純資産 + 信用建玉
        const newBuyingPower = jpyBuyingPower + usdDeposit;
        const newLeverage = newNetTotal ? (newTotal / newNetTotal).toFixed(2) : '0.00';

        // 株式リスト結合＆ソート（評価額降順）
        const formattedJpyStocks = jpyStocks.map((s) => ({
            ...s,
            currentPrice: parseNum(s.currentPriceText || s.currentPrice),
            marketCap: parseNum(s.marketCapText || s.marketCap),
            profitAndLoss: parseNum(s.profitAndLossText || s.profitAndLoss),
            profitRate: parseNum(s.profitRate !== undefined ? s.profitRate : s.profitAndLossRate),
        }));

        // 円建・外貨建・iDeCo の銘柄を結合、評価額降順ソート、長過ぎる名前を省略表示
        const tableRows = [...formattedJpyStocks, ...usdStocks, ...idecoStocks]
            .sort((a, b) => b.marketCap - a.marketCap)
            .map((s) => ({
                ...s,
                name: s.name.length > 20 ? s.name.slice(0, 17) + '...' : s.name,
            }));

        // グラフデータ
        const graphData = tableRows.map((s) => ({ name: s.name, marketCap: s.marketCap }));

        return {
            summaryData: {
                netTotalMarketCap: Math.floor(newNetTotal).toLocaleString(),
                totalMarketCap: Math.floor(newTotal).toLocaleString(),
                leverage: newLeverage,
                buyingPower: Math.floor(newBuyingPower).toLocaleString(),
                netTotalMarketCapValue: newNetTotal,
                totalMarketCapValue: newTotal,
            },
            tableRows: tableRows,
            graphData: graphData,
        };
    }
}
