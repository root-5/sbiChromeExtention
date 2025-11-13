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
     * 取引履歴テーブルを作成する関数
     * @param {Array} tradingLog 取引履歴データ
     */
    static drawTradingLogTable(tradingLog) {
        // 同一銘柄・同一売買・同一日付で集計し、新たな配列を作成
        const aggregatedTradingLog = [];
        tradingLog.forEach((item, _) => {
            const tradeTypeLabel = item.tradeType.includes('買') ? '買' : '売';
            const quantity = Number(String(item.quantity).replace(/[,\s]/g, ''));
            const price = Number(String(item.price).replace(/[^\d.-]/g, ''));

            // 重複チェックしつつ、重複している場合は集計
            let isDuplicate = false;
            aggregatedTradingLog.forEach((existing) => {
                if (existing.date === item.date && existing.code === item.code && existing.tradeType === tradeTypeLabel) {
                    const totalQuantity = existing.quantity + quantity;
                    existing.price = ((existing.price * existing.quantity + price * quantity) / totalQuantity).toFixed(0);
                    existing.quantity = totalQuantity;
                    isDuplicate = true;
                }
            });

            // 重複していなければ新規追加
            if (!isDuplicate) {
                aggregatedTradingLog.push({
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
        aggregatedTradingLog.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return a.code.localeCompare(b.code);
        });

        // 取引履歴のベースデータをキャッシュ
        JpyAccount._tradingLogCache = aggregatedTradingLog;

        // テーブル行をデータバインディング
        TemplateEngine.bindTableRows('jpyAccountTradingLogRow', aggregatedTradingLog);
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
     * 過去10日間の株価変化率と増減株数の変化をまとめたテーブルを作成する関数
     * @param {Object} closePriceData 終値データ（ExternalResource.fetchClosePriceDataで取得したデータ）
     * @param {Array<Object>} jpyAccountTableData 現在の保有銘柄のテーブルデータ
     * @param {Array<Object>} tradingLog 取引履歴データ
     */
    static drawPriceChangeTable(closePriceData, jpyAccountTableData, tradingLog) {
        if (!closePriceData || !Array.isArray(closePriceData) || closePriceData.length < 2) {
            console.warn('終値データが不足しています');
        }
        const MAX_DAYS = 10;

        // 銘柄ごとのデータを計算、調整後現金は削除
        const tableData = jpyAccountTableData
            .filter((item) => item.name !== '調整後現金') // 調整後現金を除外
            .map((data) => {
                const newTableRowData = {};
                newTableRowData.code = data.code;
                newTableRowData.name = data.name;

                // 株価変化率と増減株数の変化をまとめた配列を作成
                for (let i = 0; i < MAX_DAYS; i++) {
                    const key = data.code + '0'; // 東証API側の仕様で末尾に0を付与
                    const pastPrice = closePriceData[i].closePrice[key];
                    const pastDate = closePriceData[i].date;

                    // 株価変化率を計算
                    let changeRate = ((data.currentPrice - pastPrice) / pastPrice) * 100;

                    // 当該日の取引を抽出、増減株数を集計（買いはプラス、売りはマイナス）
                    const trades = tradingLog.filter((trade) => {
                        return trade.code === data.code && trade.date.includes(pastDate);
                    });
                    let totalQuantity = 0;
                    trades.forEach((trade) => {
                        const quantity = parseInt(trade.quantity, 10) || 0;
                        if (trade.tradeType.includes('買')) {
                            totalQuantity += quantity;
                        } else if (trade.tradeType.includes('売')) {
                            totalQuantity -= quantity;
                        }
                    });

                    newTableRowData[`changeRate${i + 1}`] = `${changeRate >= 0 ? '+' : ''}${changeRate.toFixed(2)}%`;
                    newTableRowData[`tradeQuantity${i + 1}`] = totalQuantity.toLocaleString();
                }

                return newTableRowData;
            });

        // テーブル行をデータバインディング
        TemplateEngine.bindTableRows('priceChangeTableRow', tableData);
    }
}
