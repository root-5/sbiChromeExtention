// =======================================
// ポートフォリオコンポーネント
// =======================================

import { html } from '../utils/preact-adapter.js';

export function PortfolioComp({ accountViewData, isAllAccountMode }) {
    const { summaryData, leverageRows, tableRows } = accountViewData;
    const { netTotalMarketCap, totalMarketCap, leverage, buyingPower, totalProfit, totalProfitValue } = summaryData;

    // テーマカラーと共通クラス
    const themeColor = isAllAccountMode ? 'green' : 'blue';
    const cellClass = 'p-2.5';
    const cellValueClass = 'p-2.5 text-right';

    // 損益の色分けクラスを返す関数
    const getColorClass = (val) => {
        if (val > 0) return 'font-bold text-green-600';
        if (val < 0) return 'font-bold text-red-600';
        return 'font-bold';
    };

    // 区分の色分けクラスを返す関数
    const getDepositTypeClass = (row) => {
        if (row.currencyType === '外貨建') return 'bg-orange-100 text-orange-800';
        if (row.depositType === 'iDeCo') return 'bg-purple-100 text-purple-800';
        return 'bg-blue-100 text-blue-800';
    };

    return html`
        <div class="w-full">
            <div class="flex flex-row gap-8">
                <div>
                    <h2 class="lg:mb-1.5 text-${themeColor}-800 text-lg font-semibold">サマリー</h2>
                    <table class="border-collapse bg-white shadow-md rounded-md overflow-hidden align-middle w-fit">
                        <thead class="text-white bg-gradient-to-br from-${themeColor}-800 to-${themeColor}-800 border-t-2 border-${themeColor}-900 whitespace-nowrap">
                            <tr>
                                <th class="${cellClass}">純資産</th>
                                <th class="${cellClass}">総資産</th>
                                <th class="${cellClass}">レバレッジ</th>
                                <th class="${cellClass}">買付余力</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50">
                                <td class="${cellValueClass}">${netTotalMarketCap}</td>
                                <td class="${cellValueClass}">${totalMarketCap}</td>
                                <td class="${cellValueClass}">${leverage}</td>
                                <td class="${cellValueClass}">${buyingPower}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="hidden sm:block">
                    <h2 class="lg:mb-1.5 text-${themeColor}-800 text-lg font-semibold">レバレッジ管理</h2>
                    <table class="border-collapse bg-white shadow-md rounded-md overflow-hidden align-middle w-fit">
                        <thead class="text-white bg-gradient-to-br from-${themeColor}-800 to-${themeColor}-800 border-t-2 border-${themeColor}-900 whitespace-nowrap">
                            <tr>
                                <th class="${cellClass}">基準</th>
                                <th class="${cellClass}">差額</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${leverageRows.map(
                                (item) => html`
                                    <tr class="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50">
                                        <td class="${cellClass}">${item.label}</td>
                                        <td class="${cellValueClass}">${item.diffText}</td>
                                    </tr>
                                `,
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="w-full mt-8">
                <h2 class="lg:mb-1.5 text-${themeColor}-800 text-lg font-semibold">ポートフォリオ</h2>
                <div class="shadow-md rounded-md overflow-hidden overflow-x-auto">
                    <table class="w-full border-collapse bg-white align-middle text-sm whitespace-nowrap">
                        <thead class="text-white bg-gradient-to-br from-${themeColor}-800 to-${themeColor}-800 border-t-2 border-${themeColor}-900">
                            ${isAllAccountMode
                                ? html`
                                      <tr>
                                          <th class="${cellClass}">区分</th>
                                          <th class="${cellClass}">銘柄名</th>
                                          <th class="${cellClass}">株数</th>
                                          <th class="${cellClass}">現在値</th>
                                          <th class="${cellClass}">損益率</th>
                                          <th class="${cellClass}">損益</th>
                                          <th class="${cellClass}">時価総額</th>
                                      </tr>
                                  `
                                : html`
                                      <tr>
                                          <th class="${cellClass} hidden lg:table-cell">コード</th>
                                          <th class="${cellClass}">銘柄名</th>
                                          <th class="${cellClass}">株数</th>
                                          <th class="${cellClass}">取得価格</th>
                                          <th class="${cellClass}">現在価格</th>
                                          <th class="${cellClass}">前日比</th>
                                          <th class="${cellClass}">損益</th>
                                          <th class="${cellClass}">時価総額</th>
                                      </tr>
                                  `}
                        </thead>
                        <tbody>
                            ${isAllAccountMode
                                ? tableRows.map((row) => {
                                      return html`
                                          <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                              <td class="${cellClass} text-center">
                                                  <span class="px-2 py-1 rounded text-xs ${getDepositTypeClass(row)}"> ${row.depositType} </span>
                                              </td>
                                              <td class="${cellClass} text-left font-bold text-gray-700">
                                                  <div class="flex flex-col">
                                                      <span>${row.name}</span>
                                                      <span class="text-xs text-gray-400 font-normal">${row.code !== '-' ? row.code : ''}</span>
                                                  </div>
                                              </td>
                                              <td class="${cellValueClass}">${row.quantity ? row.quantity.toLocaleString() : '-'}</td>
                                              <td class="${cellValueClass}">${row.currentPrice ? Math.floor(row.currentPrice).toLocaleString() : '-'}</td>
                                              <td class="${cellValueClass} ${getColorClass(row.profitRate)}">${row.profitRate.toFixed(2)}%</td>
                                              <td class="${cellValueClass} ${getColorClass(row.profitAndLoss)}">${Math.floor(row.profitAndLoss).toLocaleString()}</td>
                                              <td class="${cellValueClass} font-medium">${Math.floor(row.marketCap).toLocaleString()}</td>
                                          </tr>
                                      `;
                                  })
                                : tableRows.map((row) => {
                                      return html`
                                          <tr class="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50">
                                              <td class="${cellClass} text-${themeColor}-800 text-center hidden lg:table-cell">
                                                  <a href="https://sbi.ifis.co.jp/index.php?Param1=report_performance&stock_sec_code_mul=${row.code}" target="_blank">${row.code}</a>
                                              </td>
                                              <td class="${cellClass}">${row.name}</td>
                                              <td class="${cellValueClass}">${row.quantity ? row.quantity.toLocaleString() : '-'}</td>
                                              <td class="${cellValueClass}">${row.buyPrice ? Math.floor(row.buyPrice).toLocaleString() : '-'}</td>
                                              <td class="${cellValueClass}">${row.currentPrice ? Math.floor(row.currentPrice).toLocaleString() : '-'}</td>
                                              <td class="${cellValueClass} ${getColorClass(row.dayChange)}">${row.dayChangeRate.toFixed(2)}%</td>
                                              <td class="${cellValueClass} ${getColorClass(row.profitAndLoss)}">${Math.floor(row.profitAndLoss).toLocaleString()}</td>
                                              <td class="${cellValueClass}">${Math.floor(row.marketCap).toLocaleString()}</td>
                                          </tr>
                                      `;
                                  })}
                        </tbody>
                        <tfoot class="bg-gray-50 border-t-2 border-${themeColor}-800">
                            <tr>
                                <td colspan="1" class="hidden lg:table-cell"></td>
                                <td colspan="${isAllAccountMode ? 4 : 5}" class="font-bold p-3 text-${themeColor}-800">合計</td>
                                <td class="${cellValueClass} text-right ${getColorClass(totalProfitValue)}">${totalProfit}</td>
                                <td class="${cellValueClass} text-right">${totalMarketCap}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <p class="mt-2 text-xs text-gray-500">※ 銀行預金、ビットコインは含まれていません</p>
            </div>
        </div>
    `;
}
