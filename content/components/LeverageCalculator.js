import { html, useState, useEffect } from '../utils/preact-adapter.js';

export function LeverageCalculator({ netTotalMarketCap, totalMarketCap }) {
    const LEVERAGE_STORAGE_KEY = 'sbiExtLeverageCalculator';

    // 設定値
    const leverageConfig = {
        maxDrawdown: { dd30: 0.55, dd50: 0.9, dd66: 1.2 },
        shockCare: { care: 1, ignore: 55 / 33 },
        stockType: { index: 1, largeMultiple: 0.8, largeSingle: 0.66, smallMultiple: 0.5, smallSingle: 0.33 },
        drawdown: { recentHigh: 1, drop30: 1.5, drop60: 2.0 },
    };

    const defaultState = {
        maxDrawdown: 'dd30',
        shockCare: 'care',
        stockType: 'index',
        drawdown: 'recentHigh',
    };

    const [state, setState] = useState(() => {
        const saved = localStorage.getItem(LEVERAGE_STORAGE_KEY);
        if (saved) {
            try {
                return { ...defaultState, ...JSON.parse(saved) };
            } catch (e) {
                return defaultState;
            }
        }
        return defaultState;
    });

    const [result, setResult] = useState(0);
    const [detailText, setDetailText] = useState('');

    useEffect(() => {
        const base = leverageConfig.maxDrawdown[state.maxDrawdown] ?? leverageConfig.maxDrawdown[defaultState.maxDrawdown];
        const shock = leverageConfig.shockCare[state.shockCare] ?? leverageConfig.shockCare[defaultState.shockCare];
        const stock = leverageConfig.stockType[state.stockType] ?? leverageConfig.stockType[defaultState.stockType];
        const drawdown = leverageConfig.drawdown[state.drawdown] ?? leverageConfig.drawdown[defaultState.drawdown];

        const res = base * shock * stock * drawdown;
        const rounded = Math.round(res * 100) / 100;

        setResult(rounded.toFixed(2));
        setDetailText(`ベース ${base.toFixed(2)} × ${shock.toFixed(2)} × ${stock.toFixed(2)} × ${drawdown.toFixed(2)} = ${rounded.toFixed(2)}倍`);

        localStorage.setItem(LEVERAGE_STORAGE_KEY, JSON.stringify(state));
    }, [state, leverageConfig, defaultState]);

    const handleChange = (key, value) => {
        setState((prev) => ({ ...prev, [key]: value }));
    };

    return html`
        <div id="calcToolsContainer">
            <h2>計算ツール</h2>
            <div id="leverageCalculator">
                <h3>レバレッジ簡易計算</h3>
                <div class="leverageCalcControls">
                    <label class="leverageCalcControl" for="maxDrawdownSelect">
                        <span class="question">最大DDをどこまで許容するのか</span>
                        <select id="maxDrawdownSelect" value=${state.maxDrawdown} onChange=${(e) => handleChange('maxDrawdown', e.target.value)}>
                            <option value="dd30">最大DD▲30％まで許容（ベース 0.55）</option>
                            <option value="dd50">最大DD▲50％まで許容（ベース 0.90）</option>
                            <option value="dd66">最大DD▲66％まで許容（ベース 1.20）</option>
                        </select>
                    </label>
                    <label class="leverageCalcControl" for="shockSelect">
                        <span class="question">最高値更新中にリーマン級ショックをケアするか</span>
                        <select id="shockSelect" value=${state.shockCare} onChange=${(e) => handleChange('shockCare', e.target.value)}>
                            <option value="care">ケアする（×1）</option>
                            <option value="ignore">ケアしない（×55/33）</option>
                        </select>
                    </label>
                    <label class="leverageCalcControl" for="stockTypeSelect">
                        <span class="question">保有している銘柄は指数・大型株・小型株のどれに近いか</span>
                        <select id="stockTypeSelect" value=${state.stockType} onChange=${(e) => handleChange('stockType', e.target.value)}>
                            <option value="index">指数（×1）</option>
                            <option value="largeMultiple">大型株複数（×0.80）</option>
                            <option value="largeSingle">大型株単体（×0.66）</option>
                            <option value="smallMultiple">小型株複数（×0.50）</option>
                            <option value="smallSingle">小型株単体（×0.33）</option>
                        </select>
                    </label>
                    <label class="leverageCalcControl" for="drawdownLeverageSelect">
                        <span class="question">下落時レバレッジでどれくらいレバレッジをかけるか</span>
                        <select id="drawdownLeverageSelect" value=${state.drawdown} onChange=${(e) => handleChange('drawdown', e.target.value)}>
                            <option value="recentHigh">直近4年の最高値（×1）</option>
                            <option value="drop30">直近4年の最高値から30%下落（×1.5）</option>
                            <option value="drop60">直近4年の最高値から60%下落（×2.0）</option>
                        </select>
                    </label>
                </div>
                <div class="leverageCalcResult">
                    <div class="resultLabel">計算結果</div>
                    <div class="resultValue" data-leverage-result>${result}</div>
                    <div class="resultUnit">倍</div>
                    <div class="resultDetail" data-leverage-detail>${detailText}</div>
                </div>
            </div>
        </div>
    `;
}
