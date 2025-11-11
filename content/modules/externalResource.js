/**
 * ==============================================================
 * externalResource クラス
 * 外部APIから取得したデータの処理とUI描画を担当
 * ==============================================================
 */
class ExternalResource {
    /**
     * 銘柄の配列から終値データを取得する関数
     * @param {Array<Object>} stocks 銘柄の配列
     * @param {number} daysAgo 何日前からのデータを取得するか（デフォルト: 15日前）
     * @returns {Promise<Object>} 終値データ（JSON形式）
     */
    static async fetchClosePriceData(stocks, daysAgo = 15) {
        const codes = [...new Set(stocks.map((stock) => stock.code))];
        try {
            // バックグラウンド側で終値データを取得
            const response = await chrome.runtime.sendMessage({
                type: 'FETCH_CLOSE_PRICE_DATA',
                params: {
                    codes: codes,
                    daysAgo: daysAgo,
                },
            });
            if (!response.success) throw new Error(response.error);
            return response.data;
        } catch (error) {
            console.error('終値データの取得に失敗しました:', error);
            throw error;
        }
    }
}
