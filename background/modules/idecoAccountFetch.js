/**
 * iDeCo 口座情報関連のリソースリクエストを担当するモジュール
 */
export class IdecoAccountFetch {
    /**
     * iDeCo 口座APIを取得
     * @returns {Promise<string>} HTML文字列
     */
    static async fetchAccountAPI() {
        // iDeCo 口座は特殊で、専用のセッションが必要。複数のリダイレクトを経由してセッションを確立させる必要があるため、まず専用の認証 URLを開いてセッションを確立させる。
        const tab = await chrome.tabs.create({
            url: '/ETGate/?_ControlID=WPLETsmR001Control&_DataStoreID=DSWPLETsmR001Control&sw_page=Benefit&sw_param1=AccountOpen&getFlg=on&OutSide=on',
            active: false,
        });

        // タブの読み込み完了を待機してから閉じる
        await new Promise((resolve) => {
            const listener = (tabId, changeInfo) => {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.remove(tabId).catch(() => {});
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);

            // ずっとページが開かない場合のタイムアウト (15秒)
            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                chrome.tabs.remove(tab.id).catch(() => {});
                resolve();
            }, 15000);
        });

        // iDeCo 口座情報ページのURLからHTMLを取得
        const url = 'https://www.benefit401k.com/customer/RkDCMember/Home/JP_D_MemHome.aspx';
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Referer: 'https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_EmailAddress_Registration.aspx',
                },
                credentials: 'include',
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const resultBuffer = await response.arrayBuffer();
            const resultUint8Array = new Uint8Array(resultBuffer);
            const html = new TextDecoder('shift-jis').decode(resultUint8Array);
            if (html.includes('再度ログインしてください')) throw new Error('iDeCo 口座のセッションが確立できませんでした。再度ログインしてください。');
            return html;
        } catch (error) {
            console.error('iDeCo 口座API取得エラー:', error);
            throw error;
        }
    }
}
