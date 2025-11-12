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
        if (!data?.stocks?.length) {
            console.warn('株式データがありません');
            return [];
        }

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
    static drawChart(graphData, chartInstance = null) {
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
        if (!tableData?.length) {
            console.warn('テーブル用データがありません');
            return;
        }

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
        if (!tradingLog?.length) {
            console.warn('取引履歴データがありません');
            return;
        }

        // 取引履歴データを変換（最新順）
        const tradingLogData = tradingLog
            .map((item) => ({
                date: item.date,
                code: item.code,
                name: item.name,
                tradeType: item.tradeType.includes('買') ? '買' : '売',
                quantity: Number(item.quantity).toLocaleString(),
                price: `¥${Number(item.price).toLocaleString()}`,
            }))
            .reverse();

        // 取引履歴のベースデータをキャッシュ
        JpyAccount._baseTradingLogData = tradingLogData;

        // 当日約定のキャッシュがあれば先頭に表示
        const cachedTodayExecutions = JpyAccount._todayExecutionDisplayRows || [];

        // テーブル行をデータバインディング
        TemplateEngine.bindTableRows('jpyAccountTradingLogRow', [...cachedTodayExecutions, ...tradingLogData]);
    }

    /**
     * 当日約定をテーブルの先頭に追加する関数
     * @param {Array} todayExecutions 当日約定データ
     */
    static addTodayExecutionToTradingLogTable(todayExecutions = []) {
        if (!todayExecutions?.length) return;

        // 取引履歴のベースデータが未設定の場合は何もしない
        if (!Array.isArray(JpyAccount._baseTradingLogData)) {
            console.warn('取引履歴ベースデータが未設定のため、当日約定を追加できません');
            return;
        }

        // 初回または日付が変わった場合はキャッシュをリセット
        const firstDate = todayExecutions[0]?.date;
        if (firstDate) {
            if (JpyAccount._todayExecutionDate !== firstDate) {
                JpyAccount._todayExecutionDate = firstDate;
                JpyAccount._processedTodayExecutionKeys = new Set();
                JpyAccount._todayExecutionCache = new Map();
                JpyAccount._todayExecutionDisplayRows = [];
            }
        }

        JpyAccount._processedTodayExecutionKeys = JpyAccount._processedTodayExecutionKeys || new Set();
        JpyAccount._todayExecutionCache = JpyAccount._todayExecutionCache || new Map();

        let hasNewEntry = false;

        todayExecutions.forEach((item) => {
            const rawKey = `${item.date}|${item.code}|${item.tradeType}|${item.quantity}|${item.price}|${item.fee}`;
            if (JpyAccount._processedTodayExecutionKeys.has(rawKey)) return;

            JpyAccount._processedTodayExecutionKeys.add(rawKey);
            hasNewEntry = true;

            const mapKey = `${item.date}|${item.code}`;
            const absQuantity = Math.abs(Number(item.quantity) || 0);
            if (!absQuantity) return;

            const existing = JpyAccount._todayExecutionCache.get(mapKey) || {
                code: item.code,
                name: item.name,
                date: item.date,
                weightedPriceSum: 0,
                totalAbsQuantity: 0,
                netQuantity: 0,
            };

            const sign = item.tradeType.includes('買') ? 1 : -1;
            existing.weightedPriceSum += Number(item.price) * absQuantity;
            existing.totalAbsQuantity += absQuantity;
            existing.netQuantity += sign * absQuantity;
            existing.date = item.date;
            existing.name = item.name;

            JpyAccount._todayExecutionCache.set(mapKey, existing);

            // キャッシュが肥大化しないように上限を設定（最古の要素を削除）
            if (JpyAccount._todayExecutionCache.size > 100) {
                const oldestKey = JpyAccount._todayExecutionCache.keys().next().value;
                if (oldestKey) {
                    JpyAccount._todayExecutionCache.delete(oldestKey);
                }
            }
        });

        if (!hasNewEntry) return;

        // 表示用データを生成
        const todayExecutionRows = Array.from(JpyAccount._todayExecutionCache.values())
            .map((entry) => {
                const avgPrice = entry.totalAbsQuantity ? entry.weightedPriceSum / entry.totalAbsQuantity : 0;
                const tradeTypeLabel = entry.netQuantity > 0 ? '買' : entry.netQuantity < 0 ? '売' : '売買';
                const quantityText = Math.abs(entry.netQuantity).toLocaleString();
                const priceText = `¥${avgPrice.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

                return {
                    date: entry.date,
                    code: entry.code,
                    name: entry.name,
                    tradeType: tradeTypeLabel,
                    quantity: quantityText,
                    price: priceText,
                };
            })
            .sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                return a.code.localeCompare(b.code);
            });

        JpyAccount._todayExecutionDisplayRows = todayExecutionRows;

        // 表示用データを結合（当日約定 + 取引履歴）
        const tableTextData = [...todayExecutionRows, ...JpyAccount._baseTradingLogData];

        // テーブル行をデータバインディング
        TemplateEngine.bindTableRows('jpyAccountTradingLogRow', tableTextData);
    }

    /**
     * 過去10日間の株価変化率と売買数の変化をまとめたテーブルを作成する関数
     * @param {Object} closePriceData 終値データ（ExternalResource.fetchClosePriceDataで取得したデータ）
     * @param {Array<Object>} jpyAccountTableData 現在の保有銘柄のテーブルデータ
     * @param {Array<Object>} tradingLog 取引履歴データ
     */
    static drawPriceChangeTable(closePriceData, jpyAccountTableData, tradingLog) {
        if (!closePriceData || !Array.isArray(closePriceData) || closePriceData.length < 2) {
            console.warn('終値データが不足しています');
            return;
        }

        // 見出し行に表示する日付ラベルをバインド
        const headerBaseLabels = ['前日', '2日前', '3日前', '4日前', '5日前', '6日前', '7日前', '8日前', '9日前', '10日前'];
        const headerBinding = {};
        headerBaseLabels.forEach((label, index) => {
            const dataIndex = index + 1; // 最新データを除いた過去データ
            const entry = closePriceData[dataIndex];
            if (entry?.date) {
                const formattedDate = JpyAccount.formatDateToMMDD(entry.date);
                headerBinding[`priceChangeDayLabel${dataIndex}`] = `${label} (${formattedDate})`;
            } else {
                headerBinding[`priceChangeDayLabel${dataIndex}`] = label;
            }
        });
        TemplateEngine.bindData(headerBinding);

        // 銘柄ごとのデータを計算、調整後現金は削除
        const tableData = jpyAccountTableData
            .map((stock) => {
                // 各日の変化率と売買数を計算
                const dailyData = [];
                for (let i = 0; i < Math.min(closePriceData.length, 11); i++) {
                    const key = stock.code + '0'; // 東証API側の仕様で末尾に0を付与
                    const pastPrice = closePriceData[i].closePrice[key];
                    const pastDate = closePriceData[i].date;

                    // 株価変化率を計算
                    let changeRate = ((stock.currentPrice - pastPrice) / pastPrice) * 100;

                    // その日の取引を抽出
                    const trades = tradingLog.filter((trade) => {
                        return trade.code === stock.code && trade.date.includes(pastDate);
                    });

                    // 売買数を集計（買いはプラス、売りはマイナス）
                    let totalQuantity = 0;
                    trades.forEach((trade) => {
                        const quantity = parseInt(trade.quantity, 10) || 0;
                        if (trade.tradeType.includes('買')) {
                            totalQuantity += quantity;
                        } else if (trade.tradeType.includes('売')) {
                            totalQuantity -= quantity;
                        }
                    });

                    dailyData.push({
                        daysAgo: i,
                        changeRate: changeRate,
                        tradeQuantity: totalQuantity,
                    });
                }

                return {
                    code: stock.code,
                    name: stock.name,
                    dailyData: dailyData,
                };
            })
            .filter((item) => item.name !== '調整後現金'); // 調整後現金を除外

        // テーブル行データを生成
        const tableTextData = tableData.map((item) => {
            const rowData = {
                code: item.code,
                name: item.name,
            };

            // 前日〜10日前のデータを追加
            for (let i = 0; i < 10; i++) {
                const data = item.dailyData[i] || { changeRate: 0, tradeQuantity: 0 };
                rowData[`changeRate${i + 1}`] = `${data.changeRate >= 0 ? '+' : ''}${data.changeRate.toFixed(2)}%`;
                rowData[`tradeQuantity${i + 1}`] = data.tradeQuantity.toLocaleString();
            }

            return rowData;
        });

        // テーブル行をデータバインディング
        TemplateEngine.bindTableRows('priceChangeTableRow', tableTextData);
    }

    /**
     * 日付文字列をMM/DD形式に整形する関数
     * @param {string} dateStr 変換対象の日付文字列
     * @returns {string} MM/DD形式の日付
     */
    static formatDateToMMDD(dateStr) {
        if (!dateStr) return '';

        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
        }

        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
        }

        return dateStr;
    }
}
