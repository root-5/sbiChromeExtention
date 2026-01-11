import { html } from '../utils/preact-adapter.js';

export function PriceChangeTable({ priceChangePivot }) {
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

    return html`
        <div id="priceChangeTableContainer">
            <h2>株価変化率と売買数</h2>
            <div class="table-wrapper">
                <table id="priceChangeTable">
                    <thead>
                        <tr>
                            <th rowspan="2" class="code-header">コード</th>
                            <th rowspan="2" class="name-header">銘柄名</th>
                            ${dates.map((date) => html`<th colspan="2" class="date-header">${date}</th>`)}
                        </tr>
                        <tr>
                            ${dates.map(
                                () => html`
                                    <th>変化率</th>
                                    <th>売買数</th>
                                `
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        ${stocks.map(
                            (stock) => html`
                                <tr>
                                    <td class="code">${stock.code}</td>
                                    <td class="name">${stock.name}</td>
                                    ${dates.map((date) => {
                                        const data = dataMap.get(`${stock.code}_${date}`);
                                        if (!data) {
                                            return html`
                                                <td class="changeRate">-</td>
                                                <td class="quantity">-</td>
                                            `;
                                        }

                                        const ratioVal = parseFloat(data.ratio) || 0;
                                        const ratioText = ratioVal.toFixed(2);
                                        const ratioClass = ratioVal > 0 ? 'positive' : ratioVal < 0 ? 'negative' : '';

                                        const quantityText = data.quantity ? Number(data.quantity).toLocaleString() : '-';

                                        return html`
                                            <td class=${'changeRate ' + ratioClass}>${ratioText}%</td>
                                            <td class="quantity">${quantityText}</td>
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
