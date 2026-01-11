// =======================================
// 取引履歴コンポーネント
// =======================================

import { html } from '../utils/preact-adapter.js';

export function TradingLogComp({ tradingLog }) {
    if (!tradingLog || tradingLog.length === 0) return null;

    const cellPad = 'p-3 max-md:p-2.5 max-sm:p-2';

    return html`
        <div id="jpyAccountTradingLogContainer" class="w-[43%] mt-8">
            <h2 class="mb-2.5 text-blue-600 text-xl font-semibold">取引履歴</h2>
            <div class="table-wrapper w-fit max-h-96 overflow-y-auto shadow-sm [&::-webkit-scrollbar]:hidden">
                <table class="border-collapse bg-white shadow-sm align-middle w-auto">
                    <thead class="sticky top-0 z-10 text-white bg-gradient-to-br from-blue-600 to-blue-800 border-b-2 border-blue-900 whitespace-nowrap">
                        <tr>
                            <th class="${cellPad}">日付</th>
                            <th class="${cellPad}">コード</th>
                            <th class="${cellPad}">銘柄名</th>
                            <th class="${cellPad}">取引</th>
                            <th class="${cellPad}">株数</th>
                            <th class="${cellPad}">価格</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tradingLog.map((item) => {
                            const tradeTypeClass = item.tradeType && item.tradeType.includes('買') ? 'text-green-600' : item.tradeType && item.tradeType.includes('売') ? 'text-red-600' : '';
                            return html`
                                <tr class="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50">
                                    <td class="${cellPad}">${item.date}</td>
                                    <td class="${cellPad} text-blue-600 text-center">${item.code}</td>
                                    <td class="${cellPad}">${item.name}</td>
                                    <td class="${cellPad} text-center font-semibold ${tradeTypeClass}">${item.tradeType}</td>
                                    <td class="${cellPad} text-right">${item.quantity}</td>
                                    <td class="${cellPad} text-right">${item.price}</td>
                                </tr>
                            `;
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
