// =======================================
// メインコンポーネント
// =======================================

import { html, useState, useEffect, useMemo } from '../utils/preact-adapter.js';
import { BackendClient } from '../modules/backendClient.js';
import { UIDataAdapter } from '../modules/uiDataAdapter.js';
import { PieChartComp } from './PieChart.js';
import { PieChartAllComp } from './PieChartAll.js';
import { PortfolioComp } from './Portfolio.js';
import { PortfolioAllComp } from './PortfolioAll.js';
import { LeverageCalculatorComp } from './LeverageCalculator.js';
import { TradingLogComp } from './TradingLog.js';
import { PriceChangeComp } from './PriceChange.js';

export function App() {
    const [currentTime, setCurrentTime] = useState('--:--:--');
    const [lastUpdateTime, setLastUpdateTime] = useState('--:--:--');
    const [tradingLog, setTradingLog] = useState([]);
    const [accountData, setAccountData] = useState(null); // { accountViewData, todayExecutions, priceChangePivot }
    const [usdAccountData, setUsdAccountData] = useState(null);
    const [idecoAccountData, setIdecoAccountData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAllAccountMode, setIsAllAccountMode] = useState(false);

    useEffect(() => {
        // 初期データ取得
        const fetchInit = async () => {
            const [initData, refreshData] = await Promise.all([BackendClient.fetchInitialData(), BackendClient.fetchRefreshData()]);

            setTradingLog(initData.tradingLog);
            setUsdAccountData(initData.usdAccountData);
            setIdecoAccountData(initData.idecoAccountData);
            setAccountData(refreshData);
            setLastUpdateTime(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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

    // UI データ準備 (円口座)
    const uiData = useMemo(() => {
        if (!accountData) return null;
        return UIDataAdapter.preparePortfolioData(accountData.accountViewData);
    }, [accountData]);

    // UI データ準備 (全口座)
    const allAccountUiData = useMemo(() => {
        return UIDataAdapter.prepareAllAccountPortfolioData(accountData, usdAccountData, idecoAccountData);
    }, [accountData, usdAccountData, idecoAccountData]);

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
            <div class="flex flex-nowrap justify-between gap-8 h-8 items-center mb-4">
                <div class="flex items-center gap-4">
                    <h1 class="text-xl font-bold">${isAllAccountMode ? '全口座ポートフォリオ' : '円口座ポートフォリオ'}</h1>
                    <button
                        onClick=${() => setIsAllAccountMode(!isAllAccountMode)}
                        class="px-3 py-1 text-white rounded hover:opacity-80 transition text-xs ${isAllAccountMode ? 'bg-green-700' : 'bg-blue-700'}"
                    >
                        ${isAllAccountMode ? '円口座表示へ' : '全口座表示へ'}
                    </button>
                    ${!usdAccountData && !loading ? html`<span class="text-xs text-red-500">(外貨データ未取得)</span>` : ''}
                </div>
                <div class="flex items-center justify-end gap-3">
                    <span>現在時刻:</span>
                    <span>${currentTime}</span>
                    <span>|</span>
                    <span>最終更新:</span>
                    <span>${lastUpdateTime}</span>
                </div>
            </div>

            ${isAllAccountMode && allAccountUiData
                ? html`
                      <div class="flex flex-nowrap justify-between gap-8">
                          <${PieChartAllComp} data=${allAccountUiData.graphData} />
                          <div>${html`<${PortfolioAllComp} accountViewData=${allAccountUiData} />`}</div>
                      </div>
                  `
                : html`
                      <div class="flex flex-nowrap justify-between gap-8">
                          <${PieChartComp} data=${accountData.accountViewData.graphData} />
                          <div>${html`<${PortfolioComp} accountViewData=${uiData} />`}</div>
                      </div>

                      <div class="flex flex-nowrap justify-between gap-8">
                          <${TradingLogComp} tradingLog=${mergedTradingLog} />
                          ${html`<${PriceChangeComp} priceChangePivot=${accountData.priceChangePivot} />`}
                      </div>

                      ${html` <${LeverageCalculatorComp} netTotalMarketCap=${accountData.accountViewData.netTotalMarketCap} totalMarketCap=${accountData.accountViewData.totalMarketCap} /> `}
                  `}
        </div>
    `;
}
