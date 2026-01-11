// =======================================
// ポートフォリオコンポーネント
// =======================================

import { html } from '../utils/preact-adapter.js';

export function PortfolioComp({ accountViewData }) {
    const { summaryData, leverageRows, tableRows, classData } = accountViewData;
    const { netTotalMarketCap, totalMarketCap, leverage, buyingPower, totalProfit } = summaryData;
    const { totalProfit: totalProfitClass } = classData;

    // Helper for cell padding
    const cellPad = 'p-3 max-md:p-2.5 max-sm:p-2';

    return html`
        <div id="jpyAccountSummaryContainer" class="pt-5 max-sm:p-2.5 max-sm:overflow-x-auto flex gap-8">
            <div>
                <h2 class="mb-2.5 text-blue-600 text-xl font-semibold">サマリー</h2>
                <table class="border-collapse bg-white shadow-sm align-middle w-fit">
                    <thead class="text-white bg-gradient-to-br from-blue-600 to-blue-800 border-b-2 border-blue-900 whitespace-nowrap">
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
            <div>
                <h2 class="mb-2.5 text-blue-600 text-xl font-semibold">レバレッジ管理</h2>
                <table class="border-collapse bg-white shadow-sm align-middle w-fit">
                    <thead class="text-white bg-gradient-to-br from-blue-600 to-blue-800 border-b-2 border-blue-900 whitespace-nowrap">
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
                            `
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="jpyAccountTableContainer" class="pt-5 max-sm:p-2.5 max-sm:overflow-x-auto">
            <h2 class="mb-2.5 text-blue-600 text-xl font-semibold">ポートフォリオ</h2>
            <table class="border-collapse bg-white shadow-sm align-middle w-full">
                <thead class="text-white bg-gradient-to-br from-blue-600 to-blue-800 border-b-2 border-blue-900 whitespace-nowrap">
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
                                <td class="${cellPad} text-blue-600 text-center">${item.code}</td>
                                <td class="${cellPad}">${item.name}</td>
                                <td class="${cellPad} text-right">${item.quantity}</td>
                                <td class="${cellPad} text-right">${item.buyPrice}</td>
                                <td class="${cellPad} text-right">${item.currentPrice}</td>
                                <td class="${cellPad} text-right font-semibold">
                                    <span class="inline-block w-16 text-right ${dayChangeClass}">${item.dayChangeRate}</span>
                                    <span class="text-xs ml-1 ${dayChangeClass}">%</span>
                                </td>
                                <td class="${cellPad} text-right font-semibold">
                                    <span class="${profitClass}">${item.profitAndLossDiff}</span>
                                </td>
                                <td class="${cellPad} text-right">${item.marketCap}</td>
                            </tr>
                        `;
                    })}
                </tbody>
                <tfoot class="bg-gray-50 border-t-2 border-blue-600">
                    <tr class="totalRow">
                        <td colspan="6" class="font-bold p-3 text-blue-600">合計</td>
                        <td class="${cellPad} font-bold text-blue-600 text-right ${totalProfitClass === 'positive' ? 'text-green-600' : totalProfitClass === 'negative' ? 'text-red-600' : ''}">
                            ${totalProfit}
                        </td>
                        <td class="${cellPad} font-bold text-blue-600 text-right">${totalMarketCap}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}
