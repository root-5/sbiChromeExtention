// =======================================
// 株価変化率と売買数コンポーネント
// =======================================

import { html } from '../utils/preact-adapter.js';

export function PriceChangeComp({ priceChangePivot }) {
    if (!priceChangePivot || priceChangePivot.length === 0) return null;

    // 日付リスト
    const dates = priceChangePivot.map((d) => d.date);

    // 銘柄リスト抽出（ユニーク化してソート）
    const stockMap = new Map();
    priceChangePivot.forEach((day) => {
        day.ratioAndQuantity.forEach((item) => {
            if (!stockMap.has(item.code)) stockMap.set(item.code, item.name);
        });
    });
    const stocks = Array.from(stockMap.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.code.localeCompare(b.code));

    // データマップ作成
    const dataMap = new Map(); // key: "${code}_${date}", value: { ratio, quantity }
    priceChangePivot.forEach((day) => {
        day.ratioAndQuantity.forEach((item) => {
            dataMap.set(`${item.code}_${day.date}`, item);
        });
    });

    const cellPad = 'p-[0.8em_0.9em] max-[48em]:p-[0.7em_0.8em] max-[30em]:p-[0.6em_0.7em]';

    return html`
        <div id="priceChangeTableContainer" class="w-[calc(57%-1em)] mt-[1.875em]">
            <h2 class="mb-2.5 text-[#0066cc] text-[1.2em] font-semibold">株価変化率と売買数</h2>
            <div class="table-wrapper w-full overflow-x-auto shadow-[0_0.125em_0.5em_rgba(0,0,0,0.1)] [&::-webkit-scrollbar]:hidden">
                <table id="priceChangeTable" class="w-full min-w-[87.5em] border-collapse bg-white shadow-[0_0.125em_0.5em_rgba(0,0,0,0.1)] align-middle">
                    <thead class="sticky top-0 z-10 text-white bg-gradient-to-br from-[#0066cc] to-[#004499] border-b-[0.125em] border-[#003366] whitespace-nowrap">
                        <tr>
                            <th rowspan="2" class="${cellPad} text-[0.95em] sticky left-0 z-10 bg-[#0066cc]">コード</th>
                            <th rowspan="2" class="${cellPad} text-[0.95em] sticky left-[4.8em] z-10 bg-[#0066cc]">銘柄名</th>
                            ${dates.map((date) => html`<th colspan="2" class="${cellPad} text-[0.85em] pt-[0.9em] pb-[0.6em]">${date}</th>`)}
                        </tr>
                        <tr>
                            ${dates.map(
                                () => html`
                                    <th class="${cellPad} text-[0.85em] py-[0.5em]">変化率</th>
                                    <th class="${cellPad} text-[0.85em] py-[0.5em]">売買数</th>
                                `
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        ${stocks.map(
                            (stock) => html`
                                <tr class="border-b-[0.0625em] border-[#e9ecef] transition-colors duration-200 ease-in-out hover:bg-[#f8f9fa]">
                                    <td class="${cellPad} text-[#0066cc] text-center bg-white sticky left-0 z-[5]">${stock.code}</td>
                                    <td class="${cellPad} bg-white sticky left-[4.55em] z-[5] whitespace-nowrap">${stock.name}</td>
                                    ${dates.map((date) => {
                                        const itemData = dataMap.get(`${stock.code}_${date}`);
                                        if (!itemData) {
                                            return html`
                                                <td class="${cellPad} text-right">-</td>
                                                <td class="${cellPad} text-right">-</td>
                                            `;
                                        }

                                        const ratioVal = parseFloat(itemData.ratio) || 0;
                                        const ratioText = ratioVal.toFixed(2);
                                        const ratioClass = ratioVal > 0 ? 'text-[#28a745] font-semibold' : ratioVal < 0 ? 'text-[#dc3545] font-semibold' : '';

                                        const quantityText = itemData.quantity ? Number(itemData.quantity).toLocaleString() : '-';

                                        return html`
                                            <td class="${cellPad} text-right ${ratioClass}">${ratioText}%</td>
                                            <td class="${cellPad} text-right">${quantityText}</td>
                                        `;
                                    })}
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
            </div>
            <p>※ 変化率は基本的に「該当日終値/現在価格」ですが、売買があった日は「売買価格/現在価格」で計算</p>
        </div>
    `;
}
