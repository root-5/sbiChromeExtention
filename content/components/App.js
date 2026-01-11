// =======================================
// メインコンポーネント
// =======================================

import { html, useState, useEffect, useMemo } from '../utils/preact-adapter.js';
import { BackendClient } from '../modules/backendClient.js';
import { UIDataAdapter } from '../modules/uiDataAdapter.js';
import { PieChartComp } from './PieChart.js';
import { PortfolioComp } from './Portfolio.js';
import { LeverageCalculatorComp } from './LeverageCalculator.js';
import { TradingLogComp } from './TradingLog.js';
import { PriceChangeComp } from './PriceChange.js';

export function App() {
    const [currentTime, setCurrentTime] = useState('');
    const [lastUpdateTime, setLastUpdateTime] = useState('--:--:--');
    const [tradingLog, setTradingLog] = useState([]);
    const [accountData, setAccountData] = useState(null); // { accountViewData, todayExecutions, priceChangePivot }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 初期データ取得
        const fetchInit = async () => {
            const initData = await BackendClient.fetchInitialData();
            setTradingLog(initData.tradingLog || []);
            await updateData();
            setLoading(false);
        };
        fetchInit();

        // 毎秒の時計更新
        const clockTimer = setInterval(() => {
            // 現在時刻の更新
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

            // 平日の場中（9:00〜15:30）以外はスキップ
            const day = now.getDay();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            if (day === 0 || day === 6) return; // 日曜・土曜
            if (hours < 9 || (hours === 15 && minutes > 30) || hours > 15) return; // 時間外

            // 毎分0秒に更新
            if (now.getSeconds() === 0) updateData();
        }, 1000);

        return () => {
            clearInterval(clockTimer);
        };
    }, []);

    // データ更新用関数
    const updateData = async () => {
        const data = await BackendClient.fetchRefreshData();
        setAccountData(data);
        setLastUpdateTime(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    // UI データ準備
    const uiData = useMemo(() => {
        if (!accountData) return null;
        return UIDataAdapter.preparePortfolioData(accountData.accountViewData);
    }, [accountData]);

    // 取引履歴と当日約定をマージしてメモ化
    const mergedTradingLog = useMemo(() => {
        if (!accountData) return tradingLog;
        return [...tradingLog, ...accountData.todayExecutions];
    }, [accountData]);

    // レンダリング
    if (loading) return html`<h1>Now Loading ...</h1>`;
    return html`
        <div
            class="relative w-[90%] max-w-7xl mx-auto my-5 p-8 bg-white text-gray-800 text-left font-['Helvetica'] text-sm align-middle border-2 border-blue-800 rounded-xl shadow-lg overflow-hidden max-lg:text-sm max-lg:m-5 max-sm:text-xs"
        >
            <div class="flex flex-nowrap justify-between gap-8">
                <h1 class="text-xl font-bold">日本円建て口座ポートフォリオ</h1>
                <div class="flex items-center justify-end gap-3">
                    <span>現在時刻:</span>
                    <span class="text-blue-800">${currentTime}</span>
                    <span>|</span>
                    <span>最終更新:</span>
                    <span class="text-blue-800">${lastUpdateTime}</span>
                </div>
            </div>

            <div class="flex flex-nowrap justify-between gap-8">
                <${PieChartComp} data=${accountData.accountViewData.graphData} />
                <div>${html`<${PortfolioComp} accountViewData=${uiData} />`}</div>
            </div>

            <div class="flex flex-nowrap justify-between gap-8">
                <${TradingLogComp} tradingLog=${mergedTradingLog} />
                ${html`<${PriceChangeComp} priceChangePivot=${accountData.priceChangePivot} />`}
            </div>

            ${html` <${LeverageCalculatorComp} netTotalMarketCap=${accountData.accountViewData.netTotalMarketCap} totalMarketCap=${accountData.accountViewData.totalMarketCap} /> `}
        </div>
    `;
}
