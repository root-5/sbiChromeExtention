// =======================================
// レバレッジ簡易計算コンポーネント
// =======================================

import { html, useState, useMemo } from '../utils/preact-adapter.js';

export function LeverageCalculatorComp({}) {
    const LEVERAGE_STORAGE_KEY = 'sbiExtLeverageCalculator';
    // localStorage.removeItem(LEVERAGE_STORAGE_KEY); // デバッグ用：設定リセット
    const leverageStyles = useMemo(
        () => `
        #calcToolsContainer {
            margin-top: 1.875em;
        }

        #leverageCalculator {
            margin-top: 1em;
            padding: 0.875em 1em;
            border: 0.0625em dashed #0066cc;
            border-radius: 0.625em;
            background: #f5f9ff;
            display: flex;
            flex-direction: column;
            gap: 0.75em;
        }

        #leverageCalculator h3 {
            margin: 0;
            font-size: 1em;
            color: #004499;
        }

        #leverageCalculator .leverageCalcControls {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.625em 0.875em;
        }

        @media (max-width: 48em) {
            #leverageCalculator .leverageCalcControls {
                grid-template-columns: 1fr;
            }
        }

        #leverageCalculator .leverageCalcControl {
            display: flex;
            flex-direction: column;
            gap: 0.375em;
            padding: 0.625em 0.75em;
            background: #ffffff;
            border: 0.0625em solid #d6e6f7;
            border-radius: 0.5em;
        }

        #leverageCalculator .leverageCalcControl .question {
            font-weight: 600;
            color: #003366;
            line-height: 1.4;
        }

        #leverageCalculator .leverageCalcControl select {
            padding: 0.5em;
            border: 0.0625em solid #b6c6d6;
            border-radius: 0.375em;
            background: #f8fbff;
            font-size: 0.95em;
            color: #333333;
        }

        #leverageCalculator .leverageCalcResult {
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: baseline;
            gap: 0.5em;
            padding: 0.75em 0.875em;
            background: linear-gradient(90deg, #e8f2ff, #f9fcff);
            border: 0.0625em solid #c5daf4;
            border-radius: 0.5em;
        }

        #leverageCalculator .leverageCalcResult .resultLabel {
            font-weight: 700;
            color: #004499;
        }

        #leverageCalculator .leverageCalcResult .resultValue {
            font-size: 1.4em;
            font-weight: 700;
            color: #0066cc;
            text-align: right;
        }

        #leverageCalculator .leverageCalcResult .resultUnit {
            font-weight: 600;
            color: #004499;
        }

        #leverageCalculator .leverageCalcResult .resultDetail {
            grid-column: 1 / -1;
            font-size: 0.9em;
            color: #555555;
            line-height: 1.4;
        }
    `,
        []
    );

    // レバレッジ計算用設定値
    const pulldownData = {
        maxDrawdown: [
            { value: 0.55, text: '最大DD▲30％まで許容（ベース 0.55）' },
            { value: 0.9, text: '最大DD▲50％まで許容（ベース 0.90）' },
            { value: 1.2, text: '最大DD▲66％まで許容（ベース 1.20）' },
        ],
        shockCare: [
            { value: 1, text: 'ケアする（×1）' },
            { value: 55 / 33, text: 'ケアしない（×55/33）' },
        ],
        stockType: [
            { value: 1, text: '指数（×1）' },
            { value: 0.8, text: '大型株複数（×0.80）' },
            { value: 0.66, text: '大型株単体（×0.66）' },
            { value: 0.5, text: '小型株複数（×0.50）' },
            { value: 0.33, text: '小型株単体（×0.33）' },
        ],
        drawdown: [
            { value: 1, text: '直近4年の最高値（×1）' },
            { value: 1.5, text: '直近4年の最高値から30%下落（×1.5）' },
            { value: 2.0, text: '直近4年の最高値から60%下落（×2.0）' },
        ],
    };

    // 状態管理（localStorage の保存値があれば初期値として使用）
    const defaultState = {
        maxDrawdown: pulldownData.maxDrawdown[0].value,
        shockCare: pulldownData.shockCare[0].value,
        stockType: pulldownData.stockType[0].value,
        drawdown: pulldownData.drawdown[0].value,
    };

    const [pulldownState, setPulldownState] = useState(() => {
        try {
            const saved = localStorage.getItem(LEVERAGE_STORAGE_KEY);
            return saved ? JSON.parse(saved) : defaultState;
        } catch (e) {
            return defaultState;
        }
    });

    // 入力変更したときに状態更新とローカルストレージ保存を行う関数
    const handleChange = (key, value) => {
        const newState = { ...pulldownState, [key]: Number(value) };
        setPulldownState(newState);
        localStorage.setItem(LEVERAGE_STORAGE_KEY, JSON.stringify(newState));
    };

    // 計算ロジック（派生値は state から都度計算して useMemo でメモ化）
    const { result, detailText } = useMemo(() => {
        const base = Number(pulldownState.maxDrawdown);
        const shock = Number(pulldownState.shockCare);
        const stock = Number(pulldownState.stockType);
        const drawdown = Number(pulldownState.drawdown);

        const res = base * shock * stock * drawdown;
        const rounded = Math.round(res * 100) / 100;

        return {
            result: rounded.toFixed(2),
            detailText: `ベース ${base.toFixed(2)} × ${shock.toFixed(2)} × ${stock.toFixed(2)} × ${drawdown.toFixed(2)} = ${rounded.toFixed(2)}倍`,
        };
    }, [pulldownState.maxDrawdown, pulldownState.shockCare, pulldownState.stockType, pulldownState.drawdown]);

    return html`
        <style>
            ${leverageStyles}
        </style>
        <div id="calcToolsContainer">
            <h2>計算ツール</h2>
            <div id="leverageCalculator">
                <h3>レバレッジ簡易計算</h3>
                <div class="leverageCalcControls">
                    <label class="leverageCalcControl" for="maxDrawdownSelect">
                        <span class="question">最大DDをどこまで許容するのか</span>
                        <select id="maxDrawdownSelect" value=${pulldownState.maxDrawdown} onChange=${(e) => handleChange('maxDrawdown', e.target.value)}>
                            ${pulldownData.maxDrawdown.map((opt) => html`<option value=${opt.value}>${opt.text}</option>`)}
                        </select>
                    </label>
                    <label class="leverageCalcControl" for="shockSelect">
                        <span class="question">最高値更新中にリーマン級ショックをケアするか</span>
                        <select id="shockSelect" value=${pulldownState.shockCare} onChange=${(e) => handleChange('shockCare', e.target.value)}>
                            ${pulldownData.shockCare.map((opt) => html`<option value=${opt.value}>${opt.text}</option>`)}
                        </select>
                    </label>
                    <label class="leverageCalcControl" for="stockTypeSelect">
                        <span class="question">保有している銘柄は指数・大型株・小型株のどれに近いか</span>
                        <select id="stockTypeSelect" value=${pulldownState.stockType} onChange=${(e) => handleChange('stockType', e.target.value)}>
                            ${pulldownData.stockType.map((opt) => html`<option value=${opt.value}>${opt.text}</option>`)}
                        </select>
                    </label>
                    <label class="leverageCalcControl" for="drawdownLeverageSelect">
                        <span class="question">下落時レバレッジでどれくらいレバレッジをかけるか</span>
                        <select id="drawdownLeverageSelect" value=${pulldownState.drawdown} onChange=${(e) => handleChange('drawdown', e.target.value)}>
                            ${pulldownData.drawdown.map((opt) => html`<option value=${opt.value}>${opt.text}</option>`)}
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
