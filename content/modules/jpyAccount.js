/**
 * ==============================================================
 * JpyAccount クラス
 * 日本円建て口座のデータ処理とUI描画を担当
 * ==============================================================
 */
class JpyAccount {
    /**
     * 円建て口座データの抽出する関数（1分ごとに実行）
     * @returns {Promise<{buyingPower: number, cashBalance: number, stocks: Array}>} 円建て口座データ
     */
    static async extractAccountDataPerMinute() {
        // バックグラウンド側で円建て口座HTML、円建てポートフォリオCSVを解析
        const resAccount = await chrome.runtime.sendMessage({ type: 'PARSE_JPY_ACCOUNT_HTML' });
        if (!resAccount.success) throw new Error(resAccount.error);
        const resPortfolio = await chrome.runtime.sendMessage({ type: 'PARSE_JPY_PORTFOLIO_CSV' });
        if (!resPortfolio.success) throw new Error(resPortfolio.error);
        const resTodayExecution = await chrome.runtime.sendMessage({ type: 'PARSE_JPY_TODAY_EXECUTION' });
        if (!resTodayExecution.success) throw new Error(resTodayExecution.error);

        // 株式のデータは HTML, CSV ともに存在するが、 CSV には前日比の追加情報があるため、そちらで上書きする
        return {
            buyingPower: resAccount.data.buyingPower,
            cashBalance: resAccount.data.cashBalance,
            stocks: resPortfolio.data.portfolio,
            todayExecution: resTodayExecution.data.todayExecutions,
        };
    }

    /**
     * 円建て口座データの抽出する関数（初回のみ実行）
     * @returns {Promise<{tradingLog: Array}>} 取引履歴データの配列
     */
    static async extractAccountDataJustOnce() {
        // バックグラウンド側で円建て取引履歴CSVを解析
        const resTradingLog = await chrome.runtime.sendMessage({ type: 'PARSE_JPY_TRADING_LOG_CSV' });
        if (!resTradingLog.success) throw new Error(resTradingLog.error);
        return { tradingLog: resTradingLog.data.tradingLog };
    }

    /**
     * 円建て口座データからテーブル用データに変換する関数
     * 現物株式と信用建玉を同一銘柄でまとめ、調整後現金を追加している
     * @param {Object} data 円建て口座データ
     * @returns {Array} テーブル用データの配列
     */
    static convertToTable(data) {
        // 同一銘柄をまとめる
        const mergedDataMap = new Map();
        data.stocks.forEach((stock) => {
            if (mergedDataMap.has(stock.code)) {
                const existing = mergedDataMap.get(stock.code);
                existing.quantity += stock.quantity;
                existing.marketCap += stock.marketCap;
                existing.profitAndLoss += stock.profitAndLoss;
                // 加重平均で取得価格を再計算
                existing.buyPrice = (existing.buyPrice * (existing.quantity - stock.quantity) + stock.buyPrice * stock.quantity) / existing.quantity;
            } else {
                mergedDataMap.set(stock.code, { ...stock });
            }
        });

        // データ配列に変換し、評価額の大きい順にソート
        const graphData = Array.from(mergedDataMap.values()).sort((a, b) => b.marketCap - a.marketCap);

        // 現金と信用建玉を相殺して調整後現金を計算
        const marginTotal = data.stocks.filter((stock) => stock.marginType === '信用').reduce((sum, stock) => sum + stock.marketCap, 0);

        if (data.cashBalance) {
            const adjustedCash = Math.max(0, data.cashBalance - marginTotal);
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

        return graphData;
    }

    /**
     * Chart.jsで円グラフを描画する関数
     * @param {Array} graphData 円グラフ用データ
     * @param {Chart} chartInstance Chart.jsの既存インスタンス（更新時のみ）
     * @return {Chart} Chart.jsのインスタンス
     */
    static drawCircleChart(graphData, chartInstance = null) {
        // データとラベルを準備
        const labels = graphData.map((item) => item.name);
        const data = graphData.map((item) => item.marketCap);

        // 既存のチャートがある場合はデータ更新のみ
        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = data;
            chartInstance.update();
            return chartInstance;
        }

        // 青系統のカラーパレット生成
        const totalColors = 10;
        const colors = [];
        for (let i = 0; i < totalColors; i++) {
            const lightness = 20 + (135 / (totalColors - 1)) * i;
            colors.push(`hsl(230, 45%, ${lightness}%)`);
        }

        // Chart.jsでグラフを作成
        const canvas = document.querySelector('#jpyAccountPieChartCanvas');
        const ctx = canvas.getContext('2d');

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '時価総額',
                        data: data,
                        backgroundColor: colors,
                        borderColor: '#ffffff',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                },
            },
            // カスタムラベルプラグイン（グラフ部分にパーセンテージと金額を表示）
            plugins: [
                {
                    id: 'customLabels',
                    afterDatasetsDraw: (chart) => {
                        const ctx = chart.ctx;
                        chart.data.datasets.forEach((dataset, datasetIndex) => {
                            const meta = chart.getDatasetMeta(datasetIndex);
                            if (meta.hidden) return;

                            meta.data.forEach((element, i) => {
                                const value = dataset.data[i];
                                const total = dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);

                                // 5%未満のスライスはラベルを表示しない
                                if (percentage < 5) return;

                                // ラベル描画設定
                                const position = element.tooltipPosition();
                                ctx.fillStyle = '#ffffff';
                                ctx.font = "12px 'Helvetica'";
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';

                                // 2行でラベルを描画
                                const lineHeight = 16;
                                const label = chart.data.labels[i].split(' ')[0];
                                ctx.fillText(`${label} ${percentage}%`, position.x, position.y);
                                ctx.fillText(`¥${value.toLocaleString()}`, position.x, position.y + lineHeight);
                            });
                        });
                    },
                },
            ],
        });
    }

    /**
     * ポートフォリオテーブルを作成する関数
     * @param {Object} data 円建て口座データ
     * @param {Array} tableData テーブル用データ
     */
    static drawPortfolioTable(data, tableData) {
        // 合計評価額を計算
        const totalMarketCap = tableData.reduce((sum, item) => sum + item.marketCap, 0);

        // 純資産を計算（現物は時価評価、信用は損益を加算）
        const netTotalMarketCap = data.cashBalance + data.stocks.reduce((sum, item) => sum + (item.marginType === '現物' ? item.marketCap : item.profitAndLoss), 0);

        // テーブル行データを生成
        const tableTextData = tableData.map((item) => {
            // 調整後現金の場合
            if (item.name === '調整後現金') {
                return { name: item.name, marketCap: item.marketCap };
            }

            // 前日比を計算
            let dayChangeRateText = '-';
            let dayChangeDiffText = '-';
            if (item.dayChange || item.dayChange === 0) {
                // 5時前後に前日比がリセットされるため
                const dayChangeRate = item.currentPrice && item.dayChange ? (item.dayChange / (item.currentPrice - item.dayChange)) * 100 : null;
                dayChangeRateText = `${dayChangeRate >= 0 ? '+' : ''}${dayChangeRate.toFixed(2)}`;
                dayChangeDiffText = `${item.dayChange >= 0 ? '+' : ''}${item.dayChange.toLocaleString()}`;
            }

            // 損益率を計算
            const profitRate = (item.profitAndLoss / (item.buyPrice * item.quantity)) * 100;
            const profitAndLossRateText = `${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(2)}`;
            const profitAndLossDiffText = `${item.profitAndLoss >= 0 ? '+' : ''}${item.profitAndLoss.toLocaleString()}`;

            return {
                code: item.code,
                name: item.name,
                quantity: item.quantity.toLocaleString(),
                buyPrice: Math.floor(item.buyPrice).toLocaleString(),
                currentPrice: item.currentPrice.toLocaleString(),
                dayChangeRate: dayChangeRateText,
                dayChangeDiff: dayChangeDiffText,
                profitAndLossRate: profitAndLossRateText,
                profitAndLossDiff: profitAndLossDiffText,
                marketCap: item.marketCap.toLocaleString(),
            };
        });

        // 合計損益を計算
        const totalProfit = tableData.reduce((sum, item) => sum + (item.profitAndLoss || 0), 0);
        const totalProfitText = `¥${totalProfit.toLocaleString()}`;
        const totalProfitClass = totalProfit > 0 ? 'positive' : totalProfit < 0 ? 'negative' : '';

        // データバインディング
        TemplateEngine.bindTableRows('jpyAccountTableRow', tableTextData);
        TemplateEngine.bindData({
            netTotalMarketCap: `¥${netTotalMarketCap.toLocaleString()}`,
            leverage: `${((totalMarketCap / netTotalMarketCap) * 100).toFixed(2)}%`,
            buyingPower: `¥${data.buyingPower.toLocaleString()}`,
            totalProfit: totalProfitText,
            totalMarketCap: `¥${totalMarketCap.toLocaleString()}`,
        });
        TemplateEngine.bindClass({
            totalProfit: `profit ${totalProfitClass}`,
        });
    }

    /**
     * 取引履歴データから同一日の同一銘柄・同一売買で集計した整形後の配列を返す関数
     * @param {Array} tradingLog 取引履歴データ
     * @returns {Array} 集計後の取引履歴データ配列
     */
    static totalTradingLog(tradingLog) {
        // 同一銘柄・同一売買・同一日付で集計し、新たな配列を作成
        const totaledTradingLog = [];
        tradingLog.forEach((item, _) => {
            const tradeTypeLabel = item.tradeType.includes('買') ? '買' : '売';
            const quantity = Number(String(item.quantity).replace(/[,\s]/g, ''));
            const price = Number(String(item.price).replace(/[^\d.-]/g, ''));

            // 重複チェックしつつ、重複している場合は集計
            let isDuplicate = false;
            totaledTradingLog.forEach((existing) => {
                if (existing.date === item.date && existing.code === item.code && existing.tradeType === tradeTypeLabel) {
                    const totalQuantity = existing.quantity + quantity;
                    existing.price = (existing.price * existing.quantity + price * quantity) / totalQuantity;
                    existing.quantity = totalQuantity;
                    isDuplicate = true;
                }
            });

            // 重複していなければ新規追加
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

        // コード順、日付順でソート（優先は日付）
        totaledTradingLog.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return a.code.localeCompare(b.code);
        });
        return totaledTradingLog;
    }

    /**
     * 取引履歴テーブルを作成する関数
     * @param {Array} totaledTradingLog 取引履歴データ
     */
    static drawTradingLogTable(totaledTradingLog = []) {
        // 取引履歴データの quantity と price をカンマ区切りの文字列に変換
        const formattedTradingLog = totaledTradingLog.map((item) => ({
            ...item,
            quantity: item.quantity.toLocaleString(),
            price: Math.floor(item.price).toLocaleString(),
        }));

        // 取引履歴のベースデータをキャッシュ
        JpyAccount._tradingLogCache = formattedTradingLog;

        // テーブル行をデータバインディング
        TemplateEngine.bindTableRows('jpyAccountTradingLogRow', formattedTradingLog);
    }

    /**
     * 当日約定をテーブルの先頭に追記する関数
     * @param {Array} todayExecutions 当日約定データ
     */
    static drawTodayExecutionToTradingLogTable(todayExecutions = []) {
        if (!todayExecutions?.length) return;

        // 同一銘柄・同一売買・同一日付で集計し、新たな配列を作成
        const aggregatedTodayExecutions = [];
        todayExecutions.forEach((item, _) => {
            const tradeTypeLabel = item.tradeType.includes('買') ? '買' : '売';
            const quantity = Number(String(item.quantity).replace(/[,\s]/g, ''));
            const price = Number(String(item.price).replace(/[^\d.-]/g, ''));

            // 重複チェックしつつ、重複している場合は集計
            let isDuplicate = false;
            aggregatedTodayExecutions.forEach((existing) => {
                if (existing.date === item.date && existing.code === item.code && existing.tradeType === tradeTypeLabel) {
                    const totalQuantity = existing.quantity + quantity;
                    existing.price = ((existing.price * existing.quantity + price * quantity) / totalQuantity).toFixed(0);
                    existing.quantity = totalQuantity;
                    isDuplicate = true;
                }
            });

            // 重複していなければ新規追加
            if (!isDuplicate) {
                aggregatedTodayExecutions.push({
                    code: item.code,
                    name: item.name,
                    date: item.date,
                    tradeType: tradeTypeLabel,
                    quantity: quantity,
                    price: price,
                });
            }
        });

        // コード順ソート
        aggregatedTodayExecutions.sort((a, b) => {
            return a.code.localeCompare(b.code);
        });

        // テーブル行をデータバインディング
        TemplateEngine.bindTableRows('jpyAccountTradingLogRow', [...aggregatedTodayExecutions, ...JpyAccount._tradingLogCache]);
    }

    /**
     * 株式価格の現在比と株式増減数をテーブルに描画する関数
     * @param {Object} currentPrices 現在価格データ
     * @param {Array<Object>} totaledTradingLog 整形後取引履歴データ
     */
    static drawPriceChangeTable(currentPrices, totaledTradingLog) {
        // 現在価格データ (例: [{ code: '1234', price: 1500 }, ...])
        // 整形後取引履歴データ (例: [{"code": "5253","name": "カバー","date": "2025/11/21","tradeType": "売","quantity": 2200,"price": 1635},...])

        // 出力データ構造例
        // [
        //   {
        //     date: '2024/06/01',
        //     tradeData: [
        //       { name: 'トレンドマイクロ', totalQuantity: 100, priceRatio: 2.3 },
        //       { name: 'カバー', totalQuantity: -1300, priceRatio: -0.5 },
        //       ...
        //     ]
        //   },
        //   ...
        // ]

        // 取引履歴を日付ごとまとめたマップを作成
        const dateBasedTradingLog = new Map();
        totaledTradingLog.forEach((trade) => {
            if (!dateBasedTradingLog.has(trade.date)) {
                dateBasedTradingLog.set(trade.date, []);
            }
            dateBasedTradingLog.get(trade.date).push(trade);
        });

        // 日付ごとにデータを処理
        const dateWiseData = Array.from(dateBasedTradingLog.entries()).map(([date, dailyTrades]) => {
            // 銘柄ごとの増減数と価格比率を Map で集計
            const tradeMap = new Map();

            dailyTrades.forEach((trade) => {
                const currentPriceData = currentPrices.find((cp) => cp.code === trade.code);
                const currentPrice = currentPriceData.price;
                const totalQuantity = trade.tradeType === '買' ? trade.quantity : -trade.quantity;
                const priceDiff = currentPrice - trade.price;
                const priceRatio = (priceDiff / currentPrice) * 100;

                if (tradeMap.has(trade.name)) {
                    const existing = tradeMap.get(trade.name);
                    // 同一銘柄で売り買いが完全に相殺される場合
                    if (existing.totalQuantity + totalQuantity === 0) {
                        existing.totalQuantity = 0;
                        existing.priceRatio = 0;
                    } else {
                        // 加重平均した価格比率を計算
                        const oldWeight = (1 - existing.priceRatio / 100) * existing.totalQuantity;
                        const newWeight = (1 - priceRatio / 100) * totalQuantity;
                        existing.priceRatio = (-(oldWeight + newWeight) / (existing.totalQuantity + totalQuantity)) * 100 + 100;
                        existing.totalQuantity += totalQuantity;
                    }
                } else {
                    tradeMap.set(trade.name, { name: trade.name, totalQuantity, priceRatio });
                }
            });

            return {
                date: date,
                tradeData: Array.from(tradeMap.values()),
            };
        });

        console.log(dateWiseData);
    }
}
