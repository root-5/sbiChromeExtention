// manifest.json から参照され contentScript.js を動的に読み込む
// これによりコンテンツスクリプト内で import/export 文が使用可能になる
(async () => {
    try {
        const src = chrome.runtime.getURL('content/contentScript.js');
        await import(src);
    } catch (e) {
        console.error('Failed to load contentScript.js', e);
    }
})();
