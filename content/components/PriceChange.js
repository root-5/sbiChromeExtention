// =======================================
// 株価変化率と売買数コンポーネント
// =======================================

import { html } from '../utils/preact-adapter.js';

export function PriceChangeComp({ priceChangePivot }) {
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
    const dataMap = new Map();
    priceChangePivot.forEach((day) => {
        day.ratioAndQuantity.forEach((item) => {
            dataMap.set(`${item.code}_${day.date}`, item);
        });
    });

    const cellPad = 'p-2.5';

    return html`
        <div class="w-[57%] mt-8">
            <h2 class="mb-1.5 text-blue-800 text-lg font-semibold">株価変化率と売買数</h2>
            <div class="w-full shadow-md rounded-md overflow-hidden overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <table class="border-collapse bg-white align-middle">
                    <thead class="sticky top-0 z-10 text-white bg-gradient-to-br from-blue-800 to-blue-800 border-b-2 border-blue-900 whitespace-nowrap">
                        <tr>
                            <th rowspan="2" class="${cellPad} text-base sticky left-0 z-10 bg-blue-800">コード</th>
                            <th rowspan="2" class="${cellPad} text-base sticky left-14 z-10 bg-blue-800">銘柄名</th>
                            ${dates.map((date) => html`<th colspan="2" class="${cellPad} text-sm pt-3.5 pb-2.5">${date}</th>`)}
                        </tr>
                        <tr>
                            ${dates.map(
                                () => html`
                                    <th class="${cellPad} py-2 text-sm">変化率</th>
                                    <th class="${cellPad} py-2 text-sm">売買数</th>
                                `
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        ${stocks.map(
                            (stock) => html`
                                <tr class="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50">
                                    <td class="${cellPad} text-blue-800 text-center bg-white sticky left-0 z-[5]">${stock.code}</td>
                                    <td class="${cellPad} bg-white sticky left-14 z-[5] whitespace-nowrap">${stock.name}</td>
                                    ${dates.map((date) => {
                                        const itemData = dataMap.get(`${stock.code}_${date}`);
                                        if (!itemData) {
                                            return html`
                                                <td class="${cellPad} py-3 text-right">-</td>
                                                <td class="${cellPad} py-3 text-right">-</td>
                                            `;
                                        }

                                        const ratioVal = parseFloat(itemData.ratio) || 0;
                                        const ratioText = ratioVal.toFixed(2);
                                        const ratioClass = ratioVal > 0 ? 'text-green-600 font-semibold' : ratioVal < 0 ? 'text-red-600 font-semibold' : '';

                                        const quantityText = itemData.quantity ? Number(itemData.quantity).toLocaleString() : '-';

                                        return html`
                                            <td class="${cellPad} py-3 text-right ${ratioClass}">${ratioText}%</td>
                                            <td class="${cellPad} py-3 text-right">${quantityText}</td>
                                        `;
                                    })}
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
            </div>
            <p class="mt-2 text-xs text-gray-500">※ 変化率は基本的に「該当日終値/現在価格」ですが、売買があった日は「売買価格/現在価格」で計算</p>
        </div>
    `;
}
