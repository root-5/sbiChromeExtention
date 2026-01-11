/**
 * 円建て口座情報関連のリソースリクエストを担当するモジュール
 */
export class JpyAccountFetch {
    /**
     * 口座管理ページのHTMLを取得
     * @returns {Promise<string>} 口座管理ページのHTML文字列
     */
    static async fetchAccountPage() {
        const url = 'https://site3.sbisec.co.jp/ETGate/?_ControlID=WPLETacR001Control&_PageID=DefaultPID&_DataStoreID=DSWPLETacR001Control&_ActionID=DefaultAID&getFlg=on';
        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const buffer = await response.arrayBuffer();
            return new TextDecoder('shift-jis').decode(buffer);
        } catch (error) {
            console.error('HTML取得エラー:', error);
            throw error;
        }
    }

    /**
     * ポートフォリオCSVを取得
     * @returns {Promise<string>} ポートフォリオCSV文字列
     */
    static async fetchPortfolioCSV() {
        const url =
            'https://site3.sbisec.co.jp/ETGate/?_ControlID=WPLETpfR001Control&_PageID=WPLETpfR001Rlst10&_DataStoreID=DSWPLETpfR001Control&_SeqNo=1762177445111_default_task_80402_DefaultPID_DefaultAID&_ActionID=csvdl&ref_from=1&ref_to=50&getFlg=on';
        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const buffer = await response.arrayBuffer();
            return new TextDecoder('shift-jis').decode(buffer);
        } catch (error) {
            console.error('CSV取得エラー:', error);
            throw error;
        }
    }

    /**
     * 取引履歴CSVを取得
     * @returns {Promise<string>} 取引履歴CSV文字列
     */
    static async fetchTradingLogCsv() {
        // 今日と1ヶ月前の日付の文字列を生成（YYYYMMDD）
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = `0${date.getMonth() + 1}`.slice(-2);
            const day = `0${date.getDate()}`.slice(-2);
            return `${year}${month}${day}`;
        };
        const today = new Date();
        const monthAgo = new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000);
        const todayStr = formatDate(today);
        const monthAgoStr = formatDate(monthAgo);

        const formData = {
            _ControlID: 'WPLETacR007Control',
            _PageID: 'WPLETacR007Rget10',
            getFlg: 'on',
            _ActionID: 'csv',
            reference_from: monthAgoStr,
            reference_to: todayStr,
            number_from: '1',
            number_to: '200',
        };

        try {
            const res = await fetch('https://site3.sbisec.co.jp/ETGate/?' + new URLSearchParams(formData).toString(), {
                headers: { credentials: 'include' },
                method: 'GET',
            });
            const buffer = await res.arrayBuffer();
            return new TextDecoder('shift-jis').decode(new Uint8Array(buffer));
        } catch (error) {
            console.error('TradingLog CSV取得エラー:', error);
            throw error;
        }
    }

    /**
     * 当日約定一覧ページのHTMLを取得
     * @returns {Promise<string>} 当日約定一覧ページのHTML文字列
     */
    static async fetchTodayExecutionPage() {
        const url = 'https://site3.sbisec.co.jp/ETGate/WPLETagR001Control/DefaultPID/DefaultAID?OutSide=on&getFlg=on&int_pr1=150313_cmn_gnavi:1_dmenu_09';
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: { credentials: 'include' },
            });
            const buffer = await res.arrayBuffer();
            return new TextDecoder('shift-jis').decode(new Uint8Array(buffer));
        } catch (error) {
            console.error('TodayExecution HTML取得エラー:', error);
            throw error;
        }
    }
}
