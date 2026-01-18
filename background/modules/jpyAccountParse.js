/**
 * 円建口座情報関連の変換処理を担当するモジュール
 */
export class JpyAccountParse {
    /**
     * 口座管理HTMLを解析して口座情報を抽出
     * @param {string} html 口座管理ページのHTML
     * @returns {{buyingPower: number, cashBalance: number, stocks: Array}} 口座データ
     * @example
     * {
     *   buyingPower: 100000,
     *   cashBalance: 50000,
     *   stocks: [{code: '1234', name: '銘柄A', quantity: 100, ...}, ...]
     * }
     */
    static parseAccountHTML(html) {
        try {
            // 買付余力を取得
            const buyingPowerRegex = /<td width="150" class="mtext" align="right"><div class="margin">(.{1,10})&nbsp;/;
            const buyingPowerMatch = html.match(buyingPowerRegex);
            if (!buyingPowerMatch) throw new Error('買付余力のデータが見つかりませんでした');
            const buyingPower = Number(buyingPowerMatch[1].replace(/,/g, ''));

            // 現金残高を取得
            const cashBalanceRegex = /<td class="mtext" align="right"><div class="margin"><font color="black">(.{1,10})<\/font>&nbsp;<\/div><\/td>/;
            const cashBalanceMatch = html.match(cashBalanceRegex);
            if (!cashBalanceMatch) throw new Error('現金残高のデータが見つかりませんでした');
            const cashBalance = Number(cashBalanceMatch[1].replace(/,/g, ''));

            // 株式情報の抽出
            const stockTableRegex = /<table border="0" cellspacing="1" cellpadding="1" width="400"><tr><td class="mtext" colspan="4"><font color="#336600">(.*)<\/font><\/b><\/td><\/tr><\/table>/g;
            const stockTableElem = html.match(stockTableRegex) || [];

            let match;
            let stockMarginTypes = [];
            let stockCodes = [];
            let stockNames = [];
            let stockQuantity = [];
            let stockBuyingPrices = [];
            let stockNowPrices = [];
            const stockCodesRegex = /i_stock_sec=(.{1,6})\+&amp;/g;
            const stockNamesRegex = /PER=1">(.{1,20})<\/a>/g;
            const stockQuantityandPricesRegex = /<td class="mtext">(.{1,10})<\/td>/g;

            for (let i = 0; i < stockTableElem.length; i++) {
                const marginType = i === 0 ? '現物' : '信用';
                while ((match = stockCodesRegex.exec(stockTableElem[i])) !== null) {
                    stockMarginTypes.push(marginType);
                    stockCodes.push(match[1]);
                }
                while ((match = stockNamesRegex.exec(stockTableElem[i])) !== null) {
                    stockNames.push(match[1]);
                }
                let count = 0;
                while ((match = stockQuantityandPricesRegex.exec(stockTableElem[i])) !== null) {
                    switch (count % 3) {
                        case 0:
                            stockQuantity.push(Number(match[1].replace(/,/g, '')));
                            break;
                        case 1:
                            stockBuyingPrices.push(Number(match[1].replace(/,/g, '')));
                            break;
                        case 2:
                            stockNowPrices.push(Number(match[1].replace(/,/g, '')));
                            break;
                    }
                    count++;
                }
            }

            const stocks = [];
            for (let i = 0; i < stockCodes.length; i++) {
                stocks.push({
                    currencyType: '円建',
                    depositType: '特定',
                    marginType: stockMarginTypes[i],
                    code: stockCodes[i],
                    name: stockNames[i].replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)),
                    quantity: stockQuantity[i],
                    buyPrice: stockBuyingPrices[i],
                    currentPrice: stockNowPrices[i],
                    profitAndLoss: (stockNowPrices[i] - stockBuyingPrices[i]) * stockQuantity[i],
                    marketCap: stockNowPrices[i] * stockQuantity[i],
                });
            }

            return { buyingPower, cashBalance, stocks };
        } catch (error) {
            console.error('ポートフォリオデータの抽出エラー:', error);
            throw error;
        }
    }

    /**
     * ポートフォリオCSVを解析
     * @param {string} csv ポートフォリオCSV文字列
     * @returns {{portfolio: Array}} ポートフォリオデータ
     * @example
     * { portfolio: [{code: '1234', name: '銘柄A', quantity: 100, ...}, ...] }
     */
    static parsePortfolioCSV(csv) {
        try {
            const lines = csv
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line);
            const portfolio = [];

            let isStockSection = false;
            let marginType = '';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.includes('株式（現物/特定預り）') && !line.includes('合計')) {
                    isStockSection = true;
                    marginType = '現物';
                    continue;
                } else if (line.includes('株式（信用）') && !line.includes('合計')) {
                    isStockSection = true;
                    marginType = '信用';
                    continue;
                } else if (line.includes('合計') || line.includes('総合計')) {
                    isStockSection = false;
                    continue;
                }

                if (!isStockSection) continue;
                if (line.includes('銘柄（コード）')) continue;

                if (line.match(/^"\d{4}/)) {
                    const fields = line.split(',');
                    const stockNameWithCode = fields[0].replace(/"/g, '');
                    const match = stockNameWithCode.match(/^(\d{4})\s+(.+)$/);

                    if (match) {
                        const code = match[1];
                        const name = match[2].replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

                        if (marginType === '現物' && fields.length >= 10) {
                            portfolio.push({
                                currencyType: '円建',
                                depositType: '特定',
                                code,
                                name,
                                quantity: parseInt(fields[2]),
                                buyPrice: parseFloat(fields[3]),
                                currentPrice: parseFloat(fields[4]),
                                dayChange: parseFloat(fields[5].replace(/\+/g, '')),
                                profitAndLoss: parseFloat(fields[7]),
                                profitRate: parseFloat(fields[8]),
                                marketCap: parseFloat(fields[9]),
                                marginType: '現物',
                            });
                        } else if (marginType === '信用' && fields.length >= 13) {
                            portfolio.push({
                                currencyType: '円建',
                                depositType: '特定',
                                code,
                                name,
                                quantity: parseInt(fields[5]),
                                buyPrice: parseFloat(fields[6]),
                                currentPrice: parseFloat(fields[7]),
                                dayChange: parseFloat(fields[8].replace(/\+/g, '')),
                                profitAndLoss: parseFloat(fields[10]),
                                profitRate: parseFloat(fields[11]),
                                marketCap: parseFloat(fields[12]),
                                marginType: '信用',
                            });
                        }
                    }
                }
            }
            return { portfolio };
        } catch (error) {
            console.error('CSV解析エラー:', error);
            throw error;
        }
    }

    /**
     * 取引履歴CSVを解析
     * @param {string} csv 取引履歴CSV文字列
     * @returns {{tradingLog: Array}} 取引履歴データ
     * @example
     * { tradingLog: [{date: '20240101', code: '1234', tradeType: '現物買', quantity: 100, ...}, ...] }
     */
    static parseTradingLogCsv(csv) {
        if (csv.includes('<script')) {
            throw new Error('HTML source contains <script>');
        }
        const lines = csv.split('\n');
        lines.splice(0, 9); // ヘッダー等の削除

        const tradingLog = [];
        lines.forEach((line) => {
            if (line.split(',')[0] === '') return;
            const processedLine = line.replace(/ /g, '').replace(/"/g, '');
            const rowArray = processedLine.split(',');
            tradingLog.push({
                currencyType: '円建',
                date: rowArray[0],
                name: rowArray[1].replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)),
                code: rowArray[2],
                market: rowArray[3],
                tradeType: rowArray[4],
                marginTerm: rowArray[5],
                depositType: rowArray[6],
                taxType: rowArray[7],
                quantity: rowArray[8],
                price: rowArray[9],
                fee: rowArray[10],
                taxAmount: rowArray[11],
                deliveryDate: rowArray[12],
                deliveryAmount: rowArray[13],
            });
        });
        return { tradingLog };
    }

    /**
     * 取引履歴データから同一日の同一銘柄・同一売買で集計
     * @param {Array} tradingLog 取引履歴データ
     * @returns {Array} 集計後の取引履歴データ配列
     * @example
     * [{code: '1234', date: '20240101', tradeType: '買', quantity: 300, price: 1500}, ...]
     */
    static summarizeTradingLog(tradingLog) {
        const totaledTradingLog = [];
        tradingLog.forEach((item) => {
            const tradeTypeLabel = item.tradeType.includes('買') ? '買' : '売';
            const quantity = Number(String(item.quantity).replace(/[,\s]/g, ''));
            const price = Number(String(item.price).replace(/[^\d.-]/g, ''));

            let isDuplicate = false;
            totaledTradingLog.forEach((existing) => {
                if (existing.date === item.date && existing.code === item.code && existing.tradeType === tradeTypeLabel) {
                    const totalQuantity = existing.quantity + quantity;
                    existing.price = (existing.price * existing.quantity + price * quantity) / totalQuantity;
                    existing.quantity = totalQuantity;
                    isDuplicate = true;
                }
            });

            if (!isDuplicate) {
                totaledTradingLog.push({
                    code: item.code,
                    name: item.name,
                    date: item.date,
                    tradeType: tradeTypeLabel,
                    quantity: quantity,
                    price: price,
                });
            }
        });
        totaledTradingLog.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return a.code.localeCompare(b.code);
        });
        return totaledTradingLog;
    }

    /**
     * 当日約定HTMLを解析
     * @param {string} html 当日約定一覧ページのHTML
     * @returns {{todayExecutions: Array}} 当日約定データ
     * @example
     * { todayExecutions: [{date: '2024/01/01', code: '1234', quantity: 100, ...}, ...] }
     */
    static parseTodayExecution(html) {
        if (html.includes('現在、お客様の当日約定はございません。')) return { todayExecutions: [] };

        const tablesMatch = html.match(/<!--△検索タブ-->([\s\S]*?)<!--▼GetHtml枠-->/);
        if (!tablesMatch) return { todayExecutions: [] };

        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
        const tableArr = [];
        let match;
        while ((match = trRegex.exec(tablesMatch[1])) !== null) {
            const trElem = match[0];
            const row = [];
            const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
            let tdMatch;
            while ((tdMatch = tdRegex.exec(trElem)) !== null) {
                row.push(tdMatch[1].replace(/<[^>]*>/g, '').trim());
            }
            if (row.length > 0) tableArr.push(row);
        }

        const todayExecutions = [];
        for (let i = 0; i < tableArr.length; i++) {
            const row = tableArr[i];
            if (row[0] === '' || row[0] === '銘柄') continue;

            if (row.length === 8) {
                row.unshift(tableArr[i - 1][0]);
            }

            const codeMatch = row[0].match(/\d{4}/);
            const code = codeMatch ? codeMatch[0] : '';
            const name = code ? row[0].replace(code, '').trim() : row[0];
            const tradeType = row[1];

            const dateString = row[2] || '';
            let date = '';
            if (dateString) {
                const dates = dateString.split('/');
                if (dates.length >= 3) {
                    const year = dates[0].includes('20') ? dates[0] : `20${dates[0]}`;
                    date = `${year}/${dates[1]}/${dates[2].substring(0, 2)}`;
                }
            }

            const quantity = parseInt((row[3] || '0').replace(/,/g, '')) || 0;
            const price = parseFloat((row[4] || '0').replace(/,/g, '')) || 0;
            const fee = parseFloat((row[5] || '0').replace(/,/g, '')) || 0;

            todayExecutions.push({
                currencyType: '円建',
                date,
                code,
                name,
                tradeType,
                quantity,
                price,
                fee,
            });
        }
        return { todayExecutions };
    }

    /**
     * 当日約定を集計する
     * @param {Array} todayExecutions 当日約定データ
     * @returns {Array} 集計済み当日約定リスト
     * @example
     * [{code: '1234', quantity: 200, ...}, ...]
     */
    static summarizeTodayExecutions(todayExecutions) {
        if (!todayExecutions?.length) return [];
        const aggregated = [];

        todayExecutions.forEach((item) => {
            const tradeTypeLabel = item.tradeType.includes('買') ? '買' : '売';
            const quantity = Number(String(item.quantity).replace(/[,\s]/g, ''));
            const price = Number(String(item.price).replace(/[^\d.-]/g, ''));

            let isDuplicate = false;
            aggregated.forEach((existing) => {
                if (existing.date === item.date && existing.code === item.code && existing.tradeType === tradeTypeLabel) {
                    const totalQuantity = existing.quantity + quantity;
                    existing.price = (existing.price * existing.quantity + price * quantity) / totalQuantity;
                    existing.quantity = totalQuantity;
                    isDuplicate = true;
                }
            });

            if (!isDuplicate) {
                aggregated.push({
                    code: item.code,
                    name: item.name,
                    date: item.date,
                    tradeType: tradeTypeLabel,
                    quantity: quantity,
                    price: price,
                });
            }
        });

        aggregated.sort((a, b) => a.code.localeCompare(b.code));
        return aggregated;
    }

    /**
     * 円建口座データからテーブル用データに変換・集計
     * @param {Object} data 円建口座データ { cashBalance, stocks }
     * @returns {Object} 表示用データ
     * @example
     * {
     *   graphData: [...],
     *   tableTextData: [...],
     *   totalMarketCap: 1000000,
     *   netTotalMarketCap: 1200000,
     *   ...
     * }
     */
    static formatAccountDataForTable(data) {
        const mergedDataMap = new Map();
        data.stocks.forEach((stock) => {
            if (mergedDataMap.has(stock.code)) {
                const existing = mergedDataMap.get(stock.code);
                existing.quantity += stock.quantity;
                existing.marketCap += stock.marketCap;
                existing.profitAndLoss += stock.profitAndLoss;
                existing.buyPrice = (existing.buyPrice * (existing.quantity - stock.quantity) + stock.buyPrice * stock.quantity) / existing.quantity;
            } else {
                mergedDataMap.set(stock.code, { ...stock });
            }
        });

        const graphData = Array.from(mergedDataMap.values()).sort((a, b) => b.marketCap - a.marketCap);

        const marginTotal = data.stocks.filter((stock) => stock.marginType === '信用').reduce((sum, stock) => sum + stock.marketCap, 0);

        let adjustedCash = 0;
        if (data.cashBalance) {
            adjustedCash = Math.max(0, data.cashBalance - marginTotal);
            graphData.push({
                code: '',
                name: '調整後現金',
                quantity: null,
                buyPrice: null,
                currentPrice: null,
                dayChange: null,
                marketCap: adjustedCash,
                profitAndLoss: null,
            });
        }

        const totalMarketCap = graphData.reduce((sum, item) => sum + item.marketCap, 0);
        const netTotalMarketCap = data.cashBalance + data.stocks.reduce((sum, item) => sum + (item.marginType === '現物' ? item.marketCap : item.profitAndLoss), 0);

        const leverageRatios = [1.5, 1.35, 1.2];
        const leverageManagementData = leverageRatios.map((ratio) => {
            const targetTotalAssets = netTotalMarketCap * ratio;
            const diff = targetTotalAssets - totalMarketCap;
            return {
                label: `${Math.round(ratio * 100)}%基準`,
                diff: diff,
                diffText: `¥${Math.floor(diff).toLocaleString()}`,
            };
        });

        const tableTextData = graphData.map((item) => {
            if (item.name === '調整後現金') {
                return {
                    name: item.name,
                    marketCap: item.marketCap,
                    marketCapText: item.marketCap.toLocaleString(),
                };
            }

            let dayChangeRateText = '-';
            let dayChangeDiffText = '-';
            if (item.dayChange || item.dayChange === 0) {
                const dayChangeRate = item.currentPrice && item.dayChange ? (item.dayChange / (item.currentPrice - item.dayChange)) * 100 : 0;
                dayChangeRateText = `${dayChangeRate >= 0 ? '+' : ''}${dayChangeRate.toFixed(2)}`;
                dayChangeDiffText = `${item.dayChange >= 0 ? '+' : ''}${item.dayChange.toLocaleString()}`;
            }

            let profitAndLossRateText = '-';
            let profitAndLossDiffText = '-';
            let profitRate = 0;
            if (item.buyPrice && item.quantity) {
                profitRate = (item.profitAndLoss / (item.buyPrice * item.quantity)) * 100;
                profitAndLossRateText = `${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(2)}`;
                profitAndLossDiffText = `${item.profitAndLoss >= 0 ? '+' : ''}${item.profitAndLoss.toLocaleString()}`;
            }

            return {
                code: item.code,
                name: item.name,
                quantity: item.quantity,
                quantityText: item.quantity.toLocaleString(),
                buyPrice: item.buyPrice,
                buyPriceText: Math.floor(item.buyPrice).toLocaleString(),
                currentPrice: item.currentPrice,
                currentPriceText: item.currentPrice.toLocaleString(),
                dayChangeRate: dayChangeRateText,
                dayChangeDiff: dayChangeDiffText,
                profitAndLossRate: profitAndLossRateText,
                profitAndLossDiff: profitAndLossDiffText,
                marketCap: item.marketCap,
                marketCapText: item.marketCap.toLocaleString(),
                profitAndLoss: item.profitAndLoss,
                profitRate: profitRate, // 数値として追加
                depositType: item.depositType || '特定',
                currencyType: item.currencyType || '円建',
                marginType: item.marginType || '現物',
            };
        });

        const totalProfit = tableTextData.reduce((sum, item) => sum + (item.profitAndLoss || 0), 0);

        return {
            graphData,
            tableTextData,
            totalMarketCap,
            netTotalMarketCap,
            leverageManagementData,
            totalProfit,
            buyingPower: data.buyingPower,
        };
    }
}
