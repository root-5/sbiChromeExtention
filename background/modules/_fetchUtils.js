/**
 * バックグラウンドでの通信処理を共通化するユーティリティモジュール
 */
export class FetchUtils {
    /**
     * Shift-JISとしてデコードする fetch 処理
     * @param {string} url リクエストURL
     * @param {Object} options fetchオプション
     * @returns {Promise<string>} デコード済みの文字列
     */
    static async fetchShiftJis(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            credentials: 'include',
        };
        const finalOptions = { ...defaultOptions, ...options };

        const response = await fetch(url, finalOptions);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const buffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        return new TextDecoder('shift-jis').decode(uint8Array);
    }

    /**
     * バックグラウンドタブを開き、特定の条件を満たすまで待機して閉じる
     * @param {string} url 開くURL
     * @param {Function} conditionFn 完了条件を判定する関数 `(changeInfo, tabInfo) => boolean`。デフォルトは `status === 'complete'`。
     * @returns {Promise<void>}
     */
    static async openBackgroundTabAndWait(url, conditionFn = null) {
        if (!conditionFn) {
            conditionFn = (changeInfo) => changeInfo.status === 'complete';
        }

        const tab = await chrome.tabs.create({ url, active: false });

        await new Promise((resolve) => {
            const listener = (tabId, changeInfo, tabInfo) => {
                if (tabId === tab.id && conditionFn(changeInfo, tabInfo)) {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);

            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }, 5000);
        });

        chrome.tabs.remove(tab.id).catch(() => {});
    }
}
