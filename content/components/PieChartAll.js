// =======================================
// 全通貨合算円グラフコンポーネント
// =======================================

import { html, useEffect, useRef } from '../utils/preact-adapter.js';

export function PieChartAllComp({ data }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!data || data.length === 0) return;

        const ctx = canvasRef.current.getContext('2d');
        const labels = data.map((item) => item.name);
        const chartData = data.map((item) => item.marketCap);

        // 青系統のカラーパレット生成（少し色味を変えて緑系も混ぜるなど区別してもよいが、一旦既存踏襲）
        const totalColors = Math.max(data.length, 10);
        const colors = [];
        for (let i = 0; i < totalColors; i++) {
            // 全通貨版は少し紫寄りにしてみる
            const lightness = 30 + (130 / (totalColors - 1)) * i;
            colors.push(`hsl(260, 50%, ${lightness}%)`);
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
                            label: '評価額(円)',
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
            });
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [data]);

    return html`
        <div class="w-[450px] h-[300px] shrink-0 relative flex justify-center items-center">
            <canvas ref=${canvasRef}></canvas>
            <div class="absolute pointer-events-none flex flex-col items-center justify-center text-gray-500">
                <span class="text-xs">Total Assets (All)</span>
            </div>
        </div>
    `;
}
