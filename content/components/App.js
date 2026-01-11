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
    const [currentTime, setCurrentTime] = useState('');
    const [lastUpdateTime, setLastUpdateTime] = useState('--:--:--');
    const [tradingLog, setTradingLog] = useState([]);
    const [accountData, setAccountData] = useState(null); // { accountViewData, todayExecutions, priceChangePivot }
    const [usdAccountData, setUsdAccountData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAllCurrencyMode, setIsAllCurrencyMode] = useState(false);

    useEffect(() => {
        // 初期データ取得
        const fetchInit = async () => {
            const initData = await BackendClient.fetchInitialData();
            setTradingLog(initData.tradingLog);
            setUsdAccountData(initData.usdAccountData);
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

    // UI データ準備 (JPY)
    const uiData = useMemo(() => {
        if (!accountData) return null;
        return UIDataAdapter.preparePortfolioData(accountData.accountViewData);
    }, [accountData]);

    // UI データ準備 (全通貨合算)
    const allCurrencyUiData = useMemo(() => {
        if (!accountData || !usdAccountData) return null;

        // JPY側数値パース (カンマと¥記号を除去して数値化)
        const parseNum = (str) => (typeof str === 'string' ? parseFloat(str.replace(/[¥,]/g, '')) : str || 0);

        const viewData = accountData.accountViewData;
        const jpyNetTotal = parseNum(viewData.netTotalMarketCap);
        const jpyTotal = parseNum(viewData.totalMarketCap);
        const jpyBuyingPower = parseNum(viewData.buyingPower);
        const jpyStocks = viewData.tableTextData || []; // tableRowsではなくtableTextDataの場合も考慮

        // USDデータの集計
        const usdStocks = usdAccountData.stocks || [];
        const usdTotalStockVal = usdStocks.reduce((sum, s) => sum + s.marketCap, 0);
        const usdDeposit = usdAccountData.totalUsdDepositAsJpy || 0;
        const usdNetAsset = usdTotalStockVal + usdDeposit; // USD純資産

        // 合算計算
        // 信用建玉額(推定) = JPY総資産 - JPY純資産
        const marginOpenInterest = jpyTotal - jpyNetTotal;
        const newNetTotal = jpyNetTotal + usdNetAsset; // 新純資産 = JPY純資産 + USD純資産
        const newTotal = newNetTotal + marginOpenInterest; // 新総資産 = 新純資産 + 信用建玉
        const newBuyingPower = jpyBuyingPower + usdDeposit;
        const newLeverage = newNetTotal ? (newTotal / newNetTotal).toFixed(2) : '0.00';

        // このままだとPortfolioAllCompで表示する際に整合性が取れないので合わせる
        const formattedJpyStocks = jpyStocks
            .map((s) => ({
                name: s.name,
                code: s.code,
                quantity: parseNum(s.quantityText || s.quantity), // quantityTextがある場合
                price: parseNum(s.currentPriceText || s.currentPrice || s.price),
                marketCap: parseNum(s.marketCapText || s.marketCap),
                profitLoss: parseNum(s.profitLossText || s.profitAndLoss), // 損益
                profitLossRate: 0, // jpyデータには率が直接入ってないかもしれないので0か計算
                // profitAndLoss / (marketCap - profitAndLoss) で算出可
                depositType: s.depositType,
                currencyType: '円建',
            }))
            .map((s) => {
                // 損益率計算
                const cost = s.marketCap - s.profitLoss;
                s.profitLossRate = cost ? (s.profitLoss / cost) * 100 : 0;
                return s;
            });

        const newTableRows = [...formattedJpyStocks, ...usdStocks].sort((a, b) => b.marketCap - a.marketCap);

        // グラフデータ
        const newGraphData = newTableRows.map((s) => ({ name: s.name, marketCap: s.marketCap }));

        return {
            summaryData: {
                netTotalMarketCap: Math.floor(newNetTotal).toLocaleString(),
                totalMarketCap: Math.floor(newTotal).toLocaleString(),
                leverage: newLeverage,
                buyingPower: Math.floor(newBuyingPower).toLocaleString(),
            },
            tableRows: newTableRows,
            graphData: newGraphData,
        };
    }, [accountData, usdAccountData]);

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
                    <h1 class="text-xl font-bold">${isAllCurrencyMode ? '全通貨合算ポートフォリオ' : '日本円建て口座ポートフォリオ'}</h1>
                    <button
                        onClick=${() => setIsAllCurrencyMode(!isAllCurrencyMode)}
                        class="px-3 py-1 text-white rounded hover:opacity-80 transition text-xs ${isAllCurrencyMode ? 'bg-purple-700' : 'bg-blue-700'}"
                    >
                        ${isAllCurrencyMode ? '円建てのみ表示へ' : '全通貨合算表示へ'}
                    </button>
                    ${!usdAccountData && !loading ? html`<span class="text-xs text-red-500">(外貨データ未取得)</span>` : ''}
                </div>
                <div class="flex items-center justify-end gap-3">
                    <span>現在時刻:</span>
                    <span class="text-blue-800">${currentTime}</span>
                    <span>|</span>
                    <span>最終更新:</span>
                    <span class="text-blue-800">${lastUpdateTime}</span>
                </div>
            </div>

            ${isAllCurrencyMode && allCurrencyUiData
                ? html`
                      <div class="flex flex-nowrap justify-between gap-8">
                          <${PieChartAllComp} data=${allCurrencyUiData.graphData} />
                          <div>${html`<${PortfolioAllComp} accountViewData=${allCurrencyUiData} />`}</div>
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
