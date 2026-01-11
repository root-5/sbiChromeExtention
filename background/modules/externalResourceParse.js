/**
 * 外部リソースの変換処理を担当するモジュール
 */
export class ExternalResourceParse {
    /**
     * 終値データのCSVを解析
     * @param {string} csvData 終値データのCSV文字列
     * @returns {Array<{date: string, closePrice: Object}>} 終値データ配列
     * @example
     * [{date: '2024/01/01', closePrice: {'1234': 1500, '5678': 2000}}, ...]
     */
    static parseClosePriceCSV(csvData) {
        try {
            const lines = csvData.trim().split('\n');
            if (lines.length < 2) return [];

            const headers = lines[0].split(',');
            const stockCodes = headers.slice(1);

            return lines.slice(1).map((line) => {
                const values = line.split(',');
                const date = values[0];
                const [year, month, day] = date.split('-');
                const formattedDate = `${year}/${month}/${day}`;

                const closePrice = {};
                stockCodes.forEach((code, index) => {
                    const price = values[index + 1];
                    closePrice[code] = price ? parseFloat(price) : null;
                });

                return { date: formattedDate, closePrice: closePrice };
            });
        } catch (error) {
            console.error('終値CSV解析エラー:', error);
            return [];
        }
    }

    /**
     * GoogleFinanceのHTMLから現在値をパース
     * @param {string} html GoogleFinanceのHTML
     * @returns {number|null} 現在値
     */
    static parseCurrentPriceHTML(html) {
        if (!html) return null;
        try {
            const match = html.match(/data-last-price="([\s\S]*?)"/);
            if (match && match[1]) {
                const priceStr = match[1].replace(/,/g, '');
                return Number(priceStr);
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * 株式価格の現在比と株式増減数を計算してピボットテーブル用データを生成
     * @param {Array<{code: string, price: number}>} currentPrices 現在価格データ
     * @param {Array} totaledTradingLog 整形後取引履歴データ
     * @param {Array} closePriceData 終値データ
     * @returns {Array} ピボットテーブル用データ
     * @example
     * [{date: '20240101', ratioAndQuantity: [{code: '1234', quantity: 100, ratio: 5.2}, ...]}, ...]
     */
    static calculatePriceChangePivot(currentPrices, totaledTradingLog, closePriceData = []) {
        const priceMap = new Map(currentPrices.map((cp) => [cp.code, cp.price]));

        const closePriceMap = new Map();
        closePriceData.forEach((item) => {
            if (!item?.date || !item.closePrice) return;
            Object.entries(item.closePrice).forEach(([code, price]) => {
                if (price == null) return;
                closePriceMap.set(`${item.date}_${code}`, price);
            });
        });

        const allStocksMap = new Map();
        totaledTradingLog.forEach((trade) => {
            if (!allStocksMap.has(trade.code)) {
                allStocksMap.set(trade.code, { code: trade.code, name: trade.name });
            }
        });
        const allStocks = Array.from(allStocksMap.values());

        const dateBasedTradingLog = new Map();
        totaledTradingLog.forEach((trade) => {
            if (!dateBasedTradingLog.has(trade.date)) {
                dateBasedTradingLog.set(trade.date, []);
            }
            dateBasedTradingLog.get(trade.date).push(trade);
        });

        const ratioAndQuantity = Array.from(dateBasedTradingLog.entries()).map(([date, dailyTrades]) => {
            const tradeMap = new Map();
            dailyTrades.forEach((trade) => {
                const currentPrice = priceMap.get(trade.code);
                const quantity = trade.tradeType === '買' ? trade.quantity : -trade.quantity;
                let ratio = 0;
                if (currentPrice && trade.price) {
                    ratio = ((currentPrice - trade.price) / currentPrice) * 100;
                }

                if (tradeMap.has(trade.code)) {
                    const existing = tradeMap.get(trade.code);
                    if (existing.quantity + quantity === 0) {
                        existing.quantity = 0;
                        existing.ratio = 0;
                    } else {
                        const oldWeight = (1 - existing.ratio / 100) * existing.quantity;
                        const newWeight = (1 - ratio / 100) * quantity;
                        if (existing.quantity + quantity !== 0) {
                            existing.ratio = (-(oldWeight + newWeight) / (existing.quantity + quantity)) * 100 + 100;
                        } else {
                            existing.ratio = 0;
                        }
                        existing.quantity += quantity;
                    }
                } else {
                    tradeMap.set(trade.code, { code: trade.code, name: trade.name, quantity, ratio });
                }
            });

            const filledData = allStocks.map((stock) => {
                if (tradeMap.has(stock.code)) {
                    return tradeMap.get(stock.code);
                }

                const closePrice = closePriceMap.get(`${date}_${stock.code}`);
                const currentPrice = priceMap.get(stock.code);
                if (closePrice && currentPrice) {
                    const ratio = ((currentPrice - closePrice) / closePrice) * 100;
                    return { code: stock.code, name: stock.name, quantity: 0, ratio };
                }

                return { code: stock.code, name: stock.name, quantity: 0, ratio: 0 };
            });

            return {
                date: date,
                ratioAndQuantity: filledData,
            };
        });

        return ratioAndQuantity;
    }
}
