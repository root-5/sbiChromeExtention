// =======================================
// 取引履歴コンポーネント
// =======================================

import { html, useMemo } from '../utils/preact-adapter.js';

export function TradingLogComp({ tradingLog }) {
    if (!tradingLog || tradingLog.length === 0) return null;

    const tradingLogStyles = useMemo(
        () => `
        #jpyAccountTradingLogContainer {
            width: calc(43% - 1em);
            margin-top: 1.875em;
        }

        #jpyAccountTradingLogContainer .table-wrapper {
            width: fit-content;
            max-height: 25em;
            overflow-y: auto;
            box-shadow: 0 0.125em 0.5em rgba(0, 0, 0, 0.1);
        }

        #jpyAccountTradingLogContainer .table-wrapper::-webkit-scrollbar {
            display: none;
        }

        #jpyAccountTradingLogContainer table {
            width: auto;
        }

        #jpyAccountTradingLogContainer table thead {
            position: sticky;
            top: 0;
            z-index: 10;
            border-spacing: inherit;
        }

        #jpyAccountTradingLogContainer table tbody td.code {
            color: #0066cc;
            text-align: center;
        }

        #jpyAccountTradingLogContainer table tbody td.quantity,
        #jpyAccountTradingLogContainer table tbody td.price {
            text-align: right;
        }

        #jpyAccountTradingLogContainer table tbody td.tradeType {
            text-align: center;
            font-weight: 600;
        }
    `,
        []
    );

    return html`
        <style>
            ${tradingLogStyles}
        </style>
        <div id="jpyAccountTradingLogContainer">
            <h2>取引履歴</h2>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>日付</th>
                            <th>コード</th>
                            <th>銘柄名</th>
                            <th>取引</th>
                            <th>株数</th>
                            <th>価格</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tradingLog.map((item) => {
                            const tradeTypeClass = item.tradeType && item.tradeType.includes('買') ? 'positive' : item.tradeType && item.tradeType.includes('売') ? 'negative' : '';
                            return html`
                                <tr>
                                    <td class="date">${item.date}</td>
                                    <td class="code">${item.code}</td>
                                    <td class="name">${item.name}</td>
                                    <td class=${'tradeType ' + tradeTypeClass}>${item.tradeType}</td>
                                    <td class="quantity">${item.quantity}</td>
                                    <td class="price">${item.price}</td>
                                </tr>
                            `;
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
