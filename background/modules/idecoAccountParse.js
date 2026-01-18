/**
 * iDeCo 口座情報関連の変換処理を担当するモジュール
 */
export class IdecoAccountParse {
    /**
     * iDeCo 口座HTMLをパースしてオブジェクト配列に変換
     * @param {string} html iDeCo 口座HTML文字列
     * @returns {Array<Object>} iDeCo 口座データ配列
     */
    static parseAccountHTML(html) {
        // HTML から iDeCo の情報を抽出する関数
        const profitAndLossEles = html.match(/損益表[\s\S]*?\/損益表/)[0]; // 「損益表」から「/損益表」までの間を取得
        const profitAndLossTable = profitAndLossEles.match(/<table[\s\S]*?<\/table>/)[0]; // 「<table」から「</table>」までの間を取得

        // table要素の解析を正規表現で行う
        const squareArray = [];
        const rows = profitAndLossTable.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || []; // テーブル行を取得
        for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/g) || []; // 行からセルを取得
            squareArray.push([]);
            for (const cell of cells) {
                const text = cell.replace(/<[^>]*>/g, '').trim(); // セルからテキストを抽出（HTMLタグを除去）
                squareArray[i].push(text.replace(/\r\n|\t|&nbsp;|"|円|,/g, '')); // 記号等を削除して配列に追加
            }
        }

        // 行の長さを統一し、空行を削除
        const maxLength = Math.max(...squareArray.map((row) => row.length));
        for (let i = 0; i < squareArray.length; i++) {
            const rowLength = squareArray[i].length;
            if (rowLength < maxLength) {
                for (let j = 0; j < maxLength - rowLength; j++) {
                    squareArray[i].push('');
                }
            }
        }
        const filteredSquareArray = squareArray.filter((row) => row.some((cell) => cell !== ''));
        filteredSquareArray.pop();

        // 二次元配列からオブジェクトの配列に変換
        const idecoArray = [];
        for (let i = 0; i < filteredSquareArray.length; i++) {
            const row = filteredSquareArray[i];
            const marketCap = parseFloat(row[2].replace(/,/g, ''));
            const profitAndLoss = parseFloat(row[3].replace(/,/g, ''));
            const cost = marketCap - profitAndLoss;

            idecoArray.push({
                currencyType: '円建',
                depositType: 'iDeCo',
                marginType: '現物',
                code: '-',
                name: row[1],
                quantity: 1,
                buyPrice: cost,
                currentPrice: marketCap,
                marketCap: marketCap,
                profitAndLoss: profitAndLoss,
                profitRate: cost ? (profitAndLoss / cost) * 100 : 0,
            });
        }

        return idecoArray;
    }
}
