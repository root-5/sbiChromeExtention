// =======================================
// 取引履歴コンポーネント
// =======================================

import { html } from '../utils/preact-adapter.js';

/**
 * 取引行を一意に識別するキーを生成する関数
 * @param {Object} trade - 取引データオブジェクト
 * @returns {string} 取引キー文字列
 */
function getTradeKey(trade) {
    // 日付は YYYYMMDD に正規化し、localStorage の有効期限チェックと形式を一致させている
    const normalizedDate = String(trade.date || '').replace(/\D/g, '');
    return `${normalizedDate}_${trade.code}_${trade.tradeType}_${trade.price.replace(/,/g, '')}_${trade.quantity}`;
}

/**
 * 取引履歴コンポーネント。
 * uncheckedTradeKeys に含まれる取引はチェックが外れた状態で表示される。
 * チェック状態を変更すると onToggleTrade が呼ばれる。
 * @param {Array}  tradingLog          - 取引履歴の配列
 * @param {Set}    uncheckedTradeKeys  - チェックが外れている取引キーの Set
 * @param {Function} onToggleTrade     - チェック状態変更時のコールバック (key: string) => void
 */
export function TradingLogComp({ tradingLog, uncheckedTradeKeys, onToggleTrade }) {
    const cellPad = 'p-2.5 whitespace-nowrap';

    return html`
        <div class="w-full lg:w-fit mt-8">
            <h2 class="lg:mb-1.5 text-blue-800 text-lg font-semibold">取引履歴</h2>
            <div class="w-fit lg:w-fit max-w-full max-h-96 overflow-y-auto shadow-md rounded-md overflow-hidden">
                <table class="border-collapse bg-white align-middle w-auto">
                    <thead class="sticky top-0 z-10 text-white bg-gradient-to-br from-blue-800 to-blue-800 border-t-2 border-blue-900">
                        <tr>
                            <th class="${cellPad}"></th>
                            <th class="${cellPad}">日付</th>
                            <th class="${cellPad} hidden lg:table-cell">コード</th>
                            <th class="${cellPad}">銘柄名</th>
                            <th class="${cellPad}">取引</th>
                            <th class="${cellPad}">株数</th>
                            <th class="${cellPad}">価格</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tradingLog.map((item) => {
                            const key = getTradeKey(item);
                            const isChecked = !uncheckedTradeKeys.has(key);
                            const tradeTypeClass = item.tradeType && item.tradeType.includes('買') ? 'text-green-600' : item.tradeType && item.tradeType.includes('売') ? 'text-red-600' : '';
                            return html`
                                <tr
                                    onClick=${() => onToggleTrade(key)}
                                    class="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50"
                                >
                                    <td class="${cellPad} text-center">
                                        <input
                                            type="checkbox"
                                            checked=${isChecked}
                                            class="cursor-pointer accent-blue-700"
                                        />
                                    </td>
                                    <td class="${cellPad}">${item.date}</td>
                                    <td class="${cellPad} text-blue-800 text-center hidden lg:table-cell">${item.code}</td>
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
