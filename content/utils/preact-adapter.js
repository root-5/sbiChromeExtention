import { h, render } from '../../libs/preact.module.js';
import { useState, useEffect, useRef, useMemo, useCallback } from '../../libs/hooks.module.js';
import htm from '../../libs/htm.module.js';

const html = htm.bind(h);

export { h, render, useState, useEffect, useRef, useMemo, useCallback, html };
