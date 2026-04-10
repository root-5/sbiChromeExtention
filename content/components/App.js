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
import { loadUncheckedKeys, saveUncheckedKeys } from '../modules/localStorage.js';

export function App() {
    const [currentTime, setCurrentTime] = useState('--:--:--');
    const [lastUpdateTime, setLastUpdateTime] = useState('--:--:--');
    const [tradingLog, setTradingLog] = useState([]);
    const [accountData, setAccountData] = useState(null); // { accountViewData, todayExecutions, priceChangeTableData }
    const [usdAccountData, setUsdAccountData] = useState(null);
    const [idecoAccountData, setIdecoAccountData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAllAccountMode, setIsAllAccountMode] = useState(false);
    const [uncheckedTradeKeys, setUncheckedTradeKeys] = useState(() => loadUncheckedKeys()); // 未チェックで PriceChange から除外されている取引キーの Set

    useEffect(() => {
        // 初期データ取得
        const fetchInit = async () => {
            const initData = await BackendClient.fetchInitialData();
            setTradingLog(initData.tradingLog);

            const refreshData = await BackendClient.fetchRefreshData();
            setAccountData(refreshData);
            setLastUpdateTime(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setLoading(false);

            // 円口座表示後にバックグラウンドで全口座データをプリフェッチ
            BackendClient.fetchAllAccountData().then((data) => {
                setUsdAccountData(data.usdAccountData);
                setIdecoAccountData(data.idecoAccountData);
            });
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

    // 全口座モード切替ハンドラ（未取得の場合のみ外貨・iDeCo 口座データを取得）
    const handleToggleAllAccountMode = async () => {
        if (!isAllAccountMode && !usdAccountData) {
            const data = await BackendClient.fetchAllAccountData();
            setUsdAccountData(data.usdAccountData);
            setIdecoAccountData(data.idecoAccountData);
        }
        setIsAllAccountMode(!isAllAccountMode);
    };

    // 取引チェックボックス切り替えハンドラ
    const handleToggleTrade = (key) => {
        setUncheckedTradeKeys((prev) => {
            const nextTradeKeysSet = new Set(prev);
            if (nextTradeKeysSet.has(key)) {
                nextTradeKeysSet.delete(key);
            } else {
                nextTradeKeysSet.add(key);
            }
            saveUncheckedKeys(nextTradeKeysSet);
            return nextTradeKeysSet;
        });
    };

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
        const normalizeDate = (dateText) => String(dateText || '').replace(/\D/g, '');

        return [...tradingLog, ...accountData.todayExecutions].sort((a, b) => {
            const dateCompare = normalizeDate(b.date).localeCompare(normalizeDate(a.date));
            if (dateCompare !== 0) return dateCompare;

            const codeCompare = String(a.code || '').localeCompare(String(b.code || ''));
            if (codeCompare !== 0) return codeCompare;

            return String(a.tradeType || '').localeCompare(String(b.tradeType || ''));
        });
    }, [accountData, tradingLog]);

    // PriceChange 表示用フィルタ済み pivot テーブルをメモ化
    const filteredPriceChangeTableData = useMemo(() => {
        if (!accountData?.priceChangeTableData) return [];
        if (uncheckedTradeKeys.size === 0) return accountData.priceChangeTableData;

        // 非チェックキーに一致する銘柄を除外し、全銘柄が除外された日付行も取り除く
        return accountData.priceChangeTableData
            .map((priceChangeRecord) => {
                const dateStr = String(priceChangeRecord.date).replace(/\D/g, '');
                const filteredItems = priceChangeRecord.ratioAndQuantity.filter((item) => {
                    const tradeKey = `${dateStr}_${item.code}`;
                    return ![...uncheckedTradeKeys].some((uncheckedKey) => uncheckedKey.includes(tradeKey));
                });
                return { ...priceChangeRecord, ratioAndQuantity: filteredItems };
            })
            .filter((record) => record.ratioAndQuantity.length > 0);
    }, [accountData, mergedTradingLog, uncheckedTradeKeys]);

    // レンダリング
    if (loading) return html`<h1>Now Loading ...</h1>`;
    return html`
        <div
            class="relative w-[95%] md:w-[90%] max-w-7xl mx-auto my-4 p-4 md:p-8 bg-white text-gray-800 text-left font-['Helvetica'] text-sm align-middle border-2 border-blue-800 rounded-xl shadow-lg overflow-hidden"
        >
            <div class="flex flex-wrap justify-between gap-x-8 gap-y-2 items-center mb-4">
                <div class="flex items-center gap-4">
                    <h1 class="text-xl font-bold">${isAllAccountMode ? '全口座ポートフォリオ' : '円口座ポートフォリオ'}</h1>
                    <button onClick=${handleToggleAllAccountMode} class="px-3 py-1 text-white rounded hover:opacity-80 transition text-xs ${isAllAccountMode ? 'bg-green-700' : 'bg-blue-700'}">
                        ${isAllAccountMode ? '円口座表示へ' : '全口座表示へ'}
                    </button>
                </div>
                <div class="flex items-center justify-end gap-2">
                    <span>現在時刻:</span>
                    <span>${currentTime}</span>
                    <span>|</span>
                    <span>最終更新:</span>
                    <span>${lastUpdateTime}</span>
                </div>
            </div>

            ${isAllAccountMode
                ? html`
                      <div class="flex flex-col lg:flex-row lg:gap-8">
                          <div class="mx-auto w-[265px] lg:w-1/3 max-w-md aspect-square">
                              <${PieChartAllComp} data=${allAccountUiData.graphData} />
                          </div>
                          <div>
                              <${PortfolioAllComp} accountViewData=${allAccountUiData} />
                          </div>
                      </div>
                  `
                : html`
                      <div class="flex flex-col lg:flex-row lg:gap-8">
                          <div class="mx-auto w-[265px] lg:w-1/3 max-w-md aspect-square">
                              <${PieChartComp} data=${accountData.accountViewData.graphData} />
                          </div>
                          <div>
                              <${PortfolioComp} accountViewData=${uiData} />
                          </div>
                      </div>

                      <div class="flex flex-wrap lg:flex-nowrap justify-between">
                          <${TradingLogComp} tradingLog=${mergedTradingLog} uncheckedTradeKeys=${uncheckedTradeKeys} onToggleTrade=${handleToggleTrade} />
                          <${PriceChangeComp} priceChangeTableData=${filteredPriceChangeTableData} />
                      </div>

                      <${LeverageCalculatorComp} netTotalMarketCap=${accountData.accountViewData.netTotalMarketCap} totalMarketCap=${accountData.accountViewData.totalMarketCap} />
                  `}
        </div>
    `;
}
