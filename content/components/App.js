import { html, useState, useEffect, useMemo } from '../utils/preact-adapter.js';
import { BackendClient } from '../modules/backendClient.js';
import { UIDataAdapter } from '../modules/uiDataAdapter.js';
import { PieChart } from './PieChart.js';
import { Portfolio } from './Portfolio.js';
import { LeverageCalculator } from './LeverageCalculator.js';
import { TradingLogTable } from './TradingLog.js';
import { PriceChange } from './PriceChange.js';

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
        <div id="jpyAccountPanel">
            <div class="flex header-row">
                <h1>日本円建て口座ポートフォリオ</h1>
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
                <div class="right-panel">${uiData && html`<${Portfolio} accountViewData=${uiData} />`}</div>
            </div>

            <div class="flex">
                <${TradingLogTable} tradingLog=${mergedTradingLog} />
                ${accountData && html`<${PriceChange} priceChangePivot=${accountData.priceChangePivot} />`}
            </div>

            ${uiData && html` <${LeverageCalculator} netTotalMarketCap=${accountData.accountViewData.netTotalMarketCap} totalMarketCap=${accountData.accountViewData.totalMarketCap} /> `}
        </div>
    `;
}
