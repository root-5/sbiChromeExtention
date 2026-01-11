import { html, useState, useEffect, useMemo } from '../utils/preact-adapter.js';
import { BackendClient } from '../modules/backendClient.js';
import { UIDataAdapter } from '../modules/uiDataAdapter.js';
import { PieChart } from './PieChart.js';
import { PortfolioTable } from './PortfolioTable.js';
import { LeverageCalculator } from './LeverageCalculator.js';
import { TradingLogTable } from './TradingLogTable.js';
import { PriceChangeTable } from './PriceChangeTable.js';

export function App() {
    const [currentTime, setCurrentTime] = useState('');
    const [lastUpdateTime, setLastUpdateTime] = useState('--:--:--');
    const [tradingLog, setTradingLog] = useState([]);
    const [accountData, setAccountData] = useState(null); // { accountViewData, todayExecutions, priceChangePivot }
    const [loading, setLoading] = useState(true);

    // Initial Data Fetch
    useEffect(() => {
        const fetchInit = async () => {
            try {
                const initData = await BackendClient.fetchInitialData();
                setTradingLog(initData.tradingLog || []);
                await updateData();
            } catch (e) {
                console.error('Initialization error', e);
            } finally {
                setLoading(false);
            }
        };
        fetchInit();

        // Clock Timer
        const clockTimer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);

        // Data Update Timer (Scheduler)
        const dataTimer = setInterval(() => {
            const now = new Date();
            const day = now.getDay();
            const hours = now.getHours();
            const minutes = now.getMinutes();

            // 平日の場中（9:00〜15:30）以外はスキップ
            if (day === 0 || day === 6) return;
            if (hours < 9 || (hours === 15 && minutes > 30) || hours > 15) return;

            // 毎分0秒に更新
            if (now.getSeconds() === 0) {
                updateData();
            }
        }, 1000);

        return () => {
            clearInterval(clockTimer);
            clearInterval(dataTimer);
        };
    }, []);

    const updateData = async () => {
        try {
            const data = await BackendClient.fetchRefreshData();
            setAccountData(data);
            setLastUpdateTime(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } catch (e) {
            console.error('Update error', e);
        }
    };

    // UI Data Preparation
    const uiData = useMemo(() => {
        if (!accountData) return null;
        return UIDataAdapter.preparePortfolioData(accountData.accountViewData);
    }, [accountData]);

    const mergedTradingLog = useMemo(() => {
        if (!accountData || !accountData.todayExecutions) return tradingLog;
        return UIDataAdapter.mergeTodayExecutions(tradingLog, accountData.todayExecutions);
    }, [tradingLog, accountData]);

    if (loading) return html`<div class="loading">Loading Portfolio...</div>`;

    return html`
        <div id="jpyAccountPanel">
            <div class="flex header-row">
                <h1>日本円建て口座ポートフォリオ (Preact)</h1>
                <div id="jpyAccountClock">
                    <span class="clockLabel">現在時刻:</span>
                    <span class="clockValue">${currentTime}</span>
                    <span class="clockSeparator">|</span>
                    <span class="clockLabel">最終更新:</span>
                    <span class="clockValue">${lastUpdateTime}</span>
                </div>
            </div>

            <div class="flex">
                <${PieChart} data=${uiData?.summaryData ? accountData.accountViewData.graphData : null} />
                <div class="right-panel">${uiData && html`<${PortfolioTable} accountViewData=${uiData} />`}</div>
            </div>

            <div class="flex">
                <${TradingLogTable} tradingLog=${mergedTradingLog} />
                ${accountData && html`<${PriceChangeTable} priceChangePivot=${accountData.priceChangePivot} />`}
            </div>

            ${uiData && html` <${LeverageCalculator} netTotalMarketCap=${accountData.accountViewData.netTotalMarketCap} totalMarketCap=${accountData.accountViewData.totalMarketCap} /> `}
        </div>
    `;
}
