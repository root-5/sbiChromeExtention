// =======================================
// レバレッジ簡易計算コンポーネント
// =======================================

import { html, useState, useMemo } from '../utils/preact-adapter.js';

export function LeverageCalculatorComp({}) {
    const LEVERAGE_STORAGE_KEY = 'sbiExtLeverageCalculator';
    // localStorage.removeItem(LEVERAGE_STORAGE_KEY); // デバッグ用：設定リセット

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
        <div id="calcToolsContainer" class="mt-8">
            <h2 class="mb-2.5 text-blue-600 text-xl font-semibold">計算ツール</h2>
            <div id="leverageCalculator" class="mt-4 p-4 border border-dashed border-blue-600 rounded-lg bg-blue-50 flex flex-col gap-3">
                <h3 class="m-0 text-base text-blue-800 font-bold">レバレッジ簡易計算</h3>
                <div class="grid grid-cols-2 gap-x-3.5 gap-y-2.5 max-md:grid-cols-1">
                    <label class="flex flex-col gap-1.5 p-2.5 bg-white border border-blue-200 rounded-lg" for="maxDrawdownSelect">
                        <span class="font-semibold text-blue-900 leading-snug">最大DDをどこまで許容するのか</span>
                        <select
                            class="p-2 border border-gray-300 rounded-md bg-slate-50 text-sm text-gray-800"
                            id="maxDrawdownSelect"
                            value=${pulldownState.maxDrawdown}
                            onChange=${(e) => handleChange('maxDrawdown', e.target.value)}
                        >
                            ${pulldownData.maxDrawdown.map((opt) => html`<option value=${opt.value}>${opt.text}</option>`)}
                        </select>
                    </label>
                    <label class="flex flex-col gap-1.5 p-2.5 bg-white border border-blue-200 rounded-lg" for="shockSelect">
                        <span class="font-semibold text-blue-900 leading-snug">最高値更新中にリーマン級ショックをケアするか</span>
                        <select
                            class="p-2 border border-gray-300 rounded-md bg-slate-50 text-sm text-gray-800"
                            id="shockSelect"
                            value=${pulldownState.shockCare}
                            onChange=${(e) => handleChange('shockCare', e.target.value)}
                        >
                            ${pulldownData.shockCare.map((opt) => html`<option value=${opt.value}>${opt.text}</option>`)}
                        </select>
                    </label>
                    <label class="flex flex-col gap-1.5 p-2.5 bg-white border border-blue-200 rounded-lg" for="stockTypeSelect">
                        <span class="font-semibold text-blue-900 leading-snug">保有している銘柄は指数・大型株・小型株のどれに近いか</span>
                        <select
                            class="p-2 border border-gray-300 rounded-md bg-slate-50 text-sm text-gray-800"
                            id="stockTypeSelect"
                            value=${pulldownState.stockType}
                            onChange=${(e) => handleChange('stockType', e.target.value)}
                        >
                            ${pulldownData.stockType.map((opt) => html`<option value=${opt.value}>${opt.text}</option>`)}
                        </select>
                    </label>
                    <label class="flex flex-col gap-1.5 p-2.5 bg-white border border-blue-200 rounded-lg" for="drawdownLeverageSelect">
                        <span class="font-semibold text-blue-900 leading-snug">下落時レバレッジでどれくらいレバレッジをかけるか</span>
                        <select
                            class="p-2 border border-gray-300 rounded-md bg-slate-50 text-sm text-gray-800"
                            id="drawdownLeverageSelect"
                            value=${pulldownState.drawdown}
                            onChange=${(e) => handleChange('drawdown', e.target.value)}
                        >
                            ${pulldownData.drawdown.map((opt) => html`<option value=${opt.value}>${opt.text}</option>`)}
                        </select>
                    </label>
                </div>
                <div class="grid grid-cols-[auto_1fr_auto] items-baseline gap-2 p-3 bg-gradient-to-r from-blue-100 to-white border border-blue-200 rounded-lg">
                    <div class="font-bold text-blue-800">計算結果</div>
                    <div class="text-2xl font-bold text-blue-600 text-right" data-leverage-result>${result}</div>
                    <div class="font-semibold text-blue-800">倍</div>
                    <div class="col-span-full text-sm text-gray-600 leading-snug" data-leverage-detail>${detailText}</div>
                </div>
            </div>
        </div>
    `;
}
