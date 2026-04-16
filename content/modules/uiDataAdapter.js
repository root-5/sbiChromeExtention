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
        const { netTotalMarketCap, totalMarketCap, leverageManagementData, tableData, totalProfit, buyingPower, graphData } = accountViewData;

        const leverageRows = leverageManagementData; // レバレッジ管理用行データ
        const tableRows = tableData; // // ポートフォリオテーブル行データ

        // 概要データ（合計、レバレッジ率など）
        const summaryData = {
            netTotalMarketCap: `¥${netTotalMarketCap.toLocaleString()}`,
            leverage: `${((totalMarketCap / netTotalMarketCap) * 100).toFixed(2)}%`,
            buyingPower: `¥${buyingPower.toLocaleString()}`,
            totalProfit: `¥${totalProfit.toLocaleString()}`,
            totalMarketCap: `¥${totalMarketCap.toLocaleString()}`,
            totalProfitValue: totalProfit,
        };

        return { leverageRows, tableRows, summaryData, graphData };
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

        // 円建データの集計
        const jpyNetTotal = accountData.accountViewData.netTotalMarketCap;
        const jpyTotal = accountData.accountViewData.totalMarketCap;
        const jpyBuyingPower = accountData.accountViewData.buyingPower;
        const jpyStocks = accountData.accountViewData.tableData;

        // USDデータの集計
        const usdStocks = usdAccountData.stocks || [];
        const usdTotalStockVal = usdStocks.reduce((sum, s) => sum + s.marketCap, 0);
        const usdDeposit = usdAccountData.totalUsdDepositAsJpy;
        const usdNetAsset = usdTotalStockVal + usdDeposit; // USD純資産

        // iDeCoデータの集計
        const idecoStocks = idecoAccountData || [];
        const idecoTotalVal = idecoStocks.reduce((sum, s) => sum + s.marketCap, 0);

        // 合算計算
        const marginOpenInterest = jpyTotal - jpyNetTotal;
        const newNetTotal = jpyNetTotal + usdNetAsset + idecoTotalVal; // 新純資産 = JPY純資産 + USD純資産 + iDeCo
        const newTotal = newNetTotal + marginOpenInterest; // 新総資産 = 新純資産 + 信用建玉
        const newBuyingPower = jpyBuyingPower + usdDeposit;
        const newLeverage = newNetTotal ? ((newTotal / newNetTotal) * 100).toFixed(2) + '%' : '0.00%';

        // 全口座用のレバレッジ管理用行データを作成
        const leverageRatios = [1.5, 1.35, 1.2];
        const leverageRows = leverageRatios.map((ratio) => {
            const targetTotalAssets = newNetTotal * ratio;
            const diff = targetTotalAssets - newTotal;
            return {
                label: `${Math.round(ratio * 100)}%基準`,
                diffText: `¥${Math.floor(diff).toLocaleString()}`,
            };
        });

        // 円建・外貨建・iDeCo の銘柄を結合、評価額降順ソート、長過ぎる名前を省略表示
        const tableRows = [...jpyStocks, ...usdStocks, ...idecoStocks]
            .sort((a, b) => b.marketCap - a.marketCap)
            .map((s) => ({
                ...s,
                name: s.name.length > 12 ? s.name.slice(0, 10) + '...' : s.name,
            }));

        const totalProfitVal = tableRows.reduce((sum, s) => sum + (s.profitAndLoss), 0); // 総損益計算
        const graphData = tableRows.map((s) => ({ name: s.name, marketCap: s.marketCap })); // グラフデータ

        return {
            summaryData: {
                netTotalMarketCap: `¥${Math.floor(newNetTotal).toLocaleString()}`,
                totalMarketCap: `¥${Math.floor(newTotal).toLocaleString()}`,
                leverage: newLeverage,
                buyingPower: `¥${Math.floor(newBuyingPower).toLocaleString()}`,
                totalProfit: `¥${Math.floor(totalProfitVal).toLocaleString()}`,
                netTotalMarketCapValue: newNetTotal,
                totalMarketCapValue: newTotal,
                totalProfitValue: totalProfitVal,
            },
            leverageRows: leverageRows,
            tableRows: tableRows,
            graphData: graphData,
        };
    }

    /**
     * 取引履歴と当日約定をマージしてソート
     * @param {Array} tradingLog 履歴
     * @param {Array} todayExecutions 当日約定
     * @returns {Array} マージ済みの取引履歴
     */
    static mergeTradingLog(tradingLog, todayExecutions) {
        if (!todayExecutions) return tradingLog;
        const normalizeDate = (dateText) => String(dateText).replace(/\D/g, '');

        // ソートの優先順位は日付降順 > 銘柄コード昇順 > 取引種別昇順
        return [...tradingLog, ...todayExecutions].sort((a, b) =>
            normalizeDate(b.date).localeCompare(normalizeDate(a.date)) ||
            String(a.code).localeCompare(String(b.code)) ||
            String(a.tradeType).localeCompare(String(b.tradeType))
        );
    }

    /**
     * PriceChange表示用データをチェック状態に応じてフィルタリング
     * @param {Array} priceChangeTableData 元データ
     * @param {Set} uncheckedTradeKeys 非表示にする取引のキーセット
     * @returns {Array} フィルタ済みのテーブルデータ
     */
    static filterPriceChangeTableData(priceChangeTableData, uncheckedTradeKeys) {
        if (!priceChangeTableData) return [];
        if (uncheckedTradeKeys.size === 0) return priceChangeTableData;

        // 非チェックキーに一致する銘柄を除外し、全銘柄が除外された日付行も取り除く
        return priceChangeTableData
            .map((priceChangeRecord) => {
                const dateStr = String(priceChangeRecord.date).replace(/\D/g, '');
                const filteredItems = priceChangeRecord.ratioAndQuantity.filter((item) => {
                    const tradeKey = `${dateStr}_${item.code}`;
                    return ![...uncheckedTradeKeys].some((uncheckedKey) => uncheckedKey.includes(tradeKey));
                });
                return { ...priceChangeRecord, ratioAndQuantity: filteredItems };
            })
            .filter((record) => record.ratioAndQuantity.length > 0);
    }
}
