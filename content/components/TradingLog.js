// =======================================
// 取引履歴コンポーネント
// =======================================

import { html } from '../utils/preact-adapter.js';

export function TradingLogComp({ tradingLog }) {
    if (!tradingLog || tradingLog.length === 0) return null;

    const cellPad = 'p-[0.8em_0.9em] max-[48em]:p-[0.7em_0.8em] max-[30em]:p-[0.6em_0.7em]';

    return html`
        <div id="jpyAccountTradingLogContainer" class="w-[calc(43%-1em)] mt-[1.875em]">
            <h2 class="mb-2.5 text-[#0066cc] text-[1.2em] font-semibold">取引履歴</h2>
            <div class="table-wrapper w-fit max-h-[25em] overflow-y-auto shadow-[0_0.125em_0.5em_rgba(0,0,0,0.1)] [&::-webkit-scrollbar]:hidden">
                <table class="border-collapse bg-white shadow-[0_0.125em_0.5em_rgba(0,0,0,0.1)] align-middle w-auto">
                    <thead class="sticky top-0 z-10 text-white bg-gradient-to-br from-[#0066cc] to-[#004499] border-b-[0.125em] border-[#003366] whitespace-nowrap">
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
                            const tradeTypeClass = item.tradeType && item.tradeType.includes('買') ? 'text-[#28a745]' : item.tradeType && item.tradeType.includes('売') ? 'text-[#dc3545]' : '';
                            return html`
                                <tr class="border-b-[0.0625em] border-[#e9ecef] transition-colors duration-200 ease-in-out hover:bg-[#f8f9fa]">
                                    <td class="${cellPad}">${item.date}</td>
                                    <td class="${cellPad} text-[#0066cc] text-center">${item.code}</td>
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
