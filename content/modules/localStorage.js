// =======================================
// localStorage モジュール
// =======================================

const UNCHECKED_STORAGE_KEY = 'sbi_unchecked_trade_keys'; // localStorage のキー名
const UNCHECKED_KEY_EXPIRATION_DAYS = 90; // 取引キーの有効期限（日数）

/**
 * localStorage から未チェック取引キーの Set を読み込む関数。
 * 有効期限切れのキーは自動的に除去する。
 * @returns {Set<string>}
 */
export function loadUncheckedKeys() {
    try {
        // ローカルストレージから全キーを読み込む
        const raw = localStorage.getItem(UNCHECKED_STORAGE_KEY);
        if (!raw) return new Set();
        const allKeys = JSON.parse(raw);

        // 指定日数前の日付を YYYYMMDD 形式で算出、期限切れキーを除去
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - UNCHECKED_KEY_EXPIRATION_DAYS);
        const thresholdStr = thresholdDate.toISOString().slice(0, 10).replace(/-/g, '');
        const validKeys = allKeys.filter((key) => {
            const datePart = String(key).slice(0, 8);
            return datePart >= thresholdStr;
        });

        // 削除があった場合のみ書き戻す
        if (validKeys.length !== allKeys.length) {
            localStorage.setItem(UNCHECKED_STORAGE_KEY, JSON.stringify(validKeys));
        }
        return new Set(validKeys);
    } catch (e) {
        console.error('未チェック取引キーの Set 読み込みエラー:', e);
        return new Set();
    }
}

/**
 * 未チェック取引キーの Set を localStorage に保存する関数。
 * @param {Set<string>} keysSet - 保存する未チェック取引キーの Set
 */
export function saveUncheckedKeys(keysSet) {
    localStorage.setItem(UNCHECKED_STORAGE_KEY, JSON.stringify([...keysSet]));
}
