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
    console.log('SBI Chrome Extension: Mounting Preact App...');
    const TARGET_ELE_ID = 'TIMEAREA01';
    const targetElement = document.getElementById(TARGET_ELE_ID);

    if (!targetElement) {
        console.warn('Target element "TIMEAREA01" not found. Extension logic skipped.');
        return;
    }

    // 重複実行防止のための既存ルート削除
    const existingRoot = document.getElementById('sbi-extension-root');
    if (existingRoot) {
        existingRoot.remove();
    }

    // 新しいマウントポイントを作成
    const root = document.createElement('div');
    root.id = 'sbi-extension-root';

    // 既存のHTML要素の後ろに挿入（従来の動作を踏襲）
    targetElement.insertAdjacentElement('afterend', root);

    // Preactアプリケーションをレンダリング
    render(html`<${App} />`, root);
}
