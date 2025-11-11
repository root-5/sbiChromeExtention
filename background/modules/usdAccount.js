/**
 * 外貨建て口座APIを取得
 * Service WorkerではCORS制約を受けないため、クロスオリジンリクエストが可能
 * @returns {Promise<Object>} JSONデータ
 */
async function handleFetchUsdAccountAPI() {
    const url = 'https://site.sbisec.co.jp/account/api/foreign/summary';
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            },
            credentials: 'include', // Cookieを含める（ログイン状態を維持）
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const json = await response.json();
        console.log('外貨建て口座API取得成功');
        return json;
    } catch (error) {
        console.error('外貨建て口座API取得エラー:', error);
        throw error;
    }
}

/**
 * 外貨建て口座JSONの解析処理
 * @param {Object} json 外貨建て口座のJSONデータ
 * @returns {Promise<{stocks: Array}>} 外貨建て口座データ
 */
async function parseUsdAccountJSON(json) {
    try {
        console.log('外貨建て口座JSONを解析中...');

        // 株式情報をオブジェクトの配列に変換
        const stocks = [];

        if (!json.stockPortfolio || !Array.isArray(json.stockPortfolio)) {
            console.warn('stockPortfolioが見つかりません');
            return { stocks: [] };
        }

        for (let i = 0; i < json.stockPortfolio.length; i++) {
            // 口座種別を判定
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

            // 各銘柄の詳細情報を処理
            if (!json.stockPortfolio[i].details || !Array.isArray(json.stockPortfolio[i].details)) {
                continue;
            }

            for (let j = 0; j < json.stockPortfolio[i].details.length; j++) {
                const detail = json.stockPortfolio[i].details[j];

                // 円建て取得価格と現在価格を計算
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

        console.log(`外貨建て口座: ${stocks.length}銘柄を抽出しました`);
        return { stocks };
    } catch (error) {
        console.error('外貨建て口座JSONの解析エラー:', error);
        throw error;
    }
}

export { handleFetchUsdAccountAPI, parseUsdAccountJSON };
