// =======================================
// ポートフォリオコンポーネント
// =======================================

import { html } from '../utils/preact-adapter.js';

export function PortfolioComp({ accountViewData }) {
    const { summaryData, leverageRows, tableRows, classData } = accountViewData;
    const { netTotalMarketCap, totalMarketCap, leverage, buyingPower, totalProfit } = summaryData;
    const { totalProfit: totalProfitClass } = classData;

    // Helper for cell padding
    const cellPad = 'p-[0.8em_0.9em] max-[48em]:p-[0.7em_0.8em] max-[30em]:p-[0.6em_0.7em]';

    return html`
        <div id="jpyAccountSummaryContainer" class="pt-5 max-[30em]:p-[0.625em] max-[30em]:overflow-x-auto flex gap-8">
            <div>
                <h2 class="mb-2.5 text-[#0066cc] text-[1.2em] font-semibold">サマリー</h2>
                <table class="border-collapse bg-white shadow-[0_0.125em_0.5em_rgba(0,0,0,0.1)] align-middle w-fit">
                    <thead class="text-white bg-gradient-to-br from-[#0066cc] to-[#004499] border-b-[0.125em] border-[#003366] whitespace-nowrap">
                        <tr>
                            <th class="${cellPad}">純資産</th>
                            <th class="${cellPad}">総資産</th>
                            <th class="${cellPad}">レバレッジ</th>
                            <th class="${cellPad}">買付余力</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="border-b-[0.0625em] border-[#e9ecef] transition-colors duration-200 ease-in-out hover:bg-[#f8f9fa]">
                            <td class="${cellPad} text-right">${netTotalMarketCap}</td>
                            <td class="${cellPad} text-right">${totalMarketCap}</td>
                            <td class="${cellPad} text-right">${leverage}</td>
                            <td class="${cellPad} text-right">${buyingPower}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div>
                <h2 class="mb-2.5 text-[#0066cc] text-[1.2em] font-semibold">レバレッジ管理</h2>
                <table class="border-collapse bg-white shadow-[0_0.125em_0.5em_rgba(0,0,0,0.1)] align-middle w-fit">
                    <thead class="text-white bg-gradient-to-br from-[#0066cc] to-[#004499] border-b-[0.125em] border-[#003366] whitespace-nowrap">
                        <tr>
                            <th class="${cellPad}">基準</th>
                            <th class="${cellPad}">差額</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leverageRows.map(
                            (item) => html`
                                <tr class="border-b-[0.0625em] border-[#e9ecef] transition-colors duration-200 ease-in-out hover:bg-[#f8f9fa]">
                                    <td class="${cellPad}">${item.label}</td>
                                    <td class="${cellPad} text-right">${item.diff}</td>
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="jpyAccountTableContainer" class="pt-5 max-[30em]:p-[0.625em] max-[30em]:overflow-x-auto">
            <h2 class="mb-2.5 text-[#0066cc] text-[1.2em] font-semibold">ポートフォリオ</h2>
            <table class="border-collapse bg-white shadow-[0_0.125em_0.5em_rgba(0,0,0,0.1)] align-middle w-full">
                <thead class="text-white bg-gradient-to-br from-[#0066cc] to-[#004499] border-b-[0.125em] border-[#003366] whitespace-nowrap">
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
                        const dayChangeClass = String(item.dayChangeDiff).startsWith('+') ? 'text-[#28a745]' : String(item.dayChangeDiff).startsWith('-') ? 'text-[#dc3545]' : '';
                        const profitClass = String(item.profitAndLossDiff).startsWith('+') ? 'text-[#28a745]' : String(item.profitAndLossDiff).startsWith('-') ? 'text-[#dc3545]' : '';
                        const rowClass = item.name === '調整後現金' ? 'bg-[#fdfdfd] italic text-[#666]' : '';

                        return html`
                            <tr class="border-b-[0.0625em] border-[#e9ecef] transition-colors duration-200 ease-in-out hover:bg-[#f8f9fa] ${rowClass}">
                                <td class="${cellPad} text-[#0066cc] text-center">${item.code}</td>
                                <td class="${cellPad}">${item.name}</td>
                                <td class="${cellPad} text-right">${item.quantity}</td>
                                <td class="${cellPad} text-right">${item.buyPrice}</td>
                                <td class="${cellPad} text-right">${item.currentPrice}</td>
                                <td class="${cellPad} text-right font-semibold">
                                    <span class="inline-block w-[4em] text-right ${dayChangeClass}">${item.dayChangeRate}</span>
                                    <span class="text-[0.7em] ml-[0.2em] ${dayChangeClass}">%</span>
                                </td>
                                <td class="${cellPad} text-right font-semibold">
                                    <span class="${profitClass}">${item.profitAndLossDiff}</span>
                                </td>
                                <td class="${cellPad} text-right">${item.marketCap}</td>
                            </tr>
                        `;
                    })}
                </tbody>
                <tfoot class="bg-[#f8f9fa] border-t-[0.125em] border-[#0066cc]">
                    <tr class="totalRow">
                        <td colspan="6" class="font-bold p-[0.75em_0.875em] text-[#0066cc]">合計</td>
                        <td class="${cellPad} font-bold text-[#0066cc] text-right ${totalProfitClass === 'positive' ? 'text-[#28a745]' : totalProfitClass === 'negative' ? 'text-[#dc3545]' : ''}">
                            ${totalProfit}
                        </td>
                        <td class="${cellPad} font-bold text-[#0066cc] text-right">${totalMarketCap}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}
