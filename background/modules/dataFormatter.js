/**
 * ==============================================================
 * データ整形・計算モジュール
 * パース済みデータをUI表示用に変換・集計するロジックを担当
 * ==============================================================
 */

/**
 * 取引履歴データから同一日の同一銘柄・同一売買で集計した整形後の配列を返す関数
 * 例: 2024-01-01にA社を100株買い、同日にさらに200株買いがあった場合、1行にまとめて300株買いとして返す
 * @param {Array} tradingLog 取引履歴データ
 * @returns {Array} 集計後の取引履歴データ配列
 */
export function totalTradingLog(tradingLog) {
    const totaledTradingLog = [];

    tradingLog.forEach((item, _) => {
        const tradeTypeLabel = item.tradeType.includes('買') ? '買' : '売';
        const quantity = Number(String(item.quantity).replace(/[,\s]/g, ''));
        const price = Number(String(item.price).replace(/[^\d.-]/g, ''));

        // 同一銘柄・同一売買・同一日付で重複チェックしつつ、重複している場合は集計
        let isDuplicate = false;
        totaledTradingLog.forEach((existing) => {
            if (existing.date === item.date && existing.code === item.code && existing.tradeType === tradeTypeLabel) {
                const totalQuantity = existing.quantity + quantity;
                existing.price = (existing.price * existing.quantity + price * quantity) / totalQuantity;
                existing.quantity = totalQuantity;
                isDuplicate = true;
            }
        });

        // 重複していなければ新規追加
        if (!isDuplicate) {
            totaledTradingLog.push({
                code: item.code,
                name: item.name,
                date: item.date,
                tradeType: tradeTypeLabel,
                quantity: quantity,
                price: price,
            });
        }
    });

    // コード順、日付順でソート（優先は日付）
    totaledTradingLog.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.code.localeCompare(b.code);
    });
    return totaledTradingLog;
}

/**
 * 円建て口座データからテーブル用データに変換・集計する関数
 * 現物株式と信用建玉を同一銘柄でまとめ、調整後現金を追加している
 * @param {Object} data 円建て口座データ { cashBalance, stocks }
 * @returns {Object} { tableData, totalMarketCap, netTotalMarketCap, leverageManagementData, totalProfit, buyingPower }
 */
export function processAccountDataForTable(data) {
    // 同一銘柄をまとめる
    const mergedDataMap = new Map();
    data.stocks.forEach((stock) => {
        if (mergedDataMap.has(stock.code)) {
            const existing = mergedDataMap.get(stock.code);
            existing.quantity += stock.quantity;
            existing.marketCap += stock.marketCap;
            existing.profitAndLoss += stock.profitAndLoss;
            // 加重平均で取得価格を再計算
            existing.buyPrice = (existing.buyPrice * (existing.quantity - stock.quantity) + stock.buyPrice * stock.quantity) / existing.quantity;
        } else {
            mergedDataMap.set(stock.code, { ...stock });
        }
    });

    // データ配列に変換し、評価額の大きい順にソート
    const graphData = Array.from(mergedDataMap.values()).sort((a, b) => b.marketCap - a.marketCap);

    // 現金と信用建玉を相殺して調整後現金を計算
    const marginTotal = data.stocks.filter((stock) => stock.marginType === '信用').reduce((sum, stock) => sum + stock.marketCap, 0);

    let adjustedCash = 0;
    if (data.cashBalance) {
        adjustedCash = Math.max(0, data.cashBalance - marginTotal);
        // グラフ用データに調整後現金を追加
        graphData.push({
            code: '',
            name: '調整後現金',
            quantity: null,
            buyPrice: null,
            currentPrice: null,
            dayChange: null,
            marketCap: adjustedCash,
            profitAndLoss: null,
        });
    }

    // 合計評価額を計算 (調整後現金含む)
    const totalMarketCap = graphData.reduce((sum, item) => sum + item.marketCap, 0);

    // 純資産を計算（現物は時価評価、信用は損益を加算）
    // 現金 + 現物の時価 + 信用の損益
    const netTotalMarketCap = data.cashBalance + data.stocks.reduce((sum, item) => sum + (item.marginType === '現物' ? item.marketCap : item.profitAndLoss), 0);

    // レバレッジ管理データの計算
    const leverageRatios = [1.5, 1.35, 1.2];
    const leverageManagementData = leverageRatios.map((ratio) => {
        const targetTotalAssets = netTotalMarketCap * ratio;
        const diff = targetTotalAssets - totalMarketCap;
        return {
            label: `${Math.round(ratio * 100)}%基準`,
            diff: diff, // UI側でフォーマットする
            diffText: `¥${Math.floor(diff).toLocaleString()}`,
        };
    });

    // テーブル行データを生成（フォーマット済みテキストを含む）
    const tableTextData = graphData.map((item) => {
        // 調整後現金の場合
        if (item.name === '調整後現金') {
            return {
                name: item.name,
                marketCap: item.marketCap,
                marketCapText: item.marketCap.toLocaleString(),
            };
        }

        // 前日比を計算
        let dayChangeRateText = '-';
        let dayChangeDiffText = '-';
        if (item.dayChange || item.dayChange === 0) {
            // 5時前後に前日比がリセットされるため
            const dayChangeRate = item.currentPrice && item.dayChange ? (item.dayChange / (item.currentPrice - item.dayChange)) * 100 : 0;
            dayChangeRateText = `${dayChangeRate >= 0 ? '+' : ''}${dayChangeRate.toFixed(2)}`;
            dayChangeDiffText = `${item.dayChange >= 0 ? '+' : ''}${item.dayChange.toLocaleString()}`;
        }

        // 損益率を計算
        let profitAndLossRateText = '-';
        let profitAndLossDiffText = '-';
        if (item.buyPrice && item.quantity) {
            const profitRate = (item.profitAndLoss / (item.buyPrice * item.quantity)) * 100;
            profitAndLossRateText = `${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(2)}`;
            profitAndLossDiffText = `${item.profitAndLoss >= 0 ? '+' : ''}${item.profitAndLoss.toLocaleString()}`;
        }

        return {
            code: item.code,
            name: item.name,
            quantity: item.quantity,
            quantityText: item.quantity.toLocaleString(),
            buyPrice: item.buyPrice,
            buyPriceText: Math.floor(item.buyPrice).toLocaleString(),
            currentPrice: item.currentPrice,
            currentPriceText: item.currentPrice.toLocaleString(),
            dayChangeRate: dayChangeRateText,
            dayChangeDiff: dayChangeDiffText,
            profitAndLossRate: profitAndLossRateText,
            profitAndLossDiff: profitAndLossDiffText,
            marketCap: item.marketCap,
            marketCapText: item.marketCap.toLocaleString(),
            profitAndLoss: item.profitAndLoss,
        };
    });

    // 合計損益を計算
    const totalProfit = tableTextData.reduce((sum, item) => sum + (item.profitAndLoss || 0), 0);

    return {
        graphData, // 円グラフ描画用
        tableTextData, // テーブル表示用
        totalMarketCap,
        netTotalMarketCap,
        leverageManagementData,
        totalProfit,
        buyingPower: data.buyingPower,
    };
}

/**
 * 当日約定を集計する関数
 * @param {Array} todayExecutions 当日約定データ
 * @returns {Array} マージ・集計済みのリスト（View用にはさらにフォーマットが必要だが、ここではデータ構造を返す）
 */
export function processTodayExecutions(todayExecutions = []) {
    if (!todayExecutions?.length) return [];

    // 同一銘柄・同一売買・同一日付で集計し、新たな配列を作成
    const aggregatedTodayExecutions = [];
    todayExecutions.forEach((item, _) => {
        const tradeTypeLabel = item.tradeType.includes('買') ? '買' : '売';
        const quantity = Number(String(item.quantity).replace(/[,\s]/g, ''));
        const price = Number(String(item.price).replace(/[^\d.-]/g, ''));

        // 重複チェックしつつ、重複している場合は集計
        let isDuplicate = false;
        aggregatedTodayExecutions.forEach((existing) => {
            if (existing.date === item.date && existing.code === item.code && existing.tradeType === tradeTypeLabel) {
                const totalQuantity = existing.quantity + quantity;
                existing.price = (existing.price * existing.quantity + price * quantity) / totalQuantity;
                existing.quantity = totalQuantity;
                isDuplicate = true;
            }
        });

        // 重複していなければ新規追加
        if (!isDuplicate) {
            aggregatedTodayExecutions.push({
                code: item.code,
                name: item.name,
                date: item.date,
                tradeType: tradeTypeLabel,
                quantity: quantity,
                price: price,
            });
        }
    });

    // コード順ソート
    aggregatedTodayExecutions.sort((a, b) => {
        return a.code.localeCompare(b.code);
    });

    return aggregatedTodayExecutions;
}

/**
 * 株式価格の現在比と株式増減数を計算する関数
 * @param {Object} currentPrices 現在価格データ
 * @param {Array<Object>} totaledTradingLog 整形後取引履歴データ
 * @param {Array<Object>} closePriceData 終値データ
 * @returns {Array} ピボットテーブル用データ
 */
export function calculatePriceChangePivot(currentPrices, totaledTradingLog, closePriceData = []) {
    // 現在価格を銘柄コードで即座に引けるようにする
    const priceMap = new Map(currentPrices.map((cp) => [cp.code, cp.price]));

    // 終値を日付×銘柄コードで即座に引けるようにする
    const closePriceMap = new Map();
    closePriceData.forEach((item) => {
        if (!item?.date || !item.closePrice) return;
        Object.entries(item.closePrice).forEach(([code, price]) => {
            if (price == null) return;
            closePriceMap.set(`${item.date}_${code}`, price);
        });
    });

    // 取引履歴に含まれる全銘柄を抽出（コードと名前のペア）
    const allStocksMap = new Map();
    totaledTradingLog.forEach((trade) => {
        if (!allStocksMap.has(trade.code)) {
            allStocksMap.set(trade.code, { code: trade.code, name: trade.name });
        }
    });
    const allStocks = Array.from(allStocksMap.values());

    // 取引履歴を日付ごとのマップにまとめ直す
    const dateBasedTradingLog = new Map();
    totaledTradingLog.forEach((trade) => {
        if (!dateBasedTradingLog.has(trade.date)) {
            dateBasedTradingLog.set(trade.date, []);
        }
        dateBasedTradingLog.get(trade.date).push(trade);
    });

    // 日付ごとにデータを処理
    const ratioAndQuantity = Array.from(dateBasedTradingLog.entries()).map(([date, dailyTrades]) => {
        // 重複排除のために一度マップを経由させて集計
        const tradeMap = new Map();
        dailyTrades.forEach((trade) => {
            const currentPrice = priceMap.get(trade.code);
            const quantity = trade.tradeType === '買' ? trade.quantity : -trade.quantity;
            let ratio = 0;
            if (currentPrice && trade.price) {
                ratio = ((currentPrice - trade.price) / currentPrice) * 100;
            }

            if (tradeMap.has(trade.code)) {
                const existing = tradeMap.get(trade.code);

                // 同一銘柄で売り買いが完全に相殺される場合
                if (existing.quantity + quantity === 0) {
                    existing.quantity = 0;
                    existing.ratio = 0;
                } else {
                    // 加重平均した価格比率を計算
                    const oldWeight = (1 - existing.ratio / 100) * existing.quantity;
                    const newWeight = (1 - ratio / 100) * quantity;
                    // 分母がゼロになるケースを防ぐ
                    if (existing.quantity + quantity !== 0) {
                        existing.ratio = (-(oldWeight + newWeight) / (existing.quantity + quantity)) * 100 + 100;
                    } else {
                        existing.ratio = 0;
                    }
                    existing.quantity += quantity;
                }
            } else {
                tradeMap.set(trade.code, { code: trade.code, name: trade.name, quantity, ratio });
            }
        });

        // 取引がなかった銘柄は終値と現在値で変化率を計算して補完
        const filledData = allStocks.map((stock) => {
            if (tradeMap.has(stock.code)) {
                return tradeMap.get(stock.code);
            }

            const closePrice = closePriceMap.get(`${date}_${stock.code}`);
            const currentPrice = priceMap.get(stock.code);
            if (closePrice && currentPrice) {
                const ratio = ((currentPrice - closePrice) / closePrice) * 100;
                return { code: stock.code, name: stock.name, quantity: 0, ratio };
            }

            return { code: stock.code, name: stock.name, quantity: 0, ratio: 0 };
        });

        return {
            date: date,
            ratioAndQuantity: filledData,
        };
    });

    return ratioAndQuantity;
}
