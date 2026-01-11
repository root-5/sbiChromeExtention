// =======================================
// Preact 関係のインポートまとめ
// =======================================

import { h, render } from '../../libs/preact.module.js';
import { useState, useEffect, useRef, useMemo } from '../../libs/hooks.module.js';
import htm from '../../libs/htm.module.js';

const html = htm.bind(h);

export { h, render, useState, useEffect, useRef, useMemo, html };
