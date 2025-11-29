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
        try {
            // テンプレートファイルをフェッチ
            const url = chrome.runtime.getURL(templatePath);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`テンプレート読み込みエラー: ${response.status}`);
            }
            const templateHTML = await response.text();

            // 指定された親要素の後ろにテンプレートを挿入
            const parentElement = document.getElementById(targetElementID);
            if (!parentElement) {
                console.error(`親要素が見つかりません: ${targetElementID}`);
                return;
            }
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = templateHTML;
            parentElement.insertAdjacentElement('afterend', tempDiv);
        } catch (error) {
            console.error('テンプレート読み込み失敗:', error);
            throw error;
        }
    }

    /**
     * テキストコンテントを data-bind 属性に基づいて動的に設定する関数
     * @param {Object} data バインドするデータオブジェクト（例：{ bindTarget: textContent }）
     */
    static bindData(data) {
        Object.keys(data).forEach((key) => {
            const elements = document.querySelectorAll(`[data-bind="${key}"]`);
            elements.forEach((element) => {
                element.textContent = data[key];
            });
        });
    }

    /**
     * クラス名を data-bind 属性に基づいて動的に設定する関数
     * @param {Object} data バインドするデータオブジェクト(例：{ bindTarget: className }）
     */
    static bindClass(data) {
        Object.keys(data).forEach((key) => {
            const elements = document.querySelectorAll(`[data-bind="${key}"]`);
            elements.forEach((element) => {
                element.className = data[key];
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

        // データ数に応じて各テーブルに行を削除・追加
        if (rowElements.length > tableTextData.length) {
            for (let i = tableTextData.length; i < rowElements.length; i++) {
                rowElements[i].remove();
            }
        } else if (rowElements.length < tableTextData.length) {
            const templateRow = rowElements[0];
            for (let i = rowElements.length; i < tableTextData.length; i++) {
                parentElement.appendChild(templateRow.cloneNode(true));
            }
        }

        // 更新後の行要素を再取得してデータをバインド
        const updatedRowElements = document.querySelectorAll(`[data-bind="${targetTableRowName}"]`);
        tableTextData.forEach((rowData, i) => {
            const targetRow = updatedRowElements[i];
            const boundKeys = new Set(Object.keys(rowData));

            Object.keys(rowData).forEach((key) => {
                const cell = targetRow.querySelector(`[data-bind="${key}"]`);
                if (!cell) return;
                cell.textContent = rowData[key] ?? '';
                cell.classList.remove('positive', 'negative');

                // "+"や"-"のクラスを設定（CSSの色分け用）
                const textValue = String(rowData[key]);
                if (textValue.startsWith('+') || textValue.startsWith('買')) {
                    cell.classList.add('positive');
                } else if (textValue.startsWith('-') || textValue.startsWith('売')) {
                    cell.classList.add('negative');
                }
            });

            // 今回バインドされなかった要素は既存値をクリア
            targetRow.querySelectorAll('[data-bind]').forEach((element) => {
                const bindKey = element.getAttribute('data-bind');
                if (bindKey === targetTableRowName) return;
                if (boundKeys.has(bindKey)) return;

                // 子要素にさらに data-bind がある場合は親要素をクリアしない
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
        // 日付リストを取得（データの順序を維持）
        const dates = pivotData.map((d) => d.date);

        // 全銘柄をユニークに抽出（code順でソート）
        const stockMap = new Map();
        pivotData.forEach((dayData) => {
            dayData.ratioAndQuantity.forEach((item) => {
                if (!stockMap.has(item.code)) {
                    stockMap.set(item.code, item.name);
                }
            });
        });
        const stocks = Array.from(stockMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([code, name]) => ({ code, name }));

        // 日付×銘柄のデータをマップ化（高速参照用）
        const dataMap = new Map();
        pivotData.forEach((dayData) => {
            dayData.ratioAndQuantity.forEach((item) => {
                dataMap.set(`${dayData.date}_${item.code}`, item);
            });
        });

        // ヘッダー行に日付列を追加
        const headerRow = document.querySelector('[data-bind="priceChangeHeaderRow"]');
        const subHeaderRow = document.querySelector('[data-bind="priceChangeSubHeaderRow"]');

        // 既存の動的列をクリア（固定列のみ残す）
        headerRow.querySelectorAll('.date-header').forEach((el) => el.remove());
        subHeaderRow.innerHTML = '';

        // 日付列ヘッダーを追加
        dates.forEach((date) => {
            const th = document.createElement('th');
            th.setAttribute('colspan', '2');
            th.className = 'date-header';
            th.textContent = date.slice(5); // MM/DD形式で表示
            headerRow.appendChild(th);

            const thRatio = document.createElement('th');
            thRatio.textContent = '変化率';
            subHeaderRow.appendChild(thRatio);

            const thQuantity = document.createElement('th');
            thQuantity.textContent = '売買数';
            subHeaderRow.appendChild(thQuantity);
        });

        // ボディ行をテンプレートから複製してデータをバインド
        const templateRow = document.querySelector('[data-bind="priceChangeTableRow"]');
        const tbody = templateRow.parentElement;

        // 既存の行をクリア（テンプレート行のみ残す）
        tbody.querySelectorAll('[data-bind="priceChangeTableRow"]').forEach((row, i) => {
            if (i > 0) row.remove();
        });

        // 銘柄数分の行を生成
        stocks.forEach((stock, stockIndex) => {
            const row = stockIndex === 0 ? templateRow : templateRow.cloneNode(true);

            // 固定列（コード、銘柄名）をバインド
            row.querySelector('[data-bind="code"]').textContent = stock.code;
            row.querySelector('[data-bind="name"]').textContent = stock.name;

            // 既存の動的セルをクリア
            row.querySelectorAll('.dynamic-cell').forEach((el) => el.remove());

            // 各日付のデータセルを追加
            dates.forEach((date) => {
                const item = dataMap.get(`${date}_${stock.code}`);

                // 変化率セル
                const ratioCell = document.createElement('td');
                ratioCell.className = 'changeRate dynamic-cell';
                if (item && item.ratio != null && item.ratio !== 0) {
                    const ratioText = `${item.ratio >= 0 ? '+' : ''}${item.ratio.toFixed(2)}%`;
                    ratioCell.textContent = ratioText;
                    ratioCell.classList.add(item.ratio >= 0 ? 'positive' : 'negative');
                }
                row.appendChild(ratioCell);

                // 売買数セル
                const quantityCell = document.createElement('td');
                quantityCell.className = 'tradeQuantity dynamic-cell';
                if (item && item.quantity != null && item.quantity !== 0) {
                    const quantityText = `${item.quantity >= 0 ? '+' : ''}${item.quantity.toLocaleString()}`;
                    quantityCell.textContent = quantityText;
                    quantityCell.classList.add(item.quantity >= 0 ? 'positive' : 'negative');
                }
                row.appendChild(quantityCell);
            });

            // テンプレート行以外は新規追加
            if (stockIndex > 0) {
                tbody.appendChild(row);
            }
        });
    }
}
