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

    const panelStyles = useMemo(
        () => `
        #jpyAccountPanel {
            position: relative;
            width: 90%;
            max-width: 75em;
            margin: 1.25em auto;
            padding: 2em;
            background: #ffffff;
            color: #333333;
            text-align: left;
            font-family: Helvetica;
            font-weight: 400;
            font-size: 0.8125em;
            vertical-align: middle;
            border: 0.125em solid #0066cc;
            border-radius: 0.75em;
            box-shadow: 0 0.25em 1.25em rgba(0, 0, 0, 0.15);
            overflow: hidden;
        }

        @media (max-width: 60.5em) {
            #jpyAccountPanel {
                font-size: 0.9em;
                margin: 1.25em;
            }
        }

        @media (max-width: 30em) {
            #jpyAccountPanel {
                font-size: 0.8em;
            }
        }

        #jpyAccountPanel h1 {
            font-size: 1.2em;
            font-weight: bold;
        }

        #jpyAccountPanel h2 {
            margin-bottom: 0.625em;
            color: #0066cc;
            font-size: 1.2em;
            font-weight: 600;
        }

        #jpyAccountPanel .flex {
            display: flex;
            flex-wrap: nowrap;
            justify-content: space-between;
            gap: 2em;
        }

        #jpyAccountPanel table {
            border-collapse: collapse;
            background: #ffffff;
            box-shadow: 0 0.125em 0.5em rgba(0, 0, 0, 0.1);
            vertical-align: middle;
        }

        #jpyAccountPanel table td,
        #jpyAccountPanel table th {
            padding: 0.8em 0.9em;
        }

        @media (max-width: 48em) {
            #jpyAccountPanel table th,
            #jpyAccountPanel table td {
                padding: 0.7em 0.8em;
            }
        }

        @media (max-width: 30em) {
            #jpyAccountPanel table th,
            #jpyAccountPanel table td {
                padding: 0.6em 0.7em;
            }
        }

        #jpyAccountPanel table .positive {
            color: #28a745;
        }

        #jpyAccountPanel table .negative {
            color: #dc3545;
        }

        #jpyAccountPanel table thead {
            color: #ffffff;
            background: linear-gradient(135deg, #0066cc, #004499);
            border-bottom: 0.125em solid #003366;
            white-space: nowrap;
        }

        #jpyAccountPanel table tbody tr {
            border-bottom: 0.0625em solid #e9ecef;
            transition: background-color 0.2s ease;
        }

        #jpyAccountPanel table tbody tr:hover {
            background: #f8f9fa;
        }

        #jpyAccountPanel table tfoot {
            background: #f8f9fa;
            border-top: 0.125em solid #0066cc;
        }

        #jpyAccountPanel table tfoot td {
            font-weight: bold;
            padding: 0.75em 0.875em;
            color: #0066cc;
        }

        #jpyAccountClock {
            display: flex;
            align-items: center;
            justify-content: end;
            gap: 0.75em;
        }

        #jpyAccountClock .clockValue {
            color: #0066cc;
            padding-top: 0.1875em;
        }
    `,
        []
    );

    if (loading) return html`<h1>Now Loading ...</h1>`;

    return html`
        <style>
            ${panelStyles}
        </style>
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
                <${PieChartComp} data=${uiData?.summaryData ? accountData.accountViewData.graphData : null} />
                <div class="right-panel">${uiData && html`<${PortfolioComp} accountViewData=${uiData} />`}</div>
            </div>

            <div class="flex">
                <${TradingLogComp} tradingLog=${mergedTradingLog} />
                ${accountData && html`<${PriceChangeComp} priceChangePivot=${accountData.priceChangePivot} />`}
            </div>

            ${uiData && html` <${LeverageCalculatorComp} netTotalMarketCap=${accountData.accountViewData.netTotalMarketCap} totalMarketCap=${accountData.accountViewData.totalMarketCap} /> `}
        </div>
    `;
}
