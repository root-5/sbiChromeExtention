/**
 * ==============================================================
 * JpyAccount クラス
 * 日本円建て口座のUI描画を担当
 * ==============================================================
 */
class JpyAccount {
    static _tradingLogCache = [];

    /**
     * 初回データを取得する（取引履歴）
     */
    static async fetchInitialData() {
        const response = await chrome.runtime.sendMessage({ type: 'GET_INITIAL_DATA' });
        if (!response.success) throw new Error(response.error);
        return response.data;
    }

    /**
     * 更新データを取得する（口座、ポートフォリオ、株価など）
     */
    static async fetchRefreshData() {
        const response = await chrome.runtime.sendMessage({ type: 'GET_REFRESH_DATA' });
        if (!response.success) throw new Error(response.error);
        return response.data;
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
        if (!canvas) return null; // 他のページなどでcanvasがない場合

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
     * ポートフォリオテーブルを描画する関数
     * @param {Object} accountViewData SWから受け取ったView用データ
     */
    static drawPortfolioTable(accountViewData) {
        const { netTotalMarketCap, totalMarketCap, leverageManagementData, tableTextData, totalProfit, buyingPower } = accountViewData;

        // レバレッジ管理データ（diffText を diff としてバインド）
        const leverageRows = leverageManagementData.map((d) => ({
            ...d,
            diff: d.diffText,
        }));
        TemplateEngine.bindTableRows('leverageManagementRow', leverageRows);

        // テーブル行データを生成（xxxText を xxx としてバインド）
        const tableRows = tableTextData.map((item) => {
            return {
                ...item,
                quantity: item.quantityText,
                buyPrice: item.buyPriceText,
                currentPrice: item.currentPriceText,
                marketCap: item.marketCapText,
            };
        });

        // 合計損益の表示クラス
        const totalProfitClass = totalProfit > 0 ? 'positive' : totalProfit < 0 ? 'negative' : '';

        // データバインディング
        TemplateEngine.bindTableRows('jpyAccountTableRow', tableRows);
        TemplateEngine.bindData({
            netTotalMarketCap: `¥${netTotalMarketCap.toLocaleString()}`,
            leverage: `${((totalMarketCap / netTotalMarketCap) * 100).toFixed(2)}%`,
            buyingPower: `¥${buyingPower.toLocaleString()}`,
            totalProfit: `¥${totalProfit.toLocaleString()}`,
            totalMarketCap: `¥${totalMarketCap.toLocaleString()}`,
        });
        TemplateEngine.bindClass({
            totalProfit: `profit ${totalProfitClass}`,
        });
    }

    /**
     * 取引履歴テーブルを作成する関数
     * @param {Array} formattedTradingLog 取引履歴データ（文字列整形済み）
     */
    static drawTradingLogTable(formattedTradingLog = []) {
        // キャッシュ更新
        JpyAccount._tradingLogCache = formattedTradingLog;

        // テーブル行をデータバインディング
        TemplateEngine.bindTableRows('jpyAccountTradingLogRow', formattedTradingLog);
    }

    /**
     * 当日約定をテーブルの先頭に追記する関数
     * @param {Array} formattedTodayExecutions 当日約定データ（文字列整形済み）
     */
    static drawTodayExecutionToTradingLogTable(formattedTodayExecutions = []) {
        if (!formattedTodayExecutions?.length) return;

        // 既存キャッシュの先頭に追加して描画
        TemplateEngine.bindTableRows('jpyAccountTradingLogRow', [...formattedTodayExecutions, ...JpyAccount._tradingLogCache]);
    }

    /**
     * 株式価格の現在比と株式増減数をテーブルに描画する関数
     * @param {Array} priceChangePivot ピボットテーブル用データ
     */
    static drawPriceChangeTable(priceChangePivot) {
        TemplateEngine.bindPivotTable(priceChangePivot);
    }
}
