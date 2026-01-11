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
            if (day === 0 || day === 6) return;
            if (hours < 9 || (hours === 15 && minutes > 30) || hours > 15) return;

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

    const mergedTradingLog = useMemo(() => {
        if (!accountData || !accountData.todayExecutions) return tradingLog;
        return UIDataAdapter.mergeTodayExecutions(tradingLog, accountData.todayExecutions);
    }, [tradingLog, accountData]);

    if (loading) return html`<h1>Now Loading ...</h1>`;

    return html`
        <div
            id="jpyAccountPanel"
            class="relative w-[90%] max-w-[75em] mx-auto my-5 p-8 bg-white text-[#333333] text-left font-['Helvetica'] font-normal text-[0.8125em] align-middle border-[0.125em] border-[#0066cc] rounded-[0.75em] shadow-[0_0.25em_1.25em_rgba(0,0,0,0.15)] overflow-hidden max-[60.5em]:text-[0.9em] max-[60.5em]:m-5 max-[30em]:text-[0.8em]"
        >
            <div class="flex flex-nowrap justify-between gap-8 header-row">
                <h1 class="text-[1.2em] font-bold">日本円建て口座ポートフォリオ</h1>
                <div id="jpyAccountClock" class="flex items-center justify-end gap-3">
                    <span class="clockLabel">現在時刻:</span>
                    <span class="clockValue text-[#0066cc] pt-[0.1875em]">${currentTime}</span>
                    <span class="clockSeparator">|</span>
                    <span class="clockLabel">最終更新:</span>
                    <span class="clockValue text-[#0066cc] pt-[0.1875em]">${lastUpdateTime}</span>
                </div>
            </div>

            <div class="flex flex-nowrap justify-between gap-8">
                <${PieChartComp} data=${uiData?.summaryData ? accountData.accountViewData.graphData : null} />
                <div class="right-panel">${uiData && html`<${PortfolioComp} accountViewData=${uiData} />`}</div>
            </div>

            <div class="flex flex-nowrap justify-between gap-8">
                <${TradingLogComp} tradingLog=${mergedTradingLog} />
                ${accountData && html`<${PriceChangeComp} priceChangePivot=${accountData.priceChangePivot} />`}
            </div>

            ${uiData && html` <${LeverageCalculatorComp} netTotalMarketCap=${accountData.accountViewData.netTotalMarketCap} totalMarketCap=${accountData.accountViewData.totalMarketCap} /> `}
        </div>
    `;
}
