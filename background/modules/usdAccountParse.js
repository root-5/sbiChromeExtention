/**
 * 外貨建て口座情報関連の変換処理を担当するモジュール
 */
export class UsdAccountParse {
    /**
     * 外貨建て口座JSONの解析処理
     * @param {Object} json 外貨建て口座のJSONデータ
     * @returns {Promise<{stocks: Array}>} 外貨建て口座データ
     * @example
     * {
     *   stocks: [{code: 'AAPL', name: 'Apple Inc.', quantity: 10, ...}, ...]
     * }
     */
    static async parseAccountJSON(json) {
        try {
            const stocks = [];
            if (!json.stockPortfolio || !Array.isArray(json.stockPortfolio)) {
                return { stocks: [] };
            }

            for (let i = 0; i < json.stockPortfolio.length; i++) {
                let depositType = '';
                switch (json.stockPortfolio[i].depositType) {
                    case 'GROWTH_INVESTMENT':
                        depositType = 'NISA';
                        break;
                    case 'SPECIFIC':
                        depositType = '特定';
                        break;
                    case 'GENERAL':
                        depositType = '一般';
                        break;
                    default:
                        depositType = '不明';
                        break;
                }

                if (!json.stockPortfolio[i].details || !Array.isArray(json.stockPortfolio[i].details)) {
                    continue;
                }

                for (let j = 0; j < json.stockPortfolio[i].details.length; j++) {
                    const detail = json.stockPortfolio[i].details[j];
                    const yenAcquisitionPrice = (detail.yenEvaluateAmount - detail.yenEvaluateProfitLoss) / detail.assetQty;
                    const yenCurrentPrice = detail.yenEvaluateAmount / detail.assetQty;

                    stocks.push({
                        currencyType: '外貨建',
                        depositType: depositType,
                        marginType: '現物',
                        code: detail.securityCode,
                        name: detail.securityName,
                        quantity: detail.assetQty,
                        buyPrice: detail.acquisitionPrice,
                        currentPrice: detail.currentPrice,
                        profitAndLoss: detail.foreignEvaluateProfitLoss,
                        marketCap: detail.foreignEvaluateAmount,
                        yenBuyPrice: yenAcquisitionPrice,
                        yenCurrentPrice: yenCurrentPrice,
                        yenProfitAndLoss: detail.yenEvaluateProfitLoss,
                        yenMarketCap: detail.yenEvaluateAmount,
                    });
                }
            }
            return { stocks };
        } catch (error) {
            console.error('外貨建て口座JSONの解析エラー:', error);
            throw error;
        }
    }
}
