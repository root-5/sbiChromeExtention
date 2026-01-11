import { html } from '../utils/preact-adapter.js';

export function TradingLogTable({ tradingLog }) {
    if (!tradingLog || tradingLog.length === 0) return null;

    return html`
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
