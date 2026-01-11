// =======================================
// 円グラフコンポーネント
// =======================================

import { html, useEffect, useRef } from '../utils/preact-adapter.js';

export function PieChartComp({ data }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !data) return;

        const ctx = canvasRef.current.getContext('2d');
        const labels = data.map((item) => item.name);
        const chartData = data.map((item) => item.marketCap);

        // 青系統のカラーパレット生成
        const totalColors = 10;
        const colors = [];
        for (let i = 0; i < totalColors; i++) {
            const lightness = 20 + (135 / (totalColors - 1)) * i;
            colors.push(`hsl(230, 45%, ${lightness}%)`);
        }

        if (chartInstanceRef.current) {
            chartInstanceRef.current.data.labels = labels;
            chartInstanceRef.current.data.datasets[0].data = chartData;
            chartInstanceRef.current.data.datasets[0].backgroundColor = colors;
            chartInstanceRef.current.update();
        } else {
            chartInstanceRef.current = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '時価総額',
                            data: chartData,
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

        return () => {
            // クリーンアップは意図的に行わない（コンポーネントがアンマウントされない限り）
            // 再描画時に destroy してもいいが、インスタンスを使い回す実装にしている
        };
    }, [data]);

    return html`
        <div id="jpyAccountPieChartContainer" class="p-5 w-1/3 max-w-sm aspect-square max-sm:p-4">
            <canvas ref=${canvasRef} id="jpyAccountPieChartCanvas"></canvas>
        </div>
    `;
}
