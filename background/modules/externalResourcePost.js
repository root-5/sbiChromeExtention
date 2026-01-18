/**
 * 外部サーバーへのデータ送信モジュール
 */
export const ExternalResourcePost = {
    /**
     * 口座データと当日約定データを外部サーバーへ送信
     * @param {Object} data 送信データ
     * @param {Object} data.accountData 口座データ
     * @param {Array<Object>} data.tradingLog 取引履歴データ（当日約定データを含む）
     */
    postAccountData: async function (data) {
        try {
            const res = await fetch(chrome.runtime.getURL('env.json'));
            const env = await res.json();
            const response = await fetch(env.LOG_SERVER_DOMAIN + '/api/accountData', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                console.error('外部サーバーへのデータ送信に失敗しました:', response.statusText);
            } else {
                console.log('外部サーバーへのデータ送信に成功しました');
            }
        } catch (error) {
            console.error('外部サーバーへのデータ送信中にエラーが発生しました:', error);
        }
    },
};
