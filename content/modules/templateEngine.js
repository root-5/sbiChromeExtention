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
}
