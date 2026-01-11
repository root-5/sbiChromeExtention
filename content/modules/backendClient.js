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
}
