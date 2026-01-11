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

    const cellPad = 'p-3 max-md:p-2.5 max-sm:p-2';

    return html`
        <div id="priceChangeTableContainer" class="w-[57%] mt-8">
            <h2 class="mb-2.5 text-blue-600 text-xl font-semibold">株価変化率と売買数</h2>
            <div class="table-wrapper w-full overflow-x-auto shadow-sm [&::-webkit-scrollbar]:hidden">
                <table id="priceChangeTable" class="w-full min-w-[80rem] border-collapse bg-white shadow-sm align-middle">
                    <thead class="sticky top-0 z-10 text-white bg-gradient-to-br from-blue-600 to-blue-800 border-b-2 border-blue-900 whitespace-nowrap">
                        <tr>
                            <th rowspan="2" class="${cellPad} text-base sticky left-0 z-10 bg-blue-600">コード</th>
                            <th rowspan="2" class="${cellPad} text-base sticky left-20 z-10 bg-blue-600">銘柄名</th>
                            ${dates.map((date) => html`<th colspan="2" class="${cellPad} text-sm pt-3.5 pb-2.5">${date}</th>`)}
                        </tr>
                        <tr>
                            ${dates.map(
                                () => html`
                                    <th class="${cellPad} text-sm py-2">変化率</th>
                                    <th class="${cellPad} text-sm py-2">売買数</th>
                                `
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        ${stocks.map(
                            (stock) => html`
                                <tr class="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50">
                                    <td class="${cellPad} text-blue-600 text-center bg-white sticky left-0 z-[5]">${stock.code}</td>
                                    <td class="${cellPad} bg-white sticky left-20 z-[5] whitespace-nowrap">${stock.name}</td>
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
                                        const ratioClass = ratioVal > 0 ? 'text-green-600 font-semibold' : ratioVal < 0 ? 'text-red-600 font-semibold' : '';

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
