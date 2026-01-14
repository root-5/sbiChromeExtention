// =======================================
// 全口座ポートフォリオコンポーネント
// =======================================

import { html } from '../utils/preact-adapter.js';

export function PortfolioAllComp({ accountViewData }) {
    const { summaryData, tableRows } = accountViewData;
    const { netTotalMarketCap, totalMarketCap, leverage, buyingPower } = summaryData;

    // 損益の色分け用ヘルパー
    const getProfitClass = (val) => {
        if (val > 0) return 'text-green-600 font-bold'; // 日本の株習慣ではプラスは赤が多いが、元のCSSに合わせて調整
        if (val < 0) return 'text-red-500 font-bold';
        return 'text-gray-800';
    };

    const cellPad = 'p-3 max-md:p-2.5 max-sm:p-2';

    return html`
        <div class="pt-5 max-sm:p-2.5 max-sm:overflow-x-auto flex flex-col gap-6">
            <div class="flex justify-start gap-8">
                <div>
                    <h2 class="mb-1.5 text-green-800 text-lg font-semibold">サマリー</h2>
                    <table class="border-collapse bg-white shadow-md rounded-md overflow-hidden align-middle w-fit">
                        <thead class="text-white bg-gradient-to-br from-green-800 to-green-800 border-b-2 border-green-900 whitespace-nowrap">
                            <tr>
                                <th class="${cellPad}">純資産</th>
                                <th class="${cellPad}">総資産</th>
                                <th class="${cellPad}">レバレッジ</th>
                                <th class="${cellPad}">買付余力</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50">
                                <td class="${cellPad} text-right">${netTotalMarketCap}</td>
                                <td class="${cellPad} text-right">${totalMarketCap}</td>
                                <td class="${cellPad} text-right">${leverage}倍</td>
                                <td class="${cellPad} text-right">${buyingPower}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h2 class="mb-1.5 text-green-800 text-lg font-semibold">ポートフォリオ一覧</h2>
                <div class="overflow-x-auto shadow-md rounded-md">
                    <table class="w-full border-collapse bg-white text-sm whitespace-nowrap">
                        <thead class="text-white bg-gradient-to-br from-green-800 to-green-800 border-b-2 border-green-900">
                            <tr>
                                <th class="${cellPad} text-left">銘柄</th>
                                <th class="${cellPad} text-right">現在値(円)</th>
                                <th class="${cellPad} text-right">保有数</th>
                                <th class="${cellPad} text-right">評価額(円)</th>
                                <th class="${cellPad} text-right">損益(円)</th>
                                <th class="${cellPad} text-right">損益率</th>
                                <th class="${cellPad} text-center">区分</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows.map((stock) => {
                                const profitClass = getProfitClass(stock.profitLoss);
                                const isIdeco = stock.depositType === 'iDeCo';

                                return html`
                                    <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                        <td class="${cellPad} text-left font-bold text-gray-700">
                                            <div class="flex flex-col">
                                                <span>${stock.name}</span>
                                                <span class="text-xs text-gray-400 font-normal">${stock.code !== '-' ? stock.code : ''}</span>
                                            </div>
                                        </td>
                                        <td class="${cellPad} text-right">${stock.price ? Math.floor(stock.price).toLocaleString() : '-'}</td>
                                        <td class="${cellPad} text-right">${stock.quantity ? stock.quantity.toLocaleString() : '-'}</td>
                                        <td class="${cellPad} text-right font-medium">${Math.floor(stock.marketCap).toLocaleString()}</td>
                                        <td class="${cellPad} text-right ${profitClass}">${Math.floor(stock.profitLoss).toLocaleString()}</td>
                                        <td class="${cellPad} text-right ${profitClass}">${stock.profitLossRate.toFixed(2)}%</td>
                                        <td class="${cellPad} text-center">
                                            <span
                                                class="px-2 py-1 rounded text-xs ${stock.currencyType === '外貨建'
                                                    ? 'bg-orange-100 text-orange-800'
                                                    : isIdeco
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-blue-100 text-blue-800'}"
                                            >
                                                ${stock.depositType}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            })}
                        </tbody>
                    </table>
                </div>
                <p class="mt-2 text-xs text-gray-500">※ 銀行預金、ビットコインは含まれていません</p>
            </div>
        </div>
    `;
}
