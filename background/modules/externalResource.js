/**
 * 指定された銘柄コードの終値データを独自 API から取得する関数
 * @param {Array<string>} codes 銘柄コードの配列（例: ["7203", "6758", "9984"]）
 * @param {number} daysAgo 何日前からのデータを取得するか（デフォルト: 15日前）
 * @returns {Promise<Object>} 終値データ
 */
export async function fetchClosePriceData(codes, daysAgo = 15) {
    if (!codes || !Array.isArray(codes) || codes.length === 0) {
        throw new Error('銘柄コードの配列が必要です');
    }

    // 日付の計算（今日と指定日数前）
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysAgo);

    // 日付をyyyy-mm-dd形式にフォーマット
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(today);

    // 銘柄コードをカンマ区切りで結合
    const codeParam = codes.filter((code) => code).join(',');

    // APIエンドポイントのURL構築
    const res = await fetch(chrome.runtime.getURL('env.json'));
    const env = await res.json();
    const url = `${env.API_ENDPOINT}/closeprice?code=${codeParam}&ymd=${startDateStr}~${endDateStr}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvData = await response.text();

        // 行ごとに分割
        const lines = csvData.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('データが不正です');
        }

        // ヘッダー行（1行目）から銘柄コードを取得
        const headers = lines[0].split(',');
        const stockCodes = headers.slice(1); // 「日付」列を除く

        // データ行（2行目以降）を処理
        const closePriceData = lines.slice(1).map((line) => {
            const values = line.split(',');
            const date = values[0]; // 日付（YYYY-MM-DD形式）

            // YYYY/MM/DD形式に変換
            const [year, month, day] = date.split('-');
            const formattedDate = `${year}/${month}/${day}`;

            // 各銘柄の終値をオブジェクト化
            const closePrice = {};
            stockCodes.forEach((code, index) => {
                const price = values[index + 1];
                closePrice[code] = price ? parseFloat(price) : null;
            });

            return { date: formattedDate, closePrice: closePrice };
        });

        return { closePriceData: closePriceData };
    } catch (error) {
        console.error('終値データの取得に失敗しました:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 指定された銘柄コードの現在価格データを GoogleFinance から取得する関数
 * @param {Array<string>} codes 銘柄コードの配列（例: ["7203", "6758", "9984"]）
 * @returns {Array<Object>} - 現在価格の配列（ディレイ有）
 */
export async function fetchCurrentPriceData(codes) {
    const currentPrices = [];
    for (const code of codes) {
        // GoogleFinance からHTMLを取得
        const googleFinanceUrl = 'https://www.google.com/finance/quote/' + code + ':TYO?hl=jp&gl=jp';
        const html = await fetch(googleFinanceUrl).then((response) => response.text());
        let price = html.match(/data-last-price="([\s\S]*?)"/);
        price[1] = price[1].replace(',', ''); // カンマの除去
        price[1] = Number(price[1]); // 文字列を数列に
        currentPrices.push({
            code: code,
            price: price[1],
        });
    }
    return currentPrices;
}
