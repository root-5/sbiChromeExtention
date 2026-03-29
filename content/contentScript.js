/**
 * ==============================================================
 * SBI証券 ポートフォリオページ UI拡張 (Preact版)
 * ==============================================================
 */

import { render, html } from './utils/preact-adapter.js';
import { App } from './components/App.js';

// リダイレクト
const url = window.location.href;
if (url === 'https://site3.sbisec.co.jp/ETGate/') {
    window.location.href = 'https://site3.sbisec.co.jp/ETGate/?_ControlID=WPLETpfR001Control&_PageID=DefaultPID&_ActionID=DefaultAID&_DataStoreID=DSWPLETpfR001Control&OutSide=on&getFlg=on&_scpr=intpr=hn_trade';
}

// viewport の meta タグを追加（SPでの表示崩れ対策）
const metaViewport = document.createElement('meta');
metaViewport.name = 'viewport';
metaViewport.content = 'width=device-width, initial-scale=1.0';
document.head.appendChild(metaViewport);

// メイン処理の開始
const title = document.title;
if (title.includes('ポートフォリオ')) {
    mountApp();
}

function mountApp() {
    const TARGET_ELE_ID = 'TIMEAREA01';
    const targetEle = document.getElementById(TARGET_ELE_ID);

    // マウントポイントを作成
    const rootEle = document.createElement('div');
    targetEle.insertAdjacentElement('afterend', rootEle);

    // Preact アプリケーションをレンダリング
    render(html`<${App} />`, rootEle);
}
