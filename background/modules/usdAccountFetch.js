/**
 * 外貨建て口座情報関連のリソースリクエストを担当するモジュール
 */
export class UsdAccountFetch {
    /**
     * 外貨建て口座APIを取得
     * @returns {Promise<Object>} APIレスポンスのJSONオブジェクト
     */
    static async fetchAccountAPI() {
        const url = 'https://site.sbisec.co.jp/account/api/foreign/summary';
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
                },
                credentials: 'include',
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('外貨建て口座API取得エラー:', error);
            throw error;
        }
    }
}
