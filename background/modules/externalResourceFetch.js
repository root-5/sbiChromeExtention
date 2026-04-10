/**
 * 外部リソースの取得を担当するモジュール
 */
export class ExternalResourceFetch {
    /**
     * 指定された銘柄コードの終値データを独自 API から取得
     * @param {Array<string>} codes 銘柄コードの配列
     * @param {number} daysAgo 何日前からのデータを取得するか
     * @returns {Promise<string>} CSVデータ文字列
     */
    static async fetchClosePrices(codes, daysAgo = 15) {
        if (!codes || !Array.isArray(codes) || codes.length === 0) {
            throw new Error('銘柄コードの配列が必要です');
        }

        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - daysAgo);

        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const startDateStr = formatDate(startDate);
        const endDateStr = formatDate(today);
        const codeParam = codes.filter((code) => code).join(',');

        const res = await fetch(chrome.runtime.getURL('env.json'));
        const env = await res.json();
        const url = `${env.INFO_SERVER_DOMAIN}/closeprice?code=${codeParam}&ymd=${startDateStr}~${endDateStr}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error('終値データの取得に失敗しました:', error);
            throw error;
        }
    }
}
