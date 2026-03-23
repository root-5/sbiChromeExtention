// =======================================
// サービスワーカー通信モジュール
// =======================================

export class BackendClient {
    /**
     * 初回データを取得する（取引履歴など）
     * @returns {Promise<Object>} 取引履歴データ
     */
    static async fetchInitialData() {
        const response = await chrome.runtime.sendMessage({ type: 'GET_INITIAL_DATA' });
        if (!response.success) throw new Error(`GET_INITIAL_DATA Error: ${response.error}`);
        return response.data;
    }

    /**
     * 更新データを取得する（口座、ポートフォリオ、株価など）
     * @returns {Promise<Object>} 更新データ一式
     */
    static async fetchRefreshData() {
        const response = await chrome.runtime.sendMessage({ type: 'GET_REFRESH_DATA' });
        if (!response.success) throw new Error(`GET_REFRESH_DATA Error: ${response.error}`);
        return response.data;
    }

    /**
     * 全口座データを取得する（外貨建て・iDeCo 口座）
     * 全口座表示モードへ切り替える際に一度だけ呼ぶ
     * @returns {Promise<Object>} 外貨建て・iDeCo 口座データ
     */
    static async fetchAllAccountData() {
        const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_ACCOUNT_DATA' });
        if (!response.success) throw new Error(`GET_ALL_ACCOUNT_DATA Error: ${response.error}`);
        return response.data;
    }
}
