/**
 * 円建口座情報関連のリソースリクエストを担当するモジュール
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
        // portforio_id=000000000000001 は自分の口座、 000000000000002 以降だと「登録銘柄」の一覧が取得できる
        const url =
            'https://site3.sbisec.co.jp/ETGate/?_ControlID=WPLETpfR001Control&_PageID=WPLETpfR001Rlst10&_DataStoreID=DSWPLETpfR001Control&_SeqNo=1762177445111_default_task_80402_DefaultPID_DefaultAID&_ActionID=csvdl&ref_from=1&ref_to=50&getFlg=on&portforio_id=000000000000001';
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
                method: 'GET',
                credentials: 'include',
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
                credentials: 'include',
            });
            const buffer = await res.arrayBuffer();
            return new TextDecoder('shift-jis').decode(new Uint8Array(buffer));
        } catch (error) {
            console.error('TodayExecution HTML取得エラー:', error);
            throw error;
        }
    }

    /**
     * SBI 証券の株式詳細ページから ajax トークンを取得
     * @returns {Promise<string>} ajaxトークン文字列
     */
    static async getAjaxToken() {
        const url = `https://site3.sbisec.co.jp/ETGate/?_ControlID=WPLETsiR001Control&_PageID=WPLETsiR001Idtl10&_DataStoreID=DSWPLETsiR001Control&_ActionID=stockDetail&s_rkbn=2&s_btype=&i_stock_sec=7203&i_dom_flg=1&i_exchange_code=JPN&i_output_type=0&exchange_code=TKY&stock_sec_code_mul=7203&ref_from=1&ref_to=20&wstm4130_sort_id=&wstm4130_sort_kbn=&qr_keyword=1&qr_suggest=1&qr_sort=1`;
        try {
            const res = await fetch(url, {
                method: 'GET',
                credentials: 'include',
            });
            const buffer = await res.arrayBuffer();
            const html = new TextDecoder('shift-jis').decode(new Uint8Array(buffer));
            const ajaxTokenMatch = html.match(/id="ajaxToken" value="([\w-]+)"/);
            return ajaxTokenMatch[1];
        } catch (error) {
            console.error('株式詳細ページHTML取得エラー:', error);
            throw error;
        }
    }

    /**
     * SBI証券の株式詳細ページの API から現在値を解析して取得
     * @param {string} code 銘柄コード
     * @param {string} ajaxToken 価格取得に必要なAjaxトークン
     * @returns {number|null} 現在値
     */
    static async getCurrentPrice(code, ajaxToken) {
        const nowUnix = Math.floor(Date.now() / 1000);
        const url = `
https://mds.sbisec.co.jp/api/stocks/GetRealQuoteSnapshot?callback=callbackSPR&inputstring=2%2C2%2CTKY%2C${code}%2CPTS%2C${code}&hashvalue=${ajaxToken}&time=${nowUnix}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
            });
            const text = await response.text();
            const dataArr = text.replace(/^callbackSPR\("(.*)"\);?$/, '$1').split(',');
            if (dataArr.length > 10) {
                const price = dataArr[5]; // 5番目の要素が現在値（終値）に該当、始値・高値・前日比等も取得可能だが、現状は終値のみ使用
                return price ? parseFloat(price) : null;
            }
            return null;
        } catch (e) {
            console.error('現在値取得エラー:', e);
            return null;
        }
    }
}
