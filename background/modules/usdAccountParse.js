/**
 * 外貨建口座情報関連の変換処理を担当するモジュール
 */
export class UsdAccountParse {
    /**
     * 外貨建口座JSONの解析処理
     * @param {Object} json 外貨建口座のJSONデータ
     * @returns {Promise<{stocks: Array}>} 外貨建口座データ
     * @example
     * {
     *   stocks: [{code: 'AAPL', name: 'Apple Inc.', quantity: 10, ...}, ...]
     * }
     */
    static parseAccountJSON(json) {
        try {
            const stocks = [];
            // 株式情報のパース
            if (json.stockPortfolio && Array.isArray(json.stockPortfolio)) {
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
                        // 円換算取得単価 = (円評価額 - 円評価損益) / 数量
                        // ゼロ除算回避
                        const yenAcquisitionPrice = detail.assetQty ? (detail.yenEvaluateAmount - detail.yenEvaluateProfitLoss) / detail.assetQty : 0;
                        const yenCurrentPrice = detail.assetQty ? detail.yenEvaluateAmount / detail.assetQty : 0;

                        stocks.push({
                            code: detail.securityCode,
                            name: detail.securityName,
                            quantity: detail.assetQty,
                            currentPrice: yenCurrentPrice,
                            buyPrice: yenAcquisitionPrice,
                            marketCap: detail.yenEvaluateAmount,
                            profitAndLoss: detail.yenEvaluateProfitLoss,
                            profitRate: yenAcquisitionPrice ? (detail.yenEvaluateProfitLoss / (yenAcquisitionPrice * detail.assetQty)) * 100 : 0,
                            currencyType: '外貨建',
                            depositType: depositType,
                            marginType: '現物',
                        });
                    }
                }
            }

            // 現金（預り金）情報のパース
            let totalUsdDepositAsJpy = 0;
            if (json.generalAsset && json.generalAsset.deposits && Array.isArray(json.generalAsset.deposits)) {
                for (const deposit of json.generalAsset.deposits) {
                    totalUsdDepositAsJpy += deposit.yenEvaluateAmount || 0;
                }
            }

            return { stocks, totalUsdDepositAsJpy };
        } catch (error) {
            console.error('外貨建口座JSONパースエラー:', error);
            // エラー時は空データを返して処理を止めない
            return { stocks: [], totalUsdDepositAsJpy: 0 };
        }
    }
}
