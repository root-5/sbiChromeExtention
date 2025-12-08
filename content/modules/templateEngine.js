/**
 * ==============================================================
 * TemplateEngine クラス
 * HTMLテンプレートの読み込みとデータバインディングを担当
 * ==============================================================
 */
class TemplateEngine {
    /**
     * テンプレートHTMLを読み込んで指定された親要素の後ろに挿入する関数
     * @param {string} targetElementID 挿入先の親要素のID
     * @param {string} templatePath テンプレートファイルのパス
     */
    static async setTemplate(targetElementID, templatePath) {
        const url = chrome.runtime.getURL(templatePath);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`テンプレート読み込みエラー: ${response.status}`);
        const templateHTML = await response.text();

        const parentElement = document.getElementById(targetElementID);
        if (!parentElement) throw new Error(`親要素が見つかりません: ${targetElementID}`);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = templateHTML;
        parentElement.insertAdjacentElement('afterend', tempDiv);
    }

    /**
     * テキストコンテントを data-bind 属性に基づいて動的に設定する関数
     * @param {Object} data バインドするデータオブジェクト（例：{ bindTarget: textContent }）
     */
    static bindData(data) {
        Object.entries(data).forEach(([key, value]) => {
            document.querySelectorAll(`[data-bind="${key}"]`).forEach((element) => {
                element.textContent = value;
            });
        });
    }

    /**
     * クラス名を data-bind 属性に基づいて動的に設定する関数
     * @param {Object} data バインドするデータオブジェクト(例：{ bindTarget: className }）
     */
    static bindClass(data) {
        Object.entries(data).forEach(([key, value]) => {
            document.querySelectorAll(`[data-bind="${key}"]`).forEach((element) => {
                element.className = value;
            });
        });
    }

    /**
     * 時刻表示を更新する関数
     * @param {string} target data-bind属性のターゲット名
     */
    static updateTime(target) {
        const now = new Date();
        TemplateEngine.bindData({
            [target]: now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
    }

    /**
     * テーブル行のデータバインディング
     * @param {string} targetTableRowName ターゲットのテーブル行の data-bind 名
     * @param {Array} tableTextData バインドするデータオブジェクト配列（例：[ { bindTarget: textContent }, ...]）
     */
    static bindTableRows(targetTableRowName, tableTextData) {
        const rowElements = document.querySelectorAll(`[data-bind="${targetTableRowName}"]`);
        const parentElement = rowElements[0].parentElement;

        // データ数に応じて行を削除・追加
        if (rowElements.length > tableTextData.length) {
            for (let i = tableTextData.length; i < rowElements.length; i++) rowElements[i].remove();
        } else if (rowElements.length < tableTextData.length) {
            for (let i = rowElements.length; i < tableTextData.length; i++) {
                parentElement.appendChild(rowElements[0].cloneNode(true));
            }
        }

        // 更新後の行要素を再取得してデータをバインド
        const updatedRowElements = document.querySelectorAll(`[data-bind="${targetTableRowName}"]`);
        tableTextData.forEach((rowData, i) => {
            const targetRow = updatedRowElements[i];
            const boundKeys = new Set(Object.keys(rowData));

            // 各キーの値をバインド
            Object.entries(rowData).forEach(([key, value]) => {
                const cell = targetRow.querySelector(`[data-bind="${key}"]`);
                if (!cell) return;

                cell.textContent = value ?? '';
                cell.classList.remove('positive', 'negative');

                // "+"や"-"のクラスを設定（CSSの色分け用）
                const text = String(value);
                if (text.startsWith('+') || text.startsWith('買')) cell.classList.add('positive');
                else if (text.startsWith('-') || text.startsWith('売')) cell.classList.add('negative');
            });

            // 今回バインドされなかった要素は既存値をクリア
            targetRow.querySelectorAll('[data-bind]').forEach((element) => {
                const bindKey = element.getAttribute('data-bind');
                if (bindKey === targetTableRowName || boundKeys.has(bindKey)) return;

                // 子要素に data-bind がある場合はクリアしない
                if (element.querySelector('[data-bind]')) return;
                element.textContent = '';
                element.classList.remove('positive', 'negative');
            });
        });
    }

    /**
     * ピボットテーブル（横軸: 日付、縦軸: 銘柄）を描画する関数
     * @param {Array<{date: string, ratioAndQuantity: Array}>} pivotData 日付ごとの銘柄データ
     */
    static bindPivotTable(pivotData) {
        const dates = pivotData.map((d) => d.date);

        // 全銘柄をユニークに抽出（code順でソート）
        const stockMap = new Map();
        pivotData.forEach((day) => {
            day.ratioAndQuantity.forEach((item) => {
                if (!stockMap.has(item.code)) stockMap.set(item.code, item.name);
            });
        });
        const stocks = Array.from(stockMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([code, name]) => ({ code, name }));

        // 日付×銘柄のデータをマップ化（高速参照用）
        const dataMap = new Map();
        pivotData.forEach((day) => {
            day.ratioAndQuantity.forEach((item) => {
                dataMap.set(`${day.date}_${item.code}`, item);
            });
        });

        /**
         * 指定セレクタの要素を最初の1つ（テンプレート）だけ残して削除するヘルパー関数
         * @param {Element} parent 親要素
         * @param {string} selector CSSセレクタ
         */
        const clearDynamicElements = (parent, selector) => {
            const elements = parent.querySelectorAll(selector);
            for (let i = elements.length - 1; i > 0; i--) {
                elements[i].remove();
            }
        };

        // ヘッダー行のテンプレート要素を取得
        const headerRow = document.querySelector('[data-bind="priceChangeHeaderRow"]');
        const subHeaderRow = document.querySelector('[data-bind="priceChangeSubHeaderRow"]');
        const dateHeaderTemplate = headerRow.querySelector('[data-bind="dateHeader"]');
        const ratioHeaderTemplate = subHeaderRow.querySelector('[data-bind="ratioHeader"]');
        const quantityHeaderTemplate = subHeaderRow.querySelector('[data-bind="quantityHeader"]');

        // 既存の動的列をクリア
        clearDynamicElements(headerRow, '[data-bind="dateHeader"]');
        clearDynamicElements(subHeaderRow, '[data-bind="ratioHeader"]');
        clearDynamicElements(subHeaderRow, '[data-bind="quantityHeader"]');

        // 日付数分のヘッダーを複製・バインド
        dates.forEach((date, i) => {
            const dateHeader = i === 0 ? dateHeaderTemplate : dateHeaderTemplate.cloneNode(true);
            dateHeader.textContent = date.slice(5); // MM/DD形式
            if (i > 0) headerRow.appendChild(dateHeader);
            const ratioHeader = i === 0 ? ratioHeaderTemplate : ratioHeaderTemplate.cloneNode(true);
            if (i > 0) subHeaderRow.appendChild(ratioHeader);
            const quantityHeader = i === 0 ? quantityHeaderTemplate : quantityHeaderTemplate.cloneNode(true);
            if (i > 0) subHeaderRow.appendChild(quantityHeader);
        });

        // ボディ行のテンプレート要素を取得
        const templateRow = document.querySelector('[data-bind="priceChangeTableRow"]');
        const tbody = templateRow.parentElement;
        const ratioCellTemplate = templateRow.querySelector('[data-bind="ratio"]');
        const quantityCellTemplate = templateRow.querySelector('[data-bind="quantity"]');

        // 既存の行をクリア
        clearDynamicElements(tbody, '[data-bind="priceChangeTableRow"]');

        // 銘柄数分の行を生成
        stocks.forEach((stock, stockIndex) => {
            const row = stockIndex === 0 ? templateRow : templateRow.cloneNode(true);

            // 固定列（コード、銘柄名）をバインド
            row.querySelector('[data-bind="code"]').textContent = stock.code;
            row.querySelector('[data-bind="name"]').textContent = stock.name;

            // 既存の動的セルをクリア
            clearDynamicElements(row, '[data-bind="ratio"]');
            clearDynamicElements(row, '[data-bind="quantity"]');

            // この行における最初のセルを取得（dateIndex === 0 用）
            const firstRatioCell = row.querySelector('[data-bind="ratio"]');
            const firstQuantityCell = row.querySelector('[data-bind="quantity"]');

            // 各日付のデータセルを複製・バインド
            dates.forEach((date, dateIndex) => {
                const item = dataMap.get(`${date}_${stock.code}`);

                // 変化率セル
                const ratioCell = dateIndex === 0 ? firstRatioCell : ratioCellTemplate.cloneNode(true);
                ratioCell.textContent = '-';
                ratioCell.classList.remove('positive', 'negative');
                if (item && item.ratio != null && item.ratio !== 0) {
                    const ratioText = `${item.ratio >= 0 ? '+' : ''}${item.ratio.toFixed(2)}%`;
                    ratioCell.textContent = ratioText;
                    ratioCell.classList.add(item.ratio >= 0 ? 'positive' : 'negative');
                }
                if (dateIndex > 0) row.appendChild(ratioCell);

                // 売買数セル
                const quantityCell = dateIndex === 0 ? firstQuantityCell : quantityCellTemplate.cloneNode(true);
                quantityCell.textContent = '-';
                if (item && item.quantity != null && item.quantity !== 0) {
                    const quantityText = `${item.quantity >= 0 ? '+' : ''}${item.quantity.toLocaleString()}`;
                    quantityCell.textContent = quantityText;
                }
                if (dateIndex > 0) row.appendChild(quantityCell);
            });

            // テンプレート行以外は新規追加
            if (stockIndex > 0) {
                tbody.appendChild(row);
            }
        });
    }
}
