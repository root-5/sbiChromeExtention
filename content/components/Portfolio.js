// =======================================
// ポートフォリオコンポーネント
// =======================================

import { html, useMemo } from '../utils/preact-adapter.js';

export function PortfolioComp({ accountViewData }) {
    const { summaryData, leverageRows, tableRows, classData } = accountViewData;
    const { netTotalMarketCap, totalMarketCap, leverage, buyingPower, totalProfit } = summaryData;
    const { totalProfit: totalProfitClass } = classData;
    const portfolioStyles = useMemo(
        () => `
        #jpyAccountSummaryContainer,
        #jpyAccountTableContainer {
            padding-top: 1.25em;
        }

        @media (max-width: 30em) {
            #jpyAccountSummaryContainer,
            #jpyAccountTableContainer {
                padding: 0.625em;
                overflow-x: auto;
            }
        }

        #jpyAccountSummaryContainer {
            display: flex;
            gap: 2em;
        }

        #jpyAccountSummaryContainer table {
            width: fit-content;
        }

        #jpyAccountTableContainer h2 {
            margin-bottom: 0.625em;
        }

        #jpyAccountTableContainer table {
            width: 100%;
        }

        #jpyAccountTableContainer table td.code {
            color: #0066cc;
            text-align: center;
        }

        #jpyAccountTableContainer table td.quantity,
        #jpyAccountTableContainer table td.buyPrice,
        #jpyAccountTableContainer table td.currentPrice,
        #jpyAccountTableContainer table td.dayChange,
        #jpyAccountTableContainer table td.profitAndLoss,
        #jpyAccountTableContainer table td.marketCap,
        #jpyAccountTableContainer table td.profit,
        #jpyAccountTableContainer table td.amount {
            text-align: right;
        }

        #jpyAccountTableContainer table td.dayChange,
        #jpyAccountTableContainer table td.profitAndLoss {
            font-weight: 600;
        }

        #jpyAccountTableContainer table td .percent {
            font-size: 0.7em;
        }
    `,
        []
    );

    return html`
        <style>
            ${portfolioStyles}
        </style>
        <div id="jpyAccountSummaryContainer">
            <div>
                <h2>サマリー</h2>
                <table>
                    <thead>
                        <tr>
                            <th>純資産</th>
                            <th>総資産</th>
                            <th>レバレッジ</th>
                            <th>買付余力</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="amount">${netTotalMarketCap}</td>
                            <td class="amount">${totalMarketCap}</td>
                            <td class="amount">${leverage}</td>
                            <td class="amount">${buyingPower}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div>
                <h2>レバレッジ管理</h2>
                <table>
                    <thead>
                        <tr>
                            <th>基準</th>
                            <th>差額</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leverageRows.map(
                            (item) => html`
                                <tr>
                                    <td>${item.label}</td>
                                    <td class="amount">${item.diff}</td>
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="jpyAccountTableContainer">
            <h2>ポートフォリオ</h2>
            <table>
                <thead>
                    <tr>
                        <th>コード</th>
                        <th>銘柄名</th>
                        <th>株数</th>
                        <th>取得価格</th>
                        <th>現在価格</th>
                        <th>前日比</th>
                        <th>損益</th>
                        <th>時価総額</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows.map((item) => {
                        const dayChangeClass = String(item.dayChangeDiff).startsWith('+') ? 'positive' : String(item.dayChangeDiff).startsWith('-') ? 'negative' : '';
                        const profitClass = String(item.profitAndLossDiff).startsWith('+') ? 'positive' : String(item.profitAndLossDiff).startsWith('-') ? 'negative' : '';

                        return html`
                            <tr class=${item.name === '調整後現金' ? 'cash-row' : ''}>
                                <td class="code">${item.code}</td>
                                <td class="name">${item.name}</td>
                                <td class="quantity">${item.quantity}</td>
                                <td class="buyPrice">${item.buyPrice}</td>
                                <td class="currentPrice">${item.currentPrice}</td>
                                <td class="dayChange">
                                    <span class=${'dayChangeRate ' + dayChangeClass}>${item.dayChangeRate}</span>
                                    <span class=${'percent ' + dayChangeClass}>%</span>
                                </td>
                                <td class="profitAndLoss">
                                    <span class=${'profitAndLossDiff ' + profitClass}>${item.profitAndLossDiff}</span>
                                </td>
                                <td class="marketCap">${item.marketCap}</td>
                            </tr>
                        `;
                    })}
                </tbody>
                <tfoot>
                    <tr class="totalRow">
                        <td colspan="6">合計</td>
                        <td class=${totalProfitClass}>${totalProfit}</td>
                        <td class="amount">${totalMarketCap}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}
