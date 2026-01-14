/**
 * 外貨建口座情報関連のリソースリクエストを担当するモジュール
 */
export class UsdAccountFetch {
    /**
     * 外貨建口座APIを取得
     * @returns {Promise<Object>} APIレスポンスのJSONオブジェクト
     */
    static async fetchAccountAPI() {
        // 外貨建口座は特殊で円建て口座と異なる専用のセッション (SSO?) が必要。そのため、まず専用の SSO 認証 URLを開いてセッションを確立させる。
        // この処理は通常「口座(外貨建)」メニューをクリックしたときにリダイレクトを使用して行われているが、拡張機能からはリダイレクトを直接発生させられないため、ここで新しいタブを開いて対応する。
        // fetch を使用しないのはこのリダイレクト処理中に hidden された input 要素の値を送信する必要があるため。
        await chrome.tabs.create({
            url: 'https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETsmR001Control&_PageID=WPLETsmR001Sdtl18&_ActionID=NoActionID&_DataStoreID=DSWPLETsmR001Control&OutSide=on&getFlg=on&sw_param1=account&sw_param2=foreign&sw_param3=summary&_scpr=intpr=hn_acc_f',
            active: false,
        });

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
            console.error('外貨建口座API取得エラー:', error);
            throw error;
        }
    }
}
