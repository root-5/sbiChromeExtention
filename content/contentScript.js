/**
 * ==============================================================
 * SBI証券 ポートフォリオページ UI拡張 (Preact版)
 * ==============================================================
 */

import { render, html } from './utils/preact-adapter.js';
import { App } from './components/App.js';

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
