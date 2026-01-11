// manifest.json から参照され contentScript.js を動的に読み込む
// これによりコンテンツスクリプト内で import/export 文が使用可能になり、コンテントスクリプトの変更時に拡張機能を再読み込みする必要がなくなる
(async () => {
    const src = chrome.runtime.getURL('content/contentScript.js');
    await import(src);
})();
