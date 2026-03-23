// =======================================
// ポートフォリオコンポーネント
// =======================================

import { html } from '../utils/preact-adapter.js';

export function PortfolioComp({ accountViewData }) {
    const { summaryData, leverageRows, tableRows, classData } = accountViewData;
    const { netTotalMarketCap, totalMarketCap, leverage, buyingPower, totalProfit } = summaryData;
    const { totalProfit: totalProfitClass } = classData;

    // Helper for cell padding
    const cellPad = 'p-2.5';

    return html`
        <div class="flex flex-row gap-8">
            <div>
                <h2 class="lg:mb-1.5 text-blue-800 text-lg font-semibold">サマリー</h2>
                <table class="border-collapse bg-white shadow-md rounded-md overflow-hidden align-middle w-fit">
                    <thead class="text-white bg-gradient-to-br from-blue-800 to-blue-800 border-t-2 border-blue-900 whitespace-nowrap">
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
                            <td class="${cellPad} text-right">${leverage}</td>
                            <td class="${cellPad} text-right">${buyingPower}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="hidden sm:block">
                <h2 class="lg:mb-1.5 text-blue-800 text-lg font-semibold">レバレッジ管理</h2>
                <table class="border-collapse bg-white shadow-md rounded-md overflow-hidden align-middle w-fit">
                    <thead class="text-white bg-gradient-to-br from-blue-800 to-blue-800 border-t-2 border-blue-900 whitespace-nowrap">
                        <tr>
                            <th class="${cellPad}">基準</th>
                            <th class="${cellPad}">差額</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leverageRows.map(
                            (item) => html`
                                <tr class="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50">
                                    <td class="${cellPad}">${item.label}</td>
                                    <td class="${cellPad} text-right">${item.diff}</td>
                                </tr>
                            `,
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="w-full">
            <h2 class="mt-8 lg:mb-1.5 text-blue-800 text-lg font-semibold">ポートフォリオ</h2>
            <div class="shadow-md rounded-md overflow-hidden overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <table class="border-collapse bg-white align-middle w-full">
                    <thead class="text-white bg-gradient-to-br from-blue-800 to-blue-800 border-t-2 border-blue-900 whitespace-nowrap">
                        <tr>
                            <th class="${cellPad}">コード</th>
                            <th class="${cellPad}">銘柄名</th>
                            <th class="${cellPad}">株数</th>
                            <th class="${cellPad}">取得価格</th>
                            <th class="${cellPad}">現在価格</th>
                            <th class="${cellPad}">前日比</th>
                            <th class="${cellPad}">損益</th>
                            <th class="${cellPad}">時価総額</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows.map((item) => {
                            const dayChangeClass = String(item.dayChangeDiff).startsWith('+') ? 'text-green-600' : String(item.dayChangeDiff).startsWith('-') ? 'text-red-600' : '';
                            const profitClass = String(item.profitAndLossDiff).startsWith('+') ? 'text-green-600' : String(item.profitAndLossDiff).startsWith('-') ? 'text-red-600' : '';
                            const rowClass = item.name === '調整後現金' ? 'bg-gray-50 italic text-gray-500' : '';

                            return html`
                                <tr class="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50 ${rowClass}">
                                    <td class="${cellPad} text-blue-800 text-center">${item.code}</td>
                                    <td class="${cellPad}">${item.name}</td>
                                    <td class="${cellPad} text-right">${item.quantity}</td>
                                    <td class="${cellPad} text-right">${item.buyPrice}</td>
                                    <td class="${cellPad} text-right">${item.currentPrice}</td>
                                    <td class="${cellPad} text-right font-semibold whitespace-nowrap">
                                        <span class="inline-block w-16 text-right ${dayChangeClass}">${item.dayChangeRate}</span><span class="text-xs ml-1 ${dayChangeClass}">%</span>
                                    </td>
                                    <td class="${cellPad} text-right font-semibold">
                                        <span class="${profitClass}">${item.profitAndLossDiff}</span>
                                    </td>
                                    <td class="${cellPad} text-right">${item.marketCap}</td>
                                </tr>
                            `;
                        })}
                    </tbody>
                    <tfoot class="bg-gray-50 border-t-2 border-blue-800">
                        <tr>
                            <td colspan="6" class="font-bold p-3 text-blue-800">合計</td>
                            <td class="${cellPad} font-bold text-blue-800 text-right ${totalProfitClass === 'positive' ? 'text-green-600' : totalProfitClass === 'negative' ? 'text-red-600' : ''}">
                                ${totalProfit}
                            </td>
                            <td class="${cellPad} font-bold text-blue-800 text-right">${totalMarketCap}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}
