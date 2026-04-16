import { FetchUtils } from './_fetchUtils.js';

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
        // 自動リダイレクトにより最終的に benefit401k.com のページに到達するまで待機する。
        const urlSso = 'https://site3.sbisec.co.jp/ETGate/?_ControlID=WPLETsmR001Control&_DataStoreID=DSWPLETsmR001Control&sw_page=Benefit&sw_param1=AccountOpen&getFlg=on&OutSide=on';
        await FetchUtils.openBackgroundTabAndWait(urlSso, (changeInfo, tabInfo) => changeInfo.status === 'complete' && tabInfo.url && tabInfo.url.includes('benefit401k.com'));

        // iDeCo 口座情報ページのURLからHTMLを取得
        const url = 'https://www.benefit401k.com/customer/RkDCMember/Home/JP_D_MemHome.aspx';
        try {
            const html = await FetchUtils.fetchShiftJis(url, {
                headers: {
                    Referer: 'https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_EmailAddress_Registration.aspx',
                }
            });
            if (html.includes('再度ログインしてください')) throw new Error('iDeCo 口座のセッションが確立できませんでした。再度ログインしてください。');
            return html;
        } catch (error) {
            console.error('iDeCo 口座API取得エラー:', error);
            throw error;
        }
    }
}
