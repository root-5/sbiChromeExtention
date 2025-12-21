// レバレッジ計算の保存キーと係数マスタ
const LEVERAGE_STORAGE_KEY = 'sbiExtLeverageCalculator';
const leverageConfig = {
    maxDrawdown: {
        dd30: 0.55,
        dd50: 0.9,
        dd66: 1.2,
    },
    shockCare: {
        care: 1,
        ignore: 55 / 33,
    },
    stockType: {
        index: 1,
        largeMultiple: 0.8,
        largeSingle: 0.66,
        smallMultiple: 0.5,
        smallSingle: 0.33,
    },
    drawdown: {
        recentHigh: 1,
        drop30: 1.5,
        drop60: 2.0,
    },
};

/**
 * レバレッジ簡易計算パネルを初期化する関数
 * テンプレート挿入後に1度だけ実行し、選択状態の復元・計算・保存を行う
 */
function setupLeverageCalculator() {
    const calculator = document.getElementById('leverageCalculator');
    if (!calculator) return;

    const selects = {
        maxDrawdown: calculator.querySelector('[data-leverage-select="maxDrawdown"]'),
        shockCare: calculator.querySelector('[data-leverage-select="shockCare"]'),
        stockType: calculator.querySelector('[data-leverage-select="stockType"]'),
        drawdown: calculator.querySelector('[data-leverage-select="drawdown"]'),
    };
    const resultValue = calculator.querySelector('[data-leverage-result]');
    const resultDetail = calculator.querySelector('[data-leverage-detail]');

    // 既定値（表示上は最初の選択肢と合わせる）
    const defaultState = {
        maxDrawdown: 'dd30',
        shockCare: 'care',
        stockType: 'index',
        drawdown: 'recentHigh',
    };

    // ローカルストレージから状態を復元
    const saved = localStorage.getItem(LEVERAGE_STORAGE_KEY);
    let state = { ...defaultState };
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
        } catch (error) {
            // パース失敗時は既定値をそのまま利用
        }
    }

    /**
     * 選択状態をUIに反映するヘルパー
     */
    const applyStateToUI = () => {
        Object.entries(selects).forEach(([key, element]) => {
            if (!element) return;
            element.value = state[key];
        });
    };

    /**
     * 選択状態を保存しつつ結果を計算・表示するヘルパー
     */
    const updateResult = () => {
        const base = leverageConfig.maxDrawdown[state.maxDrawdown] ?? leverageConfig.maxDrawdown[defaultState.maxDrawdown];
        const shock = leverageConfig.shockCare[state.shockCare] ?? leverageConfig.shockCare[defaultState.shockCare];
        const stock = leverageConfig.stockType[state.stockType] ?? leverageConfig.stockType[defaultState.stockType];
        const drawdown = leverageConfig.drawdown[state.drawdown] ?? leverageConfig.drawdown[defaultState.drawdown];

        const result = base * shock * stock * drawdown;
        const rounded = Math.round(result * 100) / 100;

        if (resultValue) resultValue.textContent = rounded.toFixed(2);
        if (resultDetail) {
            const detailText = `ベース ${base.toFixed(2)} × ${shock.toFixed(2)} × ${stock.toFixed(2)} × ${drawdown.toFixed(2)} = ${rounded.toFixed(2)}倍`;
            resultDetail.textContent = detailText;
        }

        localStorage.setItem(LEVERAGE_STORAGE_KEY, JSON.stringify(state));
    };

    /**
     * セレクトボックス変更時の処理
     * @param {Event} event changeイベント
     */
    const handleChange = (event) => {
        const target = event.target;
        const key = target.getAttribute('data-leverage-select');
        if (!key) return;

        state = { ...state, [key]: target.value };
        updateResult();
    };

    // イベントハンドラの登録と初期表示
    Object.values(selects).forEach((element) => {
        if (!element) return;
        element.addEventListener('change', handleChange);
    });

    applyStateToUI();
    updateResult();
}
