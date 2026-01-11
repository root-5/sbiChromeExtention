/**
 * テンプレートエンジンを使用しない動的ビュー生成を担当するモジュール
 * (Chart.jsによるグラフ描画や、インタラクティブな計算ツールなど)
 */
export class DynamicView {
    /**
     * Chart.jsで円グラフを描画・更新する
     * @param {Array} graphData 円グラフ用データ
     * @param {Object} chartInstance Chart.jsの既存インスタンス（更新時のみ）
     * @return {Object} Chart.jsのインスタンス
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
        if (!canvas) return null;

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
            // カスタムラベルプラグイン
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

                                if (percentage < 5) return;

                                const position = element.tooltipPosition();
                                ctx.fillStyle = '#ffffff';
                                ctx.font = "12px 'Helvetica'";
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';

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
     * レバレッジ簡易計算パネルを初期化する
     */
    static initializeLeverageCalculator() {
        const LEVERAGE_STORAGE_KEY = 'sbiExtLeverageCalculator';
        const leverageConfig = {
            maxDrawdown: { dd30: 0.55, dd50: 0.9, dd66: 1.2 },
            shockCare: { care: 1, ignore: 55 / 33 },
            stockType: { index: 1, largeMultiple: 0.8, largeSingle: 0.66, smallMultiple: 0.5, smallSingle: 0.33 },
            drawdown: { recentHigh: 1, drop30: 1.5, drop60: 2.0 },
        };

        const calculator = document.getElementById('leverageCalculator');
        if (!calculator) return;

        const selects = {
            maxDrawdown: calculator.querySelector('[data-leverage-select="maxDrawdown"]'),
            shockCare: calculator.querySelector('[data-leverage-select="shockCare"]'),
            stockType: calculator.querySelector('[data-leverage-select="stockType"]'),
            drawdown: calculator.querySelector('[data-leverage-select="drawdown"]'),
        };
        const resultValue = calculator.querySelector('[data-leverage-result]');
        const resultDetail = calculator.querySelector('[data-leverage-detail]');

        const defaultState = {
            maxDrawdown: 'dd30',
            shockCare: 'care',
            stockType: 'index',
            drawdown: 'recentHigh',
        };

        const saved = localStorage.getItem(LEVERAGE_STORAGE_KEY);
        let state = { ...defaultState };
        if (saved) {
            try {
                state = { ...state, ...JSON.parse(saved) };
            } catch (e) {
                /* ignore */
            }
        }

        const updateResult = () => {
            const base = leverageConfig.maxDrawdown[state.maxDrawdown] ?? leverageConfig.maxDrawdown[defaultState.maxDrawdown];
            const shock = leverageConfig.shockCare[state.shockCare] ?? leverageConfig.shockCare[defaultState.shockCare];
            const stock = leverageConfig.stockType[state.stockType] ?? leverageConfig.stockType[defaultState.stockType];
            const drawdown = leverageConfig.drawdown[state.drawdown] ?? leverageConfig.drawdown[defaultState.drawdown];

            const result = base * shock * stock * drawdown;
            const rounded = Math.round(result * 100) / 100;

            if (resultValue) resultValue.textContent = rounded.toFixed(2);
            if (resultDetail) {
                resultDetail.textContent = `ベース ${base.toFixed(2)} × ${shock.toFixed(2)} × ${stock.toFixed(2)} × ${drawdown.toFixed(2)} = ${rounded.toFixed(2)}倍`;
            }
            localStorage.setItem(LEVERAGE_STORAGE_KEY, JSON.stringify(state));
        };

        Object.entries(selects).forEach(([key, element]) => {
            if (!element) return;
            element.value = state[key];
            element.addEventListener('change', (event) => {
                state[key] = event.target.value;
                updateResult();
            });
        });

        // 初回計算
        updateResult();
    }
}
