/**
 * 円建て口座 HTML の解析処理
 * 「口座管理」＞「口座(円建)」のページからデータを取得・解析
 * @returns {Promise<{buyingPower: number, cashBalance: number, stocks: Array}>} 円建て口座データ
 */
export async function parseJpyAccountHTML() {
    // 円建て口座の HTML を取得
    const url = 'https://site3.sbisec.co.jp/ETGate/?_ControlID=WPLETacR001Control&_PageID=DefaultPID&_DataStoreID=DSWPLETacR001Control&_ActionID=DefaultAID&getFlg=on';
    let html = '';
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include', // Cookieを含める（ログイン状態を維持）
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const buffer = await response.arrayBuffer();
        html = new TextDecoder('shift-jis').decode(buffer);
    } catch (error) {
        console.error('HTML取得エラー:', error);
        throw error;
    }

    // HTMLから必要なデータを抽出
    try {
        // 買付余力を取得（正規表現でのマッチング時のエラーハンドリングを追加）
        const buyingPowerRegex = /<td width="150" class="mtext" align="right"><div class="margin">(.{1,10})&nbsp;/;
        const buyingPowerMatch = html.match(buyingPowerRegex);
        if (!buyingPowerMatch) throw new Error('買付余力のデータが見つかりませんでした');
        const buyingPower = Number(buyingPowerMatch[1].replace(/,/g, ''));

        // 現金残高を取得
        const cashBalanceRegex = /<td class="mtext" align="right"><div class="margin"><font color="black">(.{1,10})<\/font>&nbsp;<\/div><\/td>/;
        const cashBalanceMatch = html.match(cashBalanceRegex);
        if (!cashBalanceMatch) throw new Error('現金残高のデータが見つかりませんでした');
        const cashBalance = Number(cashBalanceMatch[1].replace(/,/g, ''));

        // 株式情報を表示している table 要素の取得
        const stockTableRegex = /<table border="0" cellspacing="1" cellpadding="1" width="400"><tr><td class="mtext" colspan="4"><font color="#336600">(.*)<\/font><\/b><\/td><\/tr><\/table>/g;
        const stockTableElem = html.match(stockTableRegex) || [];

        // table 要素から各情報を抽出
        let match;
        let stockMarginTypes = [];
        let stockCodes = [];
        let stockNames = [];
        let stockQuantity = [];
        let stockBuyingPrices = [];
        let stockNowPrices = [];
        const stockCodesRegex = /i_stock_sec=(.{1,6})\+&amp;/g;
        const stockNamesRegex = /PER=1">(.{1,20})<\/a>/g;
        const stockQuantityandPricesRegex = /<td class="mtext">(.{1,10})<\/td>/g;

        for (let i = 0; i < stockTableElem.length; i++) {
            const marginType = i === 0 ? '現物' : '信用';
            while ((match = stockCodesRegex.exec(stockTableElem[i])) !== null) {
                stockMarginTypes.push(marginType);
                stockCodes.push(match[1]);
            }
            while ((match = stockNamesRegex.exec(stockTableElem[i])) !== null) {
                stockNames.push(match[1]);
            }
            let count = 0;
            while ((match = stockQuantityandPricesRegex.exec(stockTableElem[i])) !== null) {
                switch (count % 3) {
                    case 0:
                        stockQuantity.push(Number(match[1].replace(/,/g, '')));
                        break;
                    case 1:
                        stockBuyingPrices.push(Number(match[1].replace(/,/g, '')));
                        break;
                    case 2:
                        stockNowPrices.push(Number(match[1].replace(/,/g, '')));
                        break;
                }
                count++;
            }
        }

        // 株式情報をオブジェクトに格納
        const stocks = [];
        for (let i = 0; i < stockCodes.length; i++) {
            stocks.push({
                currencyType: '円建',
                depositType: '特定', // '特定' は仮置き
                marginType: stockMarginTypes[i],
                code: stockCodes[i],
                name: stockNames[i].replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)), // 全角英数字を半角に変換
                quantity: stockQuantity[i],
                buyPrice: stockBuyingPrices[i],
                currentPrice: stockNowPrices[i],
                profitAndLoss: (stockNowPrices[i] - stockBuyingPrices[i]) * stockQuantity[i],
                marketCap: stockNowPrices[i] * stockQuantity[i],
            });
        }

        return { buyingPower, cashBalance, stocks: stocks };
    } catch (error) {
        console.error('ポートフォリオデータの抽出エラー:', error);
        throw error;
    }
}

/**
 * ポートフォリオCSVの解析処理
 * 「ポートフォリオ」＞「CSVダウンロード」からデータを取得・解析
 * @returns {Promise<Array>} ポートフォリオデータの配列
 */
export async function parseJpyPortfolioCSV() {
    // ポートフォリオCSVを取得
    const url =
        'https://site3.sbisec.co.jp/ETGate/?_ControlID=WPLETpfR001Control&_PageID=WPLETpfR001Rlst10&_DataStoreID=DSWPLETpfR001Control&_SeqNo=1762177445111_default_task_80402_DefaultPID_DefaultAID&_ActionID=csvdl&ref_from=1&ref_to=50&getFlg=on';
    let csv = '';
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include', // Cookieを含める（ログイン状態を維持）
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const buffer = await response.arrayBuffer();
        csv = new TextDecoder('shift-jis').decode(buffer);
    } catch (error) {
        console.error('CSV取得エラー:', error);
        throw error;
    }

    // CSVを解析
    try {
        const lines = csv
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line);
        const portfolio = [];

        let isStockSection = false; // 株式セクションかどうか
        let marginType = ''; // 現物 or 信用

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // セクション判定
            if (line.includes('株式（現物/特定預り）') && !line.includes('合計')) {
                isStockSection = true;
                marginType = '現物';
                continue;
            } else if (line.includes('株式（信用）') && !line.includes('合計')) {
                isStockSection = true;
                marginType = '信用';
                continue;
            } else if (line.includes('合計') || line.includes('総合計')) {
                isStockSection = false;
                continue;
            }

            // ポートフォリオにかかわらない行はスキップ
            if (!isStockSection) continue;
            if (line.includes('銘柄（コード）')) continue;

            // 株式データ行の解析
            if (line.match(/^"\d{4}/)) {
                const fields = line.split(',');

                if (marginType === '現物') {
                    // 現物株式のフォーマット
                    // "5253 カバー","----/--/--",3500,1946,1830,+23,+1.27,-406000,-5.96,6405000,
                    const stockNameWithCode = fields[0].replace(/"/g, '');
                    const match = stockNameWithCode.match(/^(\d{4})\s+(.+)$/);

                    if (match && fields.length >= 10) {
                        const currencyType = '円建';
                        const depositType = '特定'; // '特定' は仮置き
                        const code = match[1];
                        const name = match[2].replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)); // 全角英数字を半角に変換
                        const quantity = parseInt(fields[2]);
                        const buyPrice = parseFloat(fields[3]);
                        const currentPrice = parseFloat(fields[4]);
                        const dayChange = parseFloat(fields[5].replace(/\+/g, ''));
                        const profitAndLoss = parseFloat(fields[7]);
                        const profitRate = parseFloat(fields[8]);
                        const marketCap = parseFloat(fields[9]);
                        const marginType = '現物';

                        portfolio.push({ currencyType, depositType, code, name, quantity, buyPrice, currentPrice, dayChange, profitAndLoss, profitRate, marketCap, marginType });
                    }
                } else if (marginType === '信用') {
                    // 信用株式のフォーマット
                    // "4704 トレンド","買建","東証","6ヶ月","2025/10/28",100,7850,7883,+240,+3.14,+2819,+0.36,785000,
                    const stockNameWithCode = fields[0].replace(/"/g, '');
                    const match = stockNameWithCode.match(/^(\d{4})\s+(.+)$/);

                    if (match && fields.length >= 13) {
                        const currencyType = '円建';
                        const depositType = '特定'; // '特定' は仮置き
                        const code = match[1];
                        const name = match[2].replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)); // 全角英数字を半角に変換
                        const quantity = parseInt(fields[5]);
                        const buyPrice = parseFloat(fields[6]);
                        const currentPrice = parseFloat(fields[7]);
                        const dayChange = parseFloat(fields[8].replace(/\+/g, ''));
                        const profitAndLoss = parseFloat(fields[10]);
                        const profitRate = parseFloat(fields[11]);
                        const marketCap = parseFloat(fields[12]);
                        const marginType = '信用';

                        portfolio.push({ currencyType, depositType, code, name, quantity, buyPrice, currentPrice, dayChange, profitAndLoss, profitRate, marketCap, marginType });
                    }
                }
            }
        }
        return { portfolio: portfolio };
    } catch (error) {
        console.error('CSV解析エラー:', error);
        throw error;
    }
}

/**
 * 円建て口座取引履歴 CSV の解析処理
 * 「口座管理」＞「取引履歴」 のページからデータを取得・解析
 * @returns {Promise<Array>} 取引履歴データの配列
 */
export async function parseJpyTradingLogCsv() {
    // 今日と1週間前の日付の文字列を生成（YYYYMMDD）
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = `0${date.getMonth() + 1}`.slice(-2);
        const day = `0${date.getDate()}`.slice(-2);
        return `${year}${month}${day}`;
    };
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000);
    const todayStr = formatDate(today);
    const monthAgoStr = formatDate(monthAgo);

    // パラメータを指定
    const formData = {
        _ControlID: 'WPLETacR007Control',
        _PageID: 'WPLETacR007Rget10',
        getFlg: 'on',
        _ActionID: 'csv',
        reference_from: monthAgoStr,
        reference_to: todayStr,
        number_from: '1',
        number_to: '200',
    };

    // HTML ソースを取得
    const res = await fetch('https://site3.sbisec.co.jp/ETGate/?' + new URLSearchParams(formData).toString(), {
        headers: {
            credentials: 'include', // Cookieを含める（ログイン状態を維持）
        },
        method: 'GET',
    });
    const buffer = await res.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    const csv = new TextDecoder('shift-jis').decode(uint8Array);

    // 「<script」 の有無を判定し html でないか検証
    if (csv.includes('<script')) {
        throw new Error('HTML source contains <script>');
    }

    // 最初の 8 行削除は不要なので削除
    const lines = csv.split('\n');
    lines.splice(0, 9);

    // オブジェクトに変換し、整形
    const tradingLog = [];
    lines.forEach((line, _) => {
        // rowArray[0] が空文字列の場合はスキップ
        if (line.split(',')[0] === '') return;

        const processedLine = line.replace(/ /g, '').replace(/"/g, ''); // 半角スペース、「"」をすべて削除
        const rowArray = processedLine.split(','); // カンマ区切りで分割
        tradingLog.push({
            currencyType: '円建',
            date: rowArray[0],
            name: rowArray[1].replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)), // 全角英数字を半角に変換
            code: rowArray[2],
            market: rowArray[3],
            tradeType: rowArray[4],
            marginTerm: rowArray[5],
            depositType: rowArray[6],
            taxType: rowArray[7],
            quantity: rowArray[8],
            price: rowArray[9],
            fee: rowArray[10],
            taxAmount: rowArray[11],
            deliveryDate: rowArray[12],
            deliveryAmount: rowArray[13],
        }); // 修正済み行を追加
    });

    return { tradingLog: tradingLog };
}

/**
 * 円建て口座当日約定履歴の解析処理
 * 「取引」＞「当日約定一覧」からデータを取得・解析
 * @return {Promise<Array>} 当日約定履歴データの配列
 */
export async function parseJpyTodayExecution() {
    const res = await fetch('https://site3.sbisec.co.jp/ETGate/WPLETagR001Control/DefaultPID/DefaultAID?OutSide=on&getFlg=on&int_pr1=150313_cmn_gnavi:1_dmenu_09', {
        method: 'GET',
        headers: {
            credentials: 'include', // Cookieを含める（ログイン状態を維持）
        },
    });
    const buffer = await res.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    const html = new TextDecoder('shift-jis').decode(uint8Array);

    if (html.includes('現在、お客様の当日約定はございません。')) return { todayExecutions: [] };

    // 「<!--△検索タブ-->」から「<!--▼GetHtml枠-->」までを取得
    const tablesMatch = html.match(/<!--△検索タブ-->([\s\S]*?)<!--▼GetHtml枠-->/);

    // tr 要素の取得
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const trElems = [];
    let match;
    while ((match = trRegex.exec(tablesMatch[1])) !== null) {
        trElems.push(match[0]);
    }

    // tr 要素の中から td 要素を取得し、各 td 要素のテキストを取得
    const tableArr = [];
    trElems.forEach((trElem, i) => {
        tableArr.push([]);
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
        let tdMatch;
        let j = 0;
        while ((tdMatch = tdRegex.exec(trElem)) !== null) {
            // HTMLタグを除去してテキストのみ取得
            const tdContent = tdMatch[1];
            const tdText = tdContent.replace(/<[^>]*>/g, '').trim();
            tableArr[i].push(tdText);
            j++;
        }
        if (j === 0) {
            console.log('td 要素が見つかりませんでした:', trElem.substring(0, 100));
        }
    });

    // 各行を処理
    const todayExecutions = [];
    for (let i = 0; i < tableArr.length; i++) {
        const row = tableArr[i];

        // ヘッダー行はスキップ
        if (row[0] === '' || row[0] === '銘柄') continue;

        // row の長さが 8 の場合は銘柄名が一列前と共通になる仕様のため、銘柄名を補完する
        if (row.length === 8) {
            row.unshift(tableArr[i - 1][0]);
        }

        // 銘柄コード銘柄名、取引タイプを抽出
        const codeMatch = row[0].match(/\d{4}/);
        const code = codeMatch ? codeMatch[0] : '';
        const name = code ? row[0].replace(code, '').trim() : row[0];
        const tradeType = row[1];

        // 日付情報を処理
        const dateString = row[2] || '';
        let date = '';
        if (dateString) {
            const dates = dateString.split('/');
            if (dates.length >= 3) {
                const year = dates[0].includes('20') ? dates[0] : `20${dates[0]}`;
                date = `${year}/${dates[1]}/${dates[2].substring(0, 2)}`;
            }
        }

        // 数値データを処理（カンマ除去、数値変換）
        const quantity = parseInt((row[3] || '0').replace(/,/g, '')) || 0;
        const price = parseFloat((row[4] || '0').replace(/,/g, '')) || 0;
        const fee = parseFloat((row[5] || '0').replace(/,/g, '')) || 0;

        // 取引オブジェクトを作成
        const execution = {
            currencyType: '円建',
            date, // 約定日
            code, // 証券コード
            name, // 銘柄名
            tradeType, // 取引種別
            quantity, // 数量
            price, // 単価
            fee, // 手数料
        };
        todayExecutions.push(execution);
    }

    return { todayExecutions: todayExecutions };
}
