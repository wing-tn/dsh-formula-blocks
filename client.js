/* eslint-disable */
/**
 * Formula Blocks — visual block formula builder for the DSH Web UI.
 * Client half: a draggable floating panel registered into shell.overlay,
 * plus launcher buttons in the composer row and the left rail.
 *
 * No build step: plain JS + React.createElement, styles injected by the panel.
 */
window.__ModuleLoader__.load({
  id: '@local/formula-blocks',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    /* ------------------------------------------------------------------ *
     * 0. small utilities
     * ------------------------------------------------------------------ */
    let __id = 1;
    const uid = () => 'n' + __id++;
    const cloneJSON = (x) => JSON.parse(JSON.stringify(x));
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const LS_DOC = 'dsh.formula-blocks.v1.doc';
    const LS_POS = 'dsh.formula-blocks.v1.pos';
    const LS_XP = 'dsh.formula-blocks.v1.xp';
    const LS_DONE = 'dsh.formula-blocks.v1.done';
    const LS_SETTINGS = 'dsh.formula-blocks.v1.settings';
    const LS_FAV = 'dsh.formula-blocks.v1.favorites';
    const LS_CUSTOM = 'dsh.formula-blocks.v2.customBlocks';
    const LS_PINS = 'dsh.formula-blocks.v1.pinnedCats';
    const LS_COLLAPSED = 'dsh.formula-blocks.v1.collapsedCats';

    function readLS(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    }
    function writeLS(key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore quota */ }
    }

    /* ------------------------------------------------------------------ *
     * 1. constants ("unit library", display names, LaTeX names)
     * ------------------------------------------------------------------ */
    const GREEK = {
      alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
      epsilon: '\\epsilon', varepsilon: '\\varepsilon', zeta: '\\zeta', eta: '\\eta',
      theta: '\\theta', iota: '\\iota', kappa: '\\kappa', lambda: '\\lambda',
      mu: '\\mu', nu: '\\nu', xi: '\\xi', pi: '\\pi', rho: '\\rho', sigma: '\\sigma',
      tau: '\\tau', upsilon: '\\upsilon', phi: '\\phi', varphi: '\\varphi',
      chi: '\\chi', psi: '\\psi', omega: '\\omega',
      Gamma: '\\Gamma', Delta: '\\Delta', Theta: '\\Theta', Lambda: '\\Lambda',
      Xi: '\\Xi', Pi: '\\Pi', Sigma: '\\Sigma', Upsilon: '\\Upsilon',
      Phi: '\\Phi', Psi: '\\Psi', Omega: '\\Omega',
    };
    const GREEK_UNICODE = {
      'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\epsilon',
      'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'ι': '\\iota', 'κ': '\\kappa',
      'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
      'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\varphi', 'χ': '\\chi',
      'ψ': '\\psi', 'ω': '\\omega', 'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta',
      'Λ': '\\Lambda', 'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Υ': '\\Upsilon',
      'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega', 'ħ': '\\hbar',
    };
    const UNI = {
      'α': 'α', 'β': 'β', 'γ': 'γ', 'δ': 'δ', 'ε': 'ε', 'ζ': 'ζ', 'η': 'η',
      'θ': 'θ', 'ι': 'ι', 'κ': 'κ', 'λ': 'λ', 'μ': 'μ', 'ν': 'ν', 'ξ': 'ξ',
      'π': 'π', 'ρ': 'ρ', 'σ': 'σ', 'τ': 'τ', 'υ': 'υ', 'φ': 'φ', 'χ': 'χ',
      'ψ': 'ψ', 'ω': 'ω', 'Γ': 'Γ', 'Δ': 'Δ', 'Θ': 'Θ', 'Λ': 'Λ', 'Ξ': 'Ξ',
      'Π': 'Π', 'Σ': 'Σ', 'Υ': 'Υ', 'Φ': 'Φ', 'Ψ': 'Ψ', 'Ω': 'Ω',
      'ħ': 'ħ', '∞': '∞',
    };

    const GREEK_NAME_UNI = {
      alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ',
      eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ',
      pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ',
      chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ',
      Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', hbar: 'ħ',
    };
    const CONSTS = {
      pi:   { sym: 'π', name: '圆周率', value: '3.141592653589793', unit: '' },
      e:    { sym: 'e', name: '自然常数', value: '2.718281828459045', unit: '' },
      c:    { sym: 'c', name: '真空光速', value: '299792458', unit: 'm/s' },
      h:    { sym: 'h', name: '普朗克常数', value: '6.62607015e-34', unit: 'J·s' },
      hbar: { sym: 'ħ', name: '约化普朗克常数', value: '1.054571817e-34', unit: 'J·s' },
      G:    { sym: 'G', name: '万有引力常数', value: '6.67430e-11', unit: 'm³/(kg·s²)' },
      kB:   { sym: 'k_B', name: '玻尔兹曼常数', value: '1.380649e-23', unit: 'J/K' },
      R:    { sym: 'R', name: '理想气体常数', value: '8.314462618', unit: 'J/(mol·K)' },
      NA:   { sym: 'N_A', name: '阿伏伽德罗常数', value: '6.02214076e23', unit: '1/mol' },
      eps0: { sym: 'ε₀', name: '真空介电常数', value: '8.8541878128e-12', unit: 'F/m' },
      mu0:  { sym: 'μ₀', name: '真空磁导率', value: '1.25663706212e-6', unit: 'N/A²' },
      qe:   { sym: 'e⁻', name: '元电荷', value: '1.602176634e-19', unit: 'C' },
      i:    { sym: 'i', name: '虚数单位', value: 'i', unit: '' },
    };

    const CATEGORY_COLOR = {
      num: '#60a5fa', var: '#34d399', const: '#fbbf24', op: '#a78bfa',
      fn: '#22d3ee', frac: '#f472b6', sqrt: '#f472b6', sup: '#f472b6',
      sub: '#f472b6', paren: '#f472b6', sum: '#fb923c', int: '#fb923c',
      pd: '#fb923c', hat: '#fb923c', mat: '#f472b6', call: '#22d3ee',
      neg: '#a78bfa', ph: 'rgba(148,163,184,0.6)',
    };
    const KIND_LABEL = {
      num: '数字', var: '变量', const: '常量', op: '运算', fn: '函数',
      frac: '分式', sqrt: '根式', sup: '幂', sub: '下标', paren: '括号',
      sum: '求和', int: '积分', pd: '偏导', hat: '算符', mat: '矩阵',
      call: '函数调用', neg: '负号', ph: '空位', seq: '并置', tex: 'LaTeX 块',
    };

    /* ------------------------------------------------------------------ *
     * 2. IR constructors
     * ------------------------------------------------------------------ */
    const PH = () => ({ k: 'ph', id: uid() });
    const NUM = (v = '0') => ({ k: 'num', id: uid(), v: String(v) });
    const VAR = (sym = 'x', extra) => Object.assign({ k: 'var', id: uid(), sym, name: '', unit: '', dim: '', domain: '', meaning: '', type: 'scalar', value: '' }, extra || {});
    const CONST = (key) => ({ k: 'const', id: uid(), key, sym: CONSTS[key].sym, name: CONSTS[key].name, value: CONSTS[key].value, unit: CONSTS[key].unit });
    const OP = (op, a = PH(), b = PH()) => ({ k: 'op', id: uid(), op, args: [a, b] });
    const SEQ = (args) => ({ k: 'seq', id: uid(), args: (args && args.length ? args : [PH()]) });
    const TEX = (latex) => ({ k: 'tex', id: uid(), latex: String(latex || '') });
    const NEG = (a = PH()) => ({ k: 'neg', id: uid(), a });
    const FRAC = (a = PH(), b = PH()) => ({ k: 'frac', id: uid(), a, b });
    const SQRT = (a = PH()) => ({ k: 'sqrt', id: uid(), a });
    const SUP = (a = PH(), b = PH()) => ({ k: 'sup', id: uid(), a, b });
    const SUB = (a = PH(), b = PH()) => ({ k: 'sub', id: uid(), a, b });
    const PAREN = (a = PH()) => ({ k: 'paren', id: uid(), a });
    const FN = (name, args) => ({ k: 'fn', id: uid(), name, args: args || [PH()] });
    const CALL = (name) => ({ k: 'call', id: uid(), name, args: [PH()] });
    const CALLX = (name, args) => ({ k: 'call', id: uid(), name, args });
    const SUM = () => ({ k: 'sum', id: uid(), idx: 'i', from: NUM('1'), to: PH(), body: PH() });
    const INT = () => ({ k: 'int', id: uid(), variable: 'x', from: PH(), to: PH(), body: PH() });
    const PD = () => ({ k: 'pd', id: uid(), f: PH(), x: 't' });
    const PDX = (f, x) => ({ k: 'pd', id: uid(), f, x });
    const HAT = (a = PH()) => ({ k: 'hat', id: uid(), a });
    const MAT = (rows = 2, cols = 2) => ({
      k: 'mat', id: uid(),
      rows: Array.from({ length: rows }, () => Array.from({ length: cols }, () => PH())),
    });

    /* ------------------------------------------------------------------ *
     * 3. IR traversal helpers
     * ------------------------------------------------------------------ */
    const CHILD_KEYS = {
      num: [], var: [], const: [], ph: [],
      op: ['args'], fn: ['args'], call: ['args'],
      frac: ['a', 'b'], sqrt: ['a'], sup: ['a', 'b'], sub: ['a', 'b'],
      neg: ['a'], paren: ['a'], sum: ['body', 'from', 'to'],
      int: ['body', 'from', 'to'], pd: ['f'], hat: ['a'], mat: ['rows'], seq: ['args'], tex: [],
    };

    function childNodes(node) {
      const keys = CHILD_KEYS[node.k] || [];
      const out = [];
      for (const key of keys) {
        if (key === 'rows') {
          for (const row of node.rows) for (const cell of row) out.push(cell);
        } else if (key === 'args') {
          for (const a of node.args) out.push(a);
        } else if (node[key] && typeof node[key] === 'object') {
          out.push(node[key]);
        }
      }
      return out;
    }

    function findNode(node, id) {
      if (!node || typeof node !== 'object') return null;
      if (node.id === id) return node;
      for (const child of childNodes(node)) {
        const found = findNode(child, id);
        if (found) return found;
      }
      return null;
    }

    function replaceNode(node, id, next) {
      if (!node || typeof node !== 'object') return node;
      if (node.id === id) return next;
      const copy = { ...node };
      const keys = CHILD_KEYS[node.k] || [];
      for (const key of keys) {
        if (key === 'rows') {
          copy.rows = node.rows.map((row) => row.map((cell) => replaceNode(cell, id, next)));
        } else if (key === 'args') {
          copy.args = node.args.map((arg) => replaceNode(arg, id, next));
        } else if (node[key] && typeof node[key] === 'object') {
          copy[key] = replaceNode(node[key], id, next);
        }
      }
      return copy;
    }

    function firstEmpty(node) {
      if (!node || typeof node !== 'object') return null;
      if (node.k === 'ph') return node.id;
      for (const child of childNodes(node)) {
        const found = firstEmpty(child);
        if (found) return found;
      }
      return null;
    }

    const ATOM_KINDS = ['num', 'var', 'const'];
    function isAtomNode(node) { return !!node && ATOM_KINDS.indexOf(node.k) >= 0; }

    // Deleting a block collapses it instead of leaving a hole:
    // operators merge their operands into a juxtaposition sequence, structures
    // unwrap to their content, '=' keeps the more complete side.
    function collapseDeleted(node) {
      if (!node || typeof node !== 'object') return PH();
      if (node.k === 'ph') return null;
      if (node.k === 'op') {
        const a = node.args[0] || PH();
        const b = node.args[1] || PH();
        const ae = a.k === 'ph';
        const be = b.k === 'ph';
        if (node.op === '=' || node.op === '≠' || node.op === '≤' || node.op === '≥') {
          if (ae && be) return PH();
          return ae ? b : a;
        }
        if (ae && be) return PH();
        if (ae) return b;
        if (be) return a;
        return SEQ([a, b]);
      }
      if (node.k === 'seq') {
        const kids = node.args.filter((k) => k && k.k !== 'ph');
        if (!kids.length) return PH();
        return kids[0];
      }
      if (node.k === 'frac' || node.k === 'sqrt' || node.k === 'sup' || node.k === 'sub'
        || node.k === 'paren' || node.k === 'neg' || node.k === 'hat' || node.k === 'pd') {
        const kids = childNodes(node).filter((k) => k && k.k !== 'ph');
        return kids.length ? kids[0] : PH();
      }
      if (node.k === 'sum' || node.k === 'int') {
        const body = node.body;
        return body && body.k !== 'ph' ? body : PH();
      }
      if (node.k === 'fn' || node.k === 'call') {
        const kids = node.args.filter((k) => k && k.k !== 'ph');
        if (!kids.length) return PH();
        return kids.length === 1 ? kids[0] : SEQ(kids);
      }
      return PH();
    }

    function countNodes(node) {
      if (!node || typeof node !== 'object') return 0;
      let n = 1;
      for (const child of childNodes(node)) n += countNodes(child);
      return n;
    }

    function countPlaceholders(node) {
      if (!node || typeof node !== 'object') return 0;
      let n = node.k === 'ph' ? 1 : 0;
      for (const child of childNodes(node)) n += countPlaceholders(child);
      return n;
    }

    function reid(node) {
      if (!node || typeof node !== 'object') return node;
      const copy = cloneJSON(node);
      const walk = (n) => {
        n.id = uid();
        for (const key of CHILD_KEYS[n.k] || []) {
          if (key === 'rows') {
            for (const row of n.rows) for (const cell of row) walk(cell);
          } else if (key === 'args') {
            for (const a of n.args) walk(a);
          } else if (n[key] && typeof n[key] === 'object') {
            walk(n[key]);
          }
        }
      };
      walk(copy);
      return copy;
    }

    function collectIds(node, map) {
      if (!node || typeof node !== 'object') return;
      map[node.id] = true;
      for (const child of childNodes(node)) collectIds(child, map);
    }

    /* ------------------------------------------------------------------ *
     * 4. LaTeX generation
     * ------------------------------------------------------------------ */
    function symLatex(sym) {
      if (!sym) return '';
      if (GREEK_UNICODE[sym]) return GREEK_UNICODE[sym];
      if (GREEK[sym]) return GREEK[sym];
      if (sym.length === 1) return sym;
      return '\\mathrm{' + sym.replace(/_/g, '\\_') + '}';
    }
    function constLatex(node) {
      if (node.key && CONSTS[node.key]) {
        const c = CONSTS[node.key];
        if (node.key === 'hbar') return '\\hbar';
        if (node.key === 'pi') return '\\pi';
        if (node.key === 'eps0') return '\\varepsilon_0';
        if (node.key === 'mu0') return '\\mu_0';
        if (node.key === 'NA') return 'N_A';
        if (node.key === 'kB') return 'k_B';
        if (node.key === 'qe') return 'q_e';
        return symLatex(c.sym);
      }
      return symLatex(node.sym || '');
    }
    const OP_LATEX = { '+': '+', '-': '-', '×': '\\cdot', '÷': '/', '=': '=', '≠': '\\ne', '≤': '\\le', '≥': '\\ge', '±': '\\pm', '·': '\\cdot' };
    const FUNCS = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'exp', 'ln', 'log', 'lg', 'det', 'Tr', 'max', 'min', 'Re', 'Im'];
    const PREC = { '=': 1, '≠': 1, '≤': 1, '≥': 1, '+': 2, '-': 2, '±': 2, '×': 3, '÷': 3, '·': 3 };

    function nodePrec(node) {
      if (!node) return 99;
      if (node.k === 'op') return PREC[node.op] || 2;
      if (node.k === 'neg') return 2;
      if (node.k === 'seq') return 3;
      return 99;
    }

    function toLatex(node, minPrec) {
      const inner = genLatex(node);
      return nodePrec(node) < (minPrec || 0) ? '(' + inner + ')' : inner;
    }

    function genLatex(node) {
      if (!node || typeof node !== 'object') return '';
      switch (node.k) {
        case 'ph': return '\\square';
        case 'num': return node.v || '0';
        case 'var': return symLatex(node.sym);
        case 'const': return constLatex(node);
        case 'op': {
          const op = OP_LATEX[node.op] || node.op;
          const relational = node.op === '=' || node.op === '≠' || node.op === '≤' || node.op === '≥';
          const pr = PREC[node.op] || 2;
          const left = toLatex(node.args[0], pr);
          const right = toLatex(node.args[1], pr + (relational ? 0 : 1));
          return left + ' ' + op + ' ' + right;
        }
        case 'seq': return node.args.map((a) => toLatex(a, 4)).join('\\, ');
        case 'tex': return node.latex || '';
        case 'neg': return '-' + toLatex(node.a, 3);
        case 'frac': return '\\frac{' + toLatex(node.a) + '}{' + toLatex(node.b) + '}';
        case 'sqrt': return '\\sqrt{' + toLatex(node.a) + '}';
        case 'sup': return '{' + toLatex(node.a) + '}^{' + toLatex(node.b) + '}';
        case 'sub': return '{' + toLatex(node.a) + '}_{' + toLatex(node.b) + '}';
        case 'paren': return '\\left(' + toLatex(node.a) + '\\right)';
        case 'fn': {
          const args = node.args.map((a) => toLatex(a)).join(', ');
          const name = FUNCS.indexOf(node.name) >= 0 ? '\\' + node.name : '\\operatorname{' + node.name + '}';
          return name + '\\left(' + args + '\\right)';
        }
        case 'call': return symLatex(node.name) + '\\left(' + node.args.map((a) => toLatex(a)).join(', ') + '\\right)';
        case 'sum': return '\\sum_{' + symLatex(node.idx) + '=' + toLatex(node.from) + '}^{' + toLatex(node.to) + '} ' + toLatex(node.body);
        case 'int': return '\\int_{' + toLatex(node.from) + '}^{' + toLatex(node.to) + '} ' + toLatex(node.body) + '\\,\\mathrm{d}' + symLatex(node.variable);
        case 'pd': return '\\frac{\\partial ' + toLatex(node.f) + '}{\\partial ' + symLatex(node.x) + '}';
        case 'hat': return '\\hat{' + toLatex(node.a) + '}';
        case 'mat': return '\\begin{pmatrix}' + node.rows.map((row) => row.map((c) => toLatex(c)).join(' & ')).join(' \\\\ ') + '\\end{pmatrix}';
        default: return '';
      }
    }

    function canonical(latex) {
      return String(latex || '')
        .replace(/\\left|\\right|\\,|\\!|\\;|\\ /g, '')
        .replace(/\\cdot/g, '·')
        .replace(/\s+/g, '')
        .trim();
    }

    /* ------------------------------------------------------------------ *
     * 4b. dimensions (L0 check)
     * ------------------------------------------------------------------ */
    const DIM_KEYS = ['M', 'L', 'T', 'I', 'Θ', 'N', 'J'];
    function emptyDim() { const d = {}; DIM_KEYS.forEach((k) => { d[k] = 0; }); return d; }
    function parseDim(text) {
      if (text === null || text === undefined) return null;
      const t = String(text).trim();
      if (!t) return null;
      if (t === '无量纲' || t === '1' || t === '0') return emptyDim();
      const d = emptyDim();
      const parts = t.replace(/[·*]/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
      for (const p of parts) {
        const m = /^([MLTIΘNJ])(?:\^([-+]?\d+(?:\.\d+)?(?:\/[-+]?\d+)?))?$/.exec(p);
        if (!m) return null;
        let exp = 1;
        if (m[2]) {
          if (m[2].indexOf('/') >= 0) { const q = m[2].split('/'); exp = Number(q[0]) / Number(q[1]); }
          else exp = Number(m[2]);
        }
        d[m[1]] = (d[m[1]] || 0) + exp;
      }
      return d;
    }
    function dimEq(a, b) { if (!a || !b) return false; return DIM_KEYS.every((k) => Math.abs((a[k] || 0) - (b[k] || 0)) < 1e-9); }
    function dimAdd(a, b) { if (!a || !b) return null; const d = emptyDim(); DIM_KEYS.forEach((k) => { d[k] = (a[k] || 0) + (b[k] || 0); }); return d; }
    function dimScale(a, f) { if (!a || typeof f !== 'number' || !isFinite(f)) return null; const d = emptyDim(); DIM_KEYS.forEach((k) => { d[k] = (a[k] || 0) * f; }); return d; }
    function dimText(d) {
      if (!d) return '—';
      const parts = DIM_KEYS.filter((k) => Math.abs(d[k] || 0) > 1e-9).map((k) => (Math.abs(d[k] - 1) < 1e-9 ? k : k + '^' + d[k]));
      return parts.length ? parts.join(' ') : '无量纲';
    }
    const SYM_DIM = {
      F: 'M L T^-2', m: 'M', a: 'L T^-2', E: 'M L^2 T^-2', c: 'L T^-1', G: 'M^-1 L^3 T^-2',
      'ħ': 'M L^2 T^-1', h: 'M L^2 T^-1', R: 'M L^2 T^-2 Θ^-1 N^-1', 'ω': 'T^-1',
      'λ': 'L', t: 'T', x: 'L', v: 'L T^-1',
    };
    const CONST_DIM = {
      pi: '无量纲', e: '无量纲', i: '无量纲', c: 'L T^-1', h: 'M L^2 T^-1', hbar: 'M L^2 T^-1',
      G: 'M^-1 L^3 T^-2', kB: 'M L^2 T^-2 Θ^-1', R: 'M L^2 T^-2 Θ^-1 N^-1', NA: 'N^-1',
      eps0: 'M^-1 L^-3 T^4 I^2', mu0: 'M L T^-2 I^-2', qe: 'I T',
    };
    function inferDim(root) {
      const issues = [];
      const unknown = [];
      function walk(n) {
        if (!n) return null;
        switch (n.k) {
          case 'ph': unknown.push('空位'); return null;
          case 'num': return emptyDim();
          case 'var': {
            const d = parseDim(n.dim) || parseDim(SYM_DIM[n.sym]);
            if (!d) unknown.push(n.sym || '变量');
            return d;
          }
          case 'const': return parseDim(CONST_DIM[n.key] || '无量纲');
          case 'op': {
            const A = walk(n.args[0]);
            const B = walk(n.args[1]);
            const rel = n.op === '=' || n.op === '≠' || n.op === '≤' || n.op === '≥';
            if (rel) {
              if (A && B && !dimEq(A, B)) issues.push('关系两侧量纲不一致：' + dimText(A) + ' ≠ ' + dimText(B));
              return A || B;
            }
            if (n.op === '+' || n.op === '-' || n.op === '±') {
              if (A && B && !dimEq(A, B)) issues.push('加减项量纲不一致：' + dimText(A) + ' ≠ ' + dimText(B));
              return A || B;
            }
            if (n.op === '×' || n.op === '·') return (A && B) ? dimAdd(A, B) : null;
            if (n.op === '÷') return (A && B) ? dimAdd(A, dimScale(B, -1)) : null;
            return null;
          }
          case 'seq': {
            let out = emptyDim();
            n.args.forEach((child) => {
              const d = walk(child);
              if (d) out = dimAdd(out, d);
            });
            return out;
          }
          case 'tex': unknown.push('LaTeX 块'); return null;
          case 'neg': return walk(n.a);
          case 'frac': { const A = walk(n.a); const B = walk(n.b); return (A && B) ? dimAdd(A, dimScale(B, -1)) : null; }
          case 'sqrt': return dimScale(walk(n.a), 0.5);
          case 'sup': {
            const base = walk(n.a);
            const expNode = n.b;
            if (expNode && expNode.k === 'num' && base) return dimScale(base, Number(expNode.v) || 0);
            walk(n.b);
            return null;
          }
          case 'sub': walk(n.b); return walk(n.a);
          case 'paren': return walk(n.a);
          case 'fn': {
            n.args.forEach((arg) => {
              const d = walk(arg);
              if (d && !dimEq(d, emptyDim())) issues.push('函数 ' + n.name + ' 的参数应无量纲，实际为 ' + dimText(d));
            });
            return emptyDim();
          }
          case 'call': n.args.forEach(walk); return null;
          case 'sum': return walk(n.body);
          case 'int': {
            const body = walk(n.body);
            const dv = parseDim(SYM_DIM[n.variable]) || null;
            return body ? (dv ? dimAdd(body, dv) : body) : null;
          }
          case 'pd': {
            const f = walk(n.f);
            const dv = parseDim(SYM_DIM[n.x]) || null;
            return f ? (dv ? dimAdd(f, dimScale(dv, -1)) : f) : null;
          }
          case 'hat': return walk(n.a);
          case 'mat': {
            let first = null;
            n.rows.forEach((row) => row.forEach((cell) => {
              const d = walk(cell);
              if (first && d && !dimEq(first, d)) issues.push('矩阵元素量纲不一致');
              else if (!first && d) first = d;
            }));
            return first;
          }
          default: return null;
        }
      }
      const dim = walk(root);
      return { dim, issues, unknown: Array.from(new Set(unknown)) };
    }

    /* ------------------------------------------------------------------ *
     * 4c. Python preview / import parsers
     * ------------------------------------------------------------------ */
    const PY_SYM = {
      'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon', 'ζ': 'zeta',
      'η': 'eta', 'θ': 'theta', 'ι': 'iota', 'κ': 'kappa', 'λ': 'lambda', 'μ': 'mu',
      'ν': 'nu', 'ξ': 'xi', 'π': 'pi', 'ρ': 'rho', 'σ': 'sigma', 'τ': 'tau', 'υ': 'upsilon',
      'φ': 'phi', 'χ': 'chi', 'ψ': 'psi', 'ω': 'omega', 'Γ': 'Gamma', 'Δ': 'Delta',
      'Θ': 'Theta', 'Λ': 'Lambda', 'Ξ': 'Xi', 'Π': 'Pi', 'Σ': 'Sigma', 'Υ': 'Upsilon',
      'Φ': 'Phi', 'Ψ': 'Psi', 'Ω': 'Omega', 'ħ': 'hbar',
    };
    const PY_CONST = { pi: 'sp.pi', e: 'sp.E', i: 'sp.I', c: 'c', h: 'h', hbar: 'hbar', G: 'G', kB: 'kB', R: 'R', NA: 'NA', eps0: 'eps0', mu0: 'mu0', qe: 'qe' };
    function pySym(sym) {
      if (PY_SYM[sym]) return PY_SYM[sym];
      const s = String(sym || 'x').replace(/[^A-Za-z0-9_]/g, '_');
      return /^[A-Za-z_]/.test(s) ? s : ('v_' + s);
    }
    function toPython(node) {
      if (!node) return '';
      switch (node.k) {
        case 'ph': return '0  # 空位';
        case 'num': return node.v || '0';
        case 'var': return pySym(node.sym);
        case 'const': return PY_CONST[node.key] || pySym(node.sym);
        case 'op': {
          const l = toPython(node.args[0]);
          const r = toPython(node.args[1]);
          const map = { '+': ' + ', '-': ' - ', '×': ' * ', '÷': ' / ', '=': ' - ', '±': ' + ', '·': ' * ', '≤': ' <= ', '≥': ' >= ', '≠': ' != ' };
          return '(' + l + (map[node.op] || (' ' + node.op + ' ')) + r + ')';
        }
        case 'seq': return '(' + node.args.map(toPython).join(' * ') + ')';
        case 'tex': return '0  # LaTeX-only block';
        case 'neg': return '(-' + toPython(node.a) + ')';
        case 'frac': return '((' + toPython(node.a) + ')/(' + toPython(node.b) + '))';
        case 'sqrt': return 'sp.sqrt(' + toPython(node.a) + ')';
        case 'sup': return '((' + toPython(node.a) + ')**(' + toPython(node.b) + '))';
        case 'sub': return toPython(node.a) + '_' + toPython(node.b);
        case 'paren': return '(' + toPython(node.a) + ')';
        case 'fn': return (node.name === 'ln' ? 'sp.log' : ('sp.' + node.name)) + '(' + node.args.map(toPython).join(', ') + ')';
        case 'call': return pySym(node.name) + '(' + node.args.map(toPython).join(', ') + ')';
        case 'sum': return 'sp.Sum(' + toPython(node.body) + ', (' + pySym(node.idx) + ', ' + toPython(node.from) + ', ' + toPython(node.to) + '))';
        case 'int': return 'sp.Integral(' + toPython(node.body) + ', (' + pySym(node.variable) + ', ' + toPython(node.from) + ', ' + toPython(node.to) + '))';
        case 'pd': return 'sp.diff(' + toPython(node.f) + ', ' + pySym(node.x) + ')';
        case 'hat': return toPython(node.a);
        case 'mat': return 'sp.Matrix([' + node.rows.map((row) => '[' + row.map(toPython).join(', ') + ']').join(', ') + '])';
        default: return '';
      }
    }
    function pythonSnippet(root, name) {
      const names = [];
      (function walk(n) {
        if (!n) return;
        if (n.k === 'var') names.push(pySym(n.sym));
        childNodes(n).forEach(walk);
      })(root);
      const uniq = Array.from(new Set(names.filter((x) => x && x.indexOf('sp.') !== 0)));
      const lines = [
        '# 由「公式积木」生成；可直接编辑后交给 Python / SymPy 运行',
        'import sympy as sp',
        uniq.length ? (uniq.join(', ') + ' = sp.symbols(\'' + uniq.join(' ') + '\')') : '# 没有自由符号',
        '',
        'expr = ' + toPython(root),
        'sp.pprint(expr)',
      ];
      if (name && String(name).trim()) lines.push('# formula: ' + name);
      return lines.join('\n');
    }

    function readGroup(s, i) {
      while (i < s.length && s[i] === ' ') i++;
      if (s[i] !== '{') {
        let j = i;
        if (s[j] === '\\') { j++; while (j < s.length && /[A-Za-z]/.test(s[j])) j++; }
        else if (s[j] !== undefined) j++;
        return { value: s.slice(i, j), end: j };
      }
      let depth = 0;
      for (let j = i; j < s.length; j++) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') { depth--; if (depth === 0) return { value: s.slice(i + 1, j), end: j + 1 }; }
      }
      return null;
    }
    function latexToPlain(src) {
      let s = String(src || '');
      s = s.replace(/\$\$?/g, '').replace(/\\\[|\\\]|\\\(|\\\)/g, '');
      s = s.replace(/\\left|\\right/g, '');
      s = s.replace(/\\(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|hbar)/g, (m, n) => GREEK_NAME_UNI[n] || n);
      for (let guard = 0; guard < 60; guard++) {
        const idx = s.indexOf('\\frac');
        if (idx < 0) break;
        const a = readGroup(s, idx + 5);
        if (!a) { s = s.replace('\\frac', ''); continue; }
        const b = readGroup(s, a.end);
        if (!b) { s = s.replace('\\frac', ''); continue; }
        s = s.slice(0, idx) + '((' + a.value + ')/(' + b.value + '))' + s.slice(b.end);
      }
      for (let guard = 0; guard < 60; guard++) {
        const idx = s.indexOf('\\sqrt');
        if (idx < 0) break;
        const a = readGroup(s, idx + 5);
        if (!a) { s = s.replace('\\sqrt', ''); continue; }
        s = s.slice(0, idx) + 'sqrt(' + a.value + ')' + s.slice(a.end);
      }
      s = s.replace(/\\(cdot|times)/g, '*').replace(/\\div/g, '/').replace(/\\pm/g, '±').replace(/\\le/g, '<=').replace(/\\ge/g, '>=').replace(/\\ne/g, '!=');
      s = s.replace(/\\[A-Za-z]+/g, '');
      for (let guard = 0; guard < 60; guard++) {
        let changed = false;
        s = s.replace(/\^\{([^{}]*)\}/g, (m, g) => { changed = true; return '^(' + g + ')'; });
        s = s.replace(/_\{([^{}]*)\}/g, (m, g) => { changed = true; return '_(' + g + ')'; });
        if (!changed) break;
      }
      s = s.replace(/\{/g, '(').replace(/\}/g, ')');
      // 手写 LaTeX 常把乘积写成相邻字母（mc^2、4ac）：先保护函数名，再补显式乘号
      const FN_WORDS = ['arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'sqrt', 'sin', 'cos', 'tan', 'exp', 'ln', 'log'];
      const guards = [];
      FN_WORDS.forEach((w, i) => {
        const token = '@F' + i + '@';
        if (s.indexOf(w) >= 0) { s = s.split(w).join(token); guards.push([token, w]); }
      });
      s = s.replace(/([A-Za-z])(?=[A-Za-z])/g, '$1*');
      guards.forEach(([token, w]) => { s = s.split(token).join(w); });
      return s;
    }
    function lexMath(s) {
      const toks = [];
      let i = 0;
      while (i < s.length) {
        const ch = s[i];
        if (/\s/.test(ch)) { i++; continue; }
        if (/[0-9.]/.test(ch)) {
          let j = i;
          while (j < s.length && /[0-9.]/.test(s[j])) j++;
          if ((s[j] === 'e' || s[j] === 'E') && /[0-9+\-]/.test(s[j + 1] || '')) {
            j++;
            if (s[j] === '+' || s[j] === '-') j++;
            while (j < s.length && /[0-9]/.test(s[j])) j++;
          }
          toks.push({ t: 'num', v: s.slice(i, j) });
          i = j;
          continue;
        }
        if (/[A-Za-z_\u0370-\u03ff\u0127]/.test(ch)) {
          let j = i;
          while (j < s.length && /[A-Za-z0-9_\u0370-\u03ff\u0127]/.test(s[j])) j++;
          toks.push({ t: 'id', v: s.slice(i, j) });
          i = j;
          continue;
        }
        toks.push({ t: 'op', v: ch });
        i++;
      }
      return toks;
    }
    function parseMathInput(src, dialect) {
      let s = String(src || '').trim();
      if (!s) throw new Error('输入为空');
      if (dialect === 'latex') s = latexToPlain(s);
      else {
        const line = (s.split(/\r?\n/).find((l) => l.indexOf('=') >= 0) || s).trim();
        s = line.replace(/#.*$/, '').replace(/\b(math|np|numpy|sympy|sp)\./g, '').replace(/\*\*/g, '^');
      }
      const toks = lexMath(s);
      if (!toks.length) throw new Error('没有可解析的内容');
      let pos = 0;
      const peek = () => toks[pos];
      const next = () => toks[pos++];
      function postfix(node) {
        let base = node;
        while (peek() && (peek().v === '^' || peek().v === '_')) {
          const op = next().v;
          const rhs = primary();
          base = op === '^' ? SUP(base, rhs) : SUB(base, rhs);
        }
        return base;
      }
      function primary() {
        const t = next();
        if (!t) return PH();
        if (t.t === 'num') {
          const v = Number(t.v);
          return NUM(isFinite(v) ? String(v) : '0');
        }
        if (t.t === 'id') {
          let node;
          if (peek() && peek().v === '(') {
            next();
            const args = [];
            if (peek() && peek().v !== ')') {
              args.push(expr(0));
              while (peek() && peek().v === ',') { next(); args.push(expr(0)); }
            }
            if (peek() && peek().v === ')') next();
            const name = t.v;
            const low = name.toLowerCase();
            if (low === 'sqrt') node = args[0] ? SQRT(args[0]) : SQRT();
            else if (['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'exp', 'ln', 'log', 'sinh', 'cosh', 'tanh'].indexOf(low) >= 0) node = FN(low, args.length ? args : [PH()]);
            else node = CALLX(name, args.length ? args : [PH()]);
          } else {
            node = VAR(t.v);
          }
          return postfix(node);
        }
        if (t.v === '-') return NEG(postfix(primary()));
        if (t.v === '+') return postfix(primary());
        if (t.v === '(') {
          const e = expr(0);
          if (peek() && peek().v === ')') next();
          return postfix(PAREN(e));
        }
        if (t.v === '^') return primary();
        return PH();
      }
      function expr(minPrec) {
        let left = primary();
        for (;;) {
          const t = peek();
          if (!t) break;
          const prec = t.v === '=' ? 1 : (['+', '-', '±'].indexOf(t.v) >= 0 ? 2 : (['*', '/'].indexOf(t.v) >= 0 ? 3 : -1));
          if (prec < 0) {
            const implicit = t.t === 'num' || t.t === 'id' || t.v === '(';
            if (!implicit || 4 < minPrec) break;
            const right = expr(5);
            left = OP('×', left, right);
            continue;
          }
          if (prec < minPrec) break;
          next();
          const right = expr(prec + 1);
          if (t.v === '=') left = OP('=', left, right);
          else if (t.v === '+') left = OP('+', left, right);
          else if (t.v === '-') left = OP('-', left, right);
          else if (t.v === '±') left = OP('±', left, right);
          else if (t.v === '*') left = OP('×', left, right);
          else if (t.v === '/') left = FRAC(left, right);
        }
        return left;
      }
      let result = expr(0);
      if (dialect !== 'latex') {
        const eq = s.indexOf('=');
        if (eq > 0) {
          const lhs = s.slice(0, eq).trim();
          const rhs = s.slice(eq + 1).trim();
          const saved = s;
          s = lhs;
          pos = 0;
          const lt = lexMath(lhs);
          if (lt.length) { toks.length = 0; lt.forEach((x) => toks.push(x)); result = expr(0); }
          const lhsNode = result;
          const rt = lexMath(rhs);
          toks.length = 0; rt.forEach((x) => toks.push(x)); pos = 0;
          const rhsNode = expr(0);
          result = OP('=', lhsNode, rhsNode);
          s = saved;
        }
      }
      return result;
    }

    function extractLatexCandidates(text) {
      const src = String(text || '');
      const found = [];
      const push = (latex, origin) => {
        const s = String(latex || '').trim();
        if (!s) return;
        const key = canonical(s);
        if (!key) return;
        if (found.some((f) => canonical(f.latex) === key)) return;
        found.push({ id: 'c' + found.length, latex: s, origin });
      };
      let m;
      const env = /\\begin\{(equation\*?|align\*?|gather\*?|multline\*?|displaymath)\}([\s\S]*?)\\end\{\1\}/g;
      while ((m = env.exec(src))) push(m[2], '环境 ' + m[1]);
      const dd = /\$\$([\s\S]+?)\$\$/g;
      while ((m = dd.exec(src))) push(m[1], '$$ 块');
      const inline = /\$([^$\n]{2,})\$/g;
      while ((m = inline.exec(src))) push(m[1], '行内 $');
      if (!found.length) {
        src.split(/\r?\n/).forEach((line) => {
          const t = line.trim();
          if (t.length > 3 && t.indexOf('=') > 0 && !/[。；]/.test(t)) push(t, '文本行');
        });
      }
      return found.slice(0, 80);
    }

    /* ------------------------------------------------------------------ *
     * 4d. local backend API (same-origin, provided by the Host half)
     * ------------------------------------------------------------------ */
    const API_HEADERS = { 'content-type': 'application/json', 'x-formula-blocks': '1' };
    async function apiGet(path) {
      const res = await fetch('/formula-blocks/api/' + path, { headers: API_HEADERS, credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }
    async function apiPost(path, body) {
      const res = await fetch('/formula-blocks/api/' + path, {
        method: 'POST', headers: API_HEADERS, credentials: 'same-origin', body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }

    /* ------------------------------------------------------------------ *
     * 5. templates / quests
     * ------------------------------------------------------------------ */
    function tplNewton() {
      return OP('=', VAR('F', { dim: 'M L T^-2', unit: 'N', name: '合外力', meaning: '物体所受合外力' }),
        OP('×', VAR('m', { dim: 'M', unit: 'kg', name: '质量' }), VAR('a', { dim: 'L T^-2', unit: 'm/s²', name: '加速度' })));
    }
    function tplMassEnergy() {
      return OP('=', VAR('E', { dim: 'M L^2 T^-2', unit: 'J', name: '能量' }),
        OP('×', VAR('m', { dim: 'M', unit: 'kg', name: '质量' }), SUP(CONST('c'), NUM('2'))));
    }
    function tplGas() {
      return OP('=', OP('×', VAR('p', { dim: 'M L^-1 T^-2', unit: 'Pa', name: '压强' }), VAR('V', { dim: 'L^3', unit: 'm³', name: '体积' })),
        OP('×', VAR('n', { dim: 'N', unit: 'mol', name: '物质的量' }), OP('×', CONST('R'), VAR('T', { dim: 'Θ', unit: 'K', name: '温度' }))));
    }
    function tplHarmonic() {
      return OP('=', CALLX('x', [VAR('t', { dim: 'T', unit: 's', name: '时间' })]),
        OP('×', VAR('A', { dim: 'L', unit: 'm', name: '振幅' }),
          FN('cos', [OP('+', OP('×', VAR('ω', { dim: 'T^-1', unit: 'rad/s', name: '角频率' }), VAR('t', { dim: 'T', unit: 's', name: '时间' })), VAR('φ', { dim: '无量纲', name: '初相位' }))])));
    }
    function tplQuadratic() {
      return OP('=', VAR('x', { dim: '无量纲', name: '未知数' }), FRAC(
        OP('±', NEG(VAR('b', { dim: '无量纲', name: '一次项系数' })), SQRT(OP('-', SUP(VAR('b', { dim: '无量纲', name: '一次项系数' }), NUM('2')), OP('×', NUM('4'), OP('×', VAR('a', { dim: '无量纲', name: '二次项系数' }), VAR('c', { dim: '无量纲', name: '常数项' })))))),
        OP('×', NUM('2'), VAR('a', { dim: '无量纲', name: '二次项系数' })),
      ));
    }
    function tplWave() {
      return OP('=', VAR('v', { dim: 'L T^-1', unit: 'm/s', name: '波速' }),
        OP('×', VAR('λ', { dim: 'L', unit: 'm', name: '波长' }), VAR('f', { dim: 'T^-1', unit: 'Hz', name: '频率' })));
    }
    function tplGravity() {
      return OP('=', VAR('F', { dim: 'M L T^-2', unit: 'N', name: '引力' }), OP('×', CONST('G'), FRAC(
        OP('×', SUB(VAR('m', { dim: 'M', unit: 'kg', name: '质量 1' }), NUM('1')), SUB(VAR('m', { dim: 'M', unit: 'kg', name: '质量 2' }), NUM('2'))),
        SUP(VAR('r', { dim: 'L', unit: 'm', name: '距离' }), NUM('2')),
      )));
    }
    function tplSchrodinger() {
      return OP('=', OP('×', CONST('i'), OP('×', CONST('hbar'), PDX(VAR('ψ', { dim: '无量纲', name: '波函数' }), 't'))),
        OP('×', HAT(VAR('H', { dim: 'M L^2 T^-2', unit: 'J', name: '哈密顿量' })), VAR('ψ', { dim: '无量纲', name: '波函数' })));
    }

    const QUESTS = [
      { id: 'newton', title: '牛顿第二定律', hint: 'F = ma', xp: 30, build: tplNewton },
      { id: 'emc2', title: '质能方程', hint: 'E = mc²', xp: 30, build: tplMassEnergy },
      { id: 'gas', title: '理想气体状态方程', hint: 'pV = nRT', xp: 40, build: tplGas },
      { id: 'harmonic', title: '简谐振动通解', hint: 'x(t)=A cos(ωt+φ)', xp: 50, build: tplHarmonic },
      { id: 'quad', title: '二次方程求根', hint: 'x=(-b±√(b²-4ac))/(2a)', xp: 50, build: tplQuadratic },
      { id: 'wave', title: '波速关系', hint: 'v = λf', xp: 20, build: tplWave },
    ];
    const TEMPLATES = [
      { id: 'tpl-gravity', label: '万有引力', build: tplGravity },
      { id: 'tpl-schrodinger', label: '薛定谔方程（简化）', build: tplSchrodinger },
    ];

    /* ------------------------------------------------------------------ *
     * 6. palette
     * ------------------------------------------------------------------ */
    const B = {
      num: () => NUM('0'),
      var: () => VAR('x'),
      const_c: () => CONST('c'),
      const_pi: () => CONST('pi'),
      const_hbar: () => CONST('hbar'),
      add: () => OP('+'),
      subOp: () => OP('-'),
      mul: () => OP('×'),
      div: () => OP('÷'),
      eq: () => OP('='),
      pm: () => OP('±'),
      neg: () => NEG(),
      frac: () => FRAC(),
      sqrt: () => SQRT(),
      sup: () => SUP(),
      sub: () => SUB(),
      paren: () => PAREN(),
      fn_sin: () => FN('sin'),
      fn_cos: () => FN('cos'),
      fn_tan: () => FN('tan'),
      fn_exp: () => FN('exp'),
      fn_ln: () => FN('ln'),
      fn_log: () => FN('log'),
      sum: () => SUM(),
      int: () => INT(),
      pd: () => PD(),
      hat: () => HAT(),
      call: () => CALL('f'),
      mat: () => MAT(2, 2),
    };

    const PALETTE = [
      {
        group: '基本块', color: '#60a5fa', items: [
          { id: 'num', label: '数字', glyph: '0' },
          { id: 'var', label: '变量', glyph: 'x' },
          { id: 'const_c', label: '光速 c', glyph: 'c' },
          { id: 'const_pi', label: '圆周率 π', glyph: 'π' },
          { id: 'const_hbar', label: '约化普朗克 ħ', glyph: 'ħ' },
        ],
      },
      {
        group: '运算', color: '#a78bfa', items: [
          { id: 'add', label: '加', glyph: '+' },
          { id: 'subOp', label: '减', glyph: '−' },
          { id: 'mul', label: '乘', glyph: '×' },
          { id: 'div', label: '除', glyph: '÷' },
          { id: 'eq', label: '等号', glyph: '=' },
          { id: 'pm', label: '正负', glyph: '±' },
          { id: 'neg', label: '负号', glyph: '−x' },
        ],
      },
      {
        group: '结构', color: '#f472b6', items: [
          { id: 'frac', label: '分式', glyph: 'a/b' },
          { id: 'sqrt', label: '根号', glyph: '√' },
          { id: 'sup', label: '幂', glyph: 'x²' },
          { id: 'sub', label: '下标', glyph: 'xᵢ' },
          { id: 'paren', label: '括号', glyph: '( )' },
          { id: 'mat', label: '矩阵 2×2', glyph: '[ ]' },
        ],
      },
      {
        group: '函数与算符', color: '#22d3ee', items: [
          { id: 'fn_sin', label: 'sin', glyph: 'sin' },
          { id: 'fn_cos', label: 'cos', glyph: 'cos' },
          { id: 'fn_exp', label: 'exp', glyph: 'exp' },
          { id: 'fn_ln', label: 'ln', glyph: 'ln' },
          { id: 'fn_log', label: 'log', glyph: 'log' },
          { id: 'sum', label: '求和 Σ', glyph: 'Σ' },
          { id: 'int', label: '积分 ∫', glyph: '∫' },
          { id: 'pd', label: '偏导 ∂', glyph: '∂' },
          { id: 'hat', label: '算符帽', glyph: 'Ĥ' },
          { id: 'call', label: '函数调用 f(t)', glyph: 'f(t)' },
        ],
      },
    ];

    /* ------------------------------------------------------------------ *
     * 7. module-level UI store (panel visibility)
     * ------------------------------------------------------------------ */
    const ui = { open: false, listeners: new Set() };
    const runtime = { sessionId: null };
    function setOpen(v) {
      ui.open = v;
      ui.listeners.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
    }
    function useOpen() {
      const [, force] = useState(0);
      useEffect(() => {
        const l = () => force((x) => x + 1);
        ui.listeners.add(l);
        return () => ui.listeners.delete(l);
      }, []);
      return ui.open;
    }

    /* ------------------------------------------------------------------ *
     * 8. persistence
     * ------------------------------------------------------------------ */
    function defaultDoc() {
      return { name: '未命名公式', root: OP('=', PH(), PH()), updatedAt: Date.now() };
    }
    function loadDoc() {
      const saved = readLS(LS_DOC, null);
      if (saved && saved.root && saved.root.k) {
        let maxId = 0;
        const walk = (n) => {
          const m = /^n(\d+)$/.exec(n.id || '');
          if (m) maxId = Math.max(maxId, Number(m[1]));
          for (const c of childNodes(n)) walk(c);
        };
        walk(saved.root);
        __id = maxId + 1;
        return { name: saved.name || '未命名公式', root: saved.root, updatedAt: saved.updatedAt || Date.now() };
      }
      return defaultDoc();
    }
    function loadXp() { return Number(readLS(LS_XP, 0)) || 0; }
    function loadDone() { const d = readLS(LS_DONE, {}); return d && typeof d === 'object' ? d : {}; }
    const DEFAULT_SETTINGS = { zoomStep: 0.1, showHints: true, mathSize: 27, accent: '#4f8cff', defaultView: 'tree', keepFavorites: true, seenTutorial: false, mathpixId: '', mathpixKey: '' };
    function loadSettings() { return Object.assign({}, DEFAULT_SETTINGS, readLS(LS_SETTINGS, {}) || {}); }
    function loadFavorites() { const f = readLS(LS_FAV, []); return Array.isArray(f) ? f : []; }

    /* ------------------------------------------------------------------ *
     * 8b. projects & rows (multi-line worksheet, defensive storage)
     * ------------------------------------------------------------------ */
    const LS_PROJECTS = 'dsh.formula-blocks.v2.projects';
    const MAX_ROWS = 40;
    const MAX_PROJECTS = 20;
    function safeId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
    function isValidNode(n) {
      if (!n || typeof n !== 'object' || typeof n.k !== 'string') return false;
      if (!n.id) return false;
      if (!Object.prototype.hasOwnProperty.call(CHILD_KEYS, n.k)) return false;
      for (const c of childNodes(n)) if (!isValidNode(c)) return false;
      return true;
    }
    function cleanNode(node) {
      if (!node || typeof node !== 'object') return node;
      const copy = { ...node };
      for (const key of CHILD_KEYS[node.k] || []) {
        if (key === 'rows') copy.rows = node.rows.map((row) => row.map((cell) => cleanNode(cell)));
        else if (key === 'args') copy.args = node.args.map((arg) => cleanNode(arg));
        else if (node[key] && typeof node[key] === 'object') copy[key] = cleanNode(node[key]);
      }
      if (copy.k === 'op' && copy.op === '=' && Array.isArray(copy.args) && copy.args.length === 2) {
        const a = copy.args[0];
        const b = copy.args[1];
        const aPh = a && a.k === 'ph';
        const bPh = b && b.k === 'ph';
        if (aPh && !bPh) return b;
        if (!aPh && bPh) return a;
      }
      return copy;
    }
    function loadCustomBlocks() {
      try {
        const raw = readLS(LS_CUSTOM, null);
        const list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.blocks) ? raw.blocks : []);
        return list.filter((b) => b && typeof b.id === 'string' && isValidNode(b.root)).slice(0, 80).map((b) => ({
          id: b.id,
          name: String(b.name || '我的块').slice(0, 40),
          category: String(b.category || '我的公式').slice(0, 24),
          root: b.root,
          createdAt: Number(b.createdAt) || Date.now(),
        }));
      } catch (e) { return []; }
    }

    function loadPins() {
      try {
        const raw = readLS(LS_PINS, null);
        return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string').slice(0, 60) : [];
      } catch (e) { return []; }
    }

    function loadCollapsedCats() {
      try {
        const raw = readLS(LS_COLLAPSED, null);
        return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string').slice(0, 60) : [];
      } catch (e) { return []; }
    }

    function countTex(node) {
      if (!node || typeof node !== 'object') return 0;
      if (node.k === 'tex') return 1;
      let n = 0;
      for (const child of childNodes(node)) n += countTex(child);
      return n;
    }

    function parseLatexOrTex(text) {
      const raw = String(text || '');
      // Commands the block IR cannot represent faithfully become a LaTeX-preserving block.
      if (/\\mathcal|\\mathbb|\\mathbf|\\vec|\\prod|\\left|\\right|\\mid|\\begin|\\operatorname|\\substack|\\overset|\\underset|\\label|\\tag/.test(raw)) return TEX(raw);
      try {
        const parsed = parseMathInput(raw, 'latex');
        if (!parsed || !isValidNode(parsed)) return TEX(raw);
        return parsed;
      } catch (e) {
        return TEX(raw);
      }
    }

    function sortByPinned(list, pinned, keyOf) {
      const isPinned = (g) => pinned.indexOf(keyOf(g)) >= 0;
      return list.filter(isPinned).concat(list.filter((g) => !isPinned(g)));
    }

    function newRow(name) {      return { id: safeId('r'), name: name || '公式', root: PH(), checkedAt: null, agentReviewed: false, note: '' };
    }
    function defaultProject() {
      const row = newRow('公式 1');
      return { id: safeId('p'), name: '未命名项目', rows: [row], activeId: row.id, createdAt: Date.now(), updatedAt: Date.now() };
    }
    function normalizeProject(input) {
      try {
        if (!input || typeof input !== 'object') return null;
        const project = {
          id: typeof input.id === 'string' ? input.id : safeId('p'),
          name: typeof input.name === 'string' ? input.name.slice(0, 80) : '未命名项目',
          createdAt: Number(input.createdAt) || Date.now(),
          updatedAt: Number(input.updatedAt) || Date.now(),
          rows: [],
          activeId: null,
        };
        const rows = Array.isArray(input.rows) ? input.rows.slice(0, MAX_ROWS) : [];
        rows.forEach((r, i) => {
          if (!r || typeof r !== 'object' || !isValidNode(r.root)) return;
          let root = cleanNode(r.root);
          if (root.k === 'op' && root.op === '=' && root.args[0] && root.args[1]
            && root.args[0].k === 'ph' && root.args[1].k === 'ph') root = PH();
          project.rows.push({
            id: typeof r.id === 'string' ? r.id : safeId('r'),
            name: typeof r.name === 'string' ? r.name.slice(0, 60) : ('公式 ' + (i + 1)),
            root,
            checkedAt: Number(r.checkedAt) || null,
            agentReviewed: !!r.agentReviewed,
            note: typeof r.note === 'string' ? r.note.slice(0, 2000) : '',
          });
        });
        if (!project.rows.length) project.rows.push(newRow('公式 1'));
        project.activeId = project.rows.some((r) => r.id === input.activeId) ? input.activeId : project.rows[0].id;
        return project;
      } catch (e) { return null; }
    }
    function loadProjectState() {
      try {
        const saved = readLS(LS_PROJECTS, null);
        if (saved && Array.isArray(saved.projects) && saved.projects.length) {
          const projects = saved.projects.map(normalizeProject).filter(Boolean).slice(0, MAX_PROJECTS);
          if (projects.length) {
            const activeId = projects.some((p) => p.id === saved.activeId) ? saved.activeId : projects[0].id;
            return { projects, activeId };
          }
        }
        // migrate the single-formula document (v1) into the first project
        const legacy = readLS(LS_DOC, null);
        const project = defaultProject();
        if (legacy && legacy.root && isValidNode(legacy.root)) {
          project.rows[0].root = legacy.root;
          project.rows[0].name = '公式 1';
          project.name = (typeof legacy.name === 'string' && legacy.name !== '未命名公式') ? legacy.name : project.name;
        }
        return { projects: [project], activeId: project.id };
      } catch (e) {
        const project = defaultProject();
        return { projects: [project], activeId: project.id };
      }
    }
    function activeRowOf(project) {
      if (!project || !Array.isArray(project.rows) || !project.rows.length) return null;
      return project.rows.find((r) => r.id === project.activeId) || project.rows[0];
    }
    function withActiveRoot(project, fn) {
      const row = activeRowOf(project);
      if (!row) return project;
      let nextRoot;
      try { nextRoot = fn(row.root); } catch (e) { return project; }
      if (!isValidNode(nextRoot)) return project;
      return {
        ...project,
        updatedAt: Date.now(),
        rows: project.rows.map((r) => (r.id === row.id ? { ...r, root: nextRoot, checkedAt: null } : r)),
      };
    }
    function findProject(list, id) { return list.find((p) => p.id === id) || list[0]; }

    const UNIT_BY_SYM = {
      F: 'N', m: 'kg', a: 'm/s²', E: 'J', c: 'm/s', G: 'm³/(kg·s²)', R: 'J/(mol·K)',
      t: 's', x: 'm', v: 'm/s', 'λ': 'm', 'ω': 'rad/s', 'ħ': 'J·s',
    };
    function mapTree(node, fn) {
      if (!node || typeof node !== 'object') return node;
      if (node.k === 'var') {
        const patch = fn(node);
        return patch ? { ...node, ...patch } : node;
      }
      const copy = { ...node };
      for (const key of CHILD_KEYS[node.k] || []) {
        if (key === 'rows') copy.rows = node.rows.map((row) => row.map((cell) => mapTree(cell, fn)));
        else if (key === 'args') copy.args = node.args.map((arg) => mapTree(arg, fn));
        else if (node[key] && typeof node[key] === 'object') copy[key] = mapTree(node[key], fn);
      }
      return copy;
    }

    /* ------------------------------------------------------------------ *
     * 9. styles
     * ------------------------------------------------------------------ */
    const CSS = `
.fb-layer{position:fixed;inset:0;pointer-events:none;z-index:70;font-family:var(--dsw-font-family, "Segoe UI", system-ui, -apple-system, sans-serif)}
.fb-panel{position:fixed;pointer-events:auto;display:flex;flex-direction:column;width:960px;height:660px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);background:var(--dsw-alias-bg-layer-1,#171b26);color:var(--dsw-alias-label-primary,#e8ecf5);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.18));border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.45),0 2px 8px rgba(0,0,0,.3);overflow:hidden;animation:fbIn .18s ease-out;isolation:isolate}
@keyframes fbIn{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
@keyframes fbPop{0%{transform:scale(.82);opacity:.2}70%{transform:scale(1.06);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes fbBurst{0%{transform:translate(0,0) scale(.5);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}}
.fb-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));cursor:grab;user-select:none;background:linear-gradient(180deg,var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04)),transparent)}
.fb-head.fb-dragging{cursor:grabbing}
.fb-title{font-weight:650;font-size:14px;letter-spacing:.2px;display:flex;align-items:center;gap:8px;white-space:nowrap}
.fb-logo{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#4f8cff,#8b5cf6);display:grid;place-items:center;font-size:13px;color:#fff}
.fb-spacer{flex:1}
.fb-xp{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-secondary,#9aa6bd);white-space:nowrap}
.fb-xpbar{width:86px;height:6px;border-radius:99px;background:rgba(148,163,184,.22);overflow:hidden}
.fb-xpfill{height:100%;border-radius:99px;background:linear-gradient(90deg,#22d3ee,#8b5cf6);transition:width .35s ease}
.fb-iconbtn{border:1px solid transparent;background:transparent;color:inherit;border-radius:8px;min-width:30px;height:30px;padding:0 7px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;justify-content:center;gap:4px}
.fb-iconbtn:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.08));border-color:var(--dsw-alias-border-l1,rgba(255,255,255,.12))}
.fb-iconbtn:disabled{opacity:.35;cursor:default}
.fb-seg{display:inline-flex;background:rgba(148,163,184,.14);border-radius:9px;padding:2px;gap:2px}
.fb-seg button{border:0;background:transparent;color:var(--dsw-alias-label-secondary,#9aa6bd);font-size:12px;padding:4px 10px;border-radius:7px;cursor:pointer}
.fb-seg button.fb-on{background:var(--dsw-alias-bg-overlay,#2a3142);color:var(--dsw-alias-label-primary,#e8ecf5);box-shadow:0 1px 3px rgba(0,0,0,.25)}
.fb-body{flex:1;display:flex;min-height:0}
.fb-palette{width:206px;min-width:206px;display:flex;flex-direction:column;border-right:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));background:var(--dsw-alias-bg-base,rgba(0,0,0,.12))}
.fb-search{margin:8px;padding:6px 9px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));background:var(--dsw-alias-bg-layer-1,#171b26);color:inherit;font-size:12px;outline:none}
.fb-search:focus{border-color:var(--dsw-alias-brand-primary,#4f8cff)}
.fb-pal-scroll{overflow:auto;padding:0 8px 12px}
.fb-group{margin-top:8px}
.fb-group-title{font-size:10.5px;letter-spacing:.08em;color:var(--dsw-alias-label-secondary,#9aa6bd);text-transform:uppercase;margin:2px 4px 6px}
.fb-group-title-row{display:flex;align-items:center;justify-content:space-between;gap:6px}
.fb-pin{border:0;background:transparent;cursor:pointer;font-size:10px;opacity:.4;padding:0 2px;line-height:1}
.fb-pin:hover{opacity:.9}
.fb-pin-on{opacity:1;filter:drop-shadow(0 0 3px rgba(251,191,36,.85))}
.fb-custom-empty{font-size:10.5px;color:var(--dsw-alias-label-secondary,#8b95a9);line-height:1.45;padding:5px 6px;border:1px dashed rgba(251,191,36,.35);border-radius:7px}
.fb-custom-cat{margin-bottom:6px}
.fb-custom-item{position:relative}
.fb-item-del{position:absolute;top:-5px;right:-5px;width:15px;height:15px;border-radius:50%;border:1px solid rgba(248,113,113,.7);background:var(--dsw-alias-bg-layer-1,#171b26);color:#fca5a5;font-size:9px;line-height:1;cursor:pointer;display:none;padding:0}
.fb-custom-item:hover .fb-item-del{display:block}
.fb-collapse{border:0;background:transparent;color:inherit;cursor:pointer;font-size:9px;padding:0 2px;opacity:.75;line-height:1}
.fb-collapse:hover{opacity:1}
.fb-item-handle{position:absolute;top:-5px;left:-5px;display:none;cursor:grab;font-size:11px;color:#fbbf24;line-height:1;opacity:.8}
.fb-custom-item:hover .fb-item-handle{display:block}
.fb-item-handle:hover{opacity:1}
.fb-item-edit{position:absolute;bottom:-5px;right:-5px;width:15px;height:15px;border-radius:50%;border:1px solid rgba(251,191,36,.7);background:var(--dsw-alias-bg-layer-1,#171b26);color:#fbbf24;font-size:9px;line-height:1;cursor:pointer;display:none;padding:0}
.fb-custom-item:hover .fb-item-edit{display:block}
.fb-reorder-before{box-shadow:0 -2px 0 rgba(251,191,36,.9)}
.fb-reorder-after{box-shadow:0 2px 0 rgba(251,191,36,.9)}
.fb-cat-btn{border:0;background:transparent;color:inherit;cursor:pointer;font-size:10px;padding:0 2px;opacity:.55;line-height:1}
.fb-cat-btn:hover{opacity:1}
.fb-cat-del:hover{color:#f87171}
.fb-cat-head.fb-cat-drop{background:rgba(251,191,36,.16);border-radius:6px;outline:1px dashed rgba(251,191,36,.85)}
.fb-thumb{display:block;max-width:100%;height:28px;overflow:hidden;font-size:9px;transform:scale(.78);transform-origin:left center;pointer-events:none;white-space:nowrap;text-align:left;line-height:1.25}
.fb-thumb .fb-b{padding:0 1px;font-size:9px}
.fb-thumb .fb-ph{padding:0 2px;min-width:8px}
.fb-tutorial-btn{border:1px solid rgba(251,191,36,.55);border-radius:8px;background:linear-gradient(135deg,rgba(251,191,36,.22),rgba(79,140,255,.18));color:#fde68a;font-size:11.5px;font-weight:650;padding:5px 10px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px}
.fb-tutorial-btn:hover{background:linear-gradient(135deg,rgba(251,191,36,.38),rgba(79,140,255,.3));color:#fff}
.fb-pulse{animation:fbPulse 1.8s ease-in-out infinite}
@keyframes fbPulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.35)}50%{box-shadow:0 0 0 5px rgba(251,191,36,0)}}
.fb-tutorial-card{width:min(780px,94vw);max-height:88vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay,#232a3b);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden}
.fb-tutorial-head{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1))}
.fb-tutorial-body{overflow:auto;padding:14px 18px 18px}
.fb-tutorial-intro{font-size:12.5px;line-height:1.7;color:var(--dsw-alias-label-primary,#e8ecf5);background:linear-gradient(135deg,rgba(79,140,255,.12),rgba(251,191,36,.10));border:1px solid rgba(79,140,255,.25);border-radius:10px;padding:10px 12px;margin-bottom:12px}
.fb-tutorial-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-bottom:12px}
.fb-tutorial-carditem{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));border-radius:10px;padding:8px 10px;background:rgba(148,163,184,.05)}
.fb-tutorial-icon{font-size:15px;line-height:1.2}
.fb-tutorial-title{font-size:11.5px;font-weight:650;color:var(--dsw-alias-label-primary,#e8ecf5);margin-top:2px}
.fb-tutorial-desc{font-size:10.8px;line-height:1.5;color:var(--dsw-alias-label-secondary,#9aa6bd);margin-top:1px}
.fb-tutorial-sub{font-size:11px;font-weight:650;color:var(--fb-accent,#4f8cff);margin:10px 0 4px;letter-spacing:.04em}
.fb-tutorial-steps{margin:0;padding-left:18px;font-size:11px;line-height:1.75;color:var(--dsw-alias-label-primary,#e8ecf5)}
.fb-tutorial-keys{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:10.8px}
.fb-tutorial-keyrow{display:flex;align-items:center;gap:8px}
.fb-tutorial-keyrow code{font-family:ui-monospace,Consolas,monospace;background:rgba(148,163,184,.12);border-radius:5px;padding:2px 5px;color:#c3cbdb;white-space:nowrap}
.fb-katex{font-size:17px;line-height:1.5;overflow-x:auto;padding:4px 2px}
.fb-katex-fallback{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary,#9aa6bd);white-space:pre-wrap;word-break:break-all;padding:4px 2px}
.fb-preview-card{width:min(880px,94vw)}
.fb-preview-row{border-bottom:1px dashed rgba(148,163,184,.16);padding:8px 2px 10px;display:flex;flex-direction:column;gap:4px}
.fb-preview-row:last-child{border-bottom:0}
.fb-preview-row-name{font-size:10.5px;color:var(--dsw-alias-label-secondary,#8b95a9)}
.fb-texblock{font-size:1em;max-width:100%;overflow-x:auto;padding:0 2px}
.fb-textext{font-family:ui-monospace,Consolas,monospace;font-size:11px;white-space:pre-wrap;word-break:break-all}
.fb-mathlive-host{min-height:140px;margin:8px 0}
.fb-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.fb-item{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04));border-radius:9px;padding:7px 6px;cursor:grab;display:flex;flex-direction:column;align-items:center;gap:3px;transition:transform .12s ease,border-color .12s ease,background .12s ease;user-select:none;text-align:center}
.fb-item:hover{transform:translateY(-1px);border-color:var(--fb-c,#4f8cff);background:var(--dsw-alias-bg-overlay,#232a3b)}
.fb-item:active{transform:scale(.97)}
.fb-item-glyph{font-size:16px;line-height:1.15;font-family:"Cambria Math","Latin Modern Math","Segoe UI",serif;color:var(--fb-c,#e8ecf5)}
.fb-item-label{font-size:10.5px;color:var(--dsw-alias-label-secondary,#9aa6bd);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:84px}
.fb-center{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}
.fb-toolbar{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));flex-wrap:wrap}
.fb-toolbtn{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));background:transparent;color:inherit;border-radius:8px;height:27px;padding:0 9px;font-size:12px;cursor:pointer}
.fb-toolbtn:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.08))}
.fb-toolbtn:disabled{opacity:.35;cursor:default}
.fb-toolbtn.fb-primary{background:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff));border-color:transparent;color:#fff;font-weight:600}
.fb-import-ta{width:100%;min-height:150px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));border-radius:9px;background:var(--dsw-alias-bg-layer-1,#171b26);color:inherit;font-family:ui-monospace,Consolas,monospace;font-size:12px;padding:9px 10px;outline:none;resize:vertical;margin:6px 0}
.fb-import-ta:focus{border-color:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff))}
.fb-import-err{color:#f87171;font-size:11.5px;padding:6px 8px;border-radius:8px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);margin:6px 0}
.fb-canvas{flex:1;overflow:auto;padding:22px 26px;position:relative;background:radial-gradient(1200px 300px at 20% 0%,rgba(79,140,255,.10),transparent 60%),var(--dsw-alias-bg-base,transparent)}
.fb-formula{font-size:27px;line-height:1.5;font-family:"Cambria Math","Latin Modern Math","Times New Roman",serif;display:inline-flex;align-items:center;flex-wrap:wrap;gap:2px;color:var(--dsw-alias-label-primary,#eef2fa)}
.fb-formula .fb-b{display:inline-flex;align-items:center;vertical-align:middle;border-radius:6px;border:1px solid transparent;padding:0 2px;transition:background .12s ease,border-color .12s ease,transform .12s ease}
.fb-formula .fb-b:hover{background:rgba(79,140,255,.10);border-color:rgba(79,140,255,.28)}
.fb-formula .fb-sel{background:rgba(79,140,255,.16)!important;border-color:rgba(79,140,255,.7)!important;box-shadow:0 0 0 2px rgba(79,140,255,.22)}
.fb-formula .fb-hover{background:rgba(34,211,238,.16)!important;border-color:rgba(34,211,238,.75)!important}
.fb-op{color:var(--dsw-alias-label-secondary,#b9c2d4);padding:0 5px;font-size:.9em}
.fb-num{color:#93c5fd}
.fb-var{color:#6ee7b7}
.fb-const{color:#fcd34d}
.fb-fnname{color:#67e8f9;font-size:.92em;padding-right:1px}
.fb-frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;padding:0 3px}
.fb-num-part{padding:0 4px;border-bottom:1.6px solid currentColor;line-height:1.25}
.fb-den-part{padding:0 4px;line-height:1.25}
.fb-sqrt{display:inline-flex;align-items:flex-start;vertical-align:middle}
.fb-rad{font-size:1.15em;margin-right:-1px;transform:translateY(.02em)}
.fb-radicand{border-top:1.6px solid currentColor;padding:1px 3px 0 2px;line-height:1.2}
.fb-sup,.fb-sub{font-size:.62em;line-height:1;position:relative;vertical-align:baseline;margin-left:0}
.fb-sup{top:-.68em}
.fb-sub{top:.30em}
.fb-base{display:inline-block;margin-right:.01em}
.fb-bigop{display:inline-flex;align-items:center;gap:2px;vertical-align:middle;padding:0 2px}
.fb-limits{display:inline-flex;flex-direction:column;align-items:center;font-size:.42em;line-height:1.05;color:var(--dsw-alias-label-secondary,#c3cbdb)}
.fb-int-body{display:inline-flex;align-items:center}
.fb-pd{display:inline-flex;vertical-align:middle;padding:0 2px}
.fb-hat{position:relative;display:inline-flex;padding-top:.22em}
.fb-hat::before{content:"^";position:absolute;top:-.26em;left:50%;transform:translateX(-50%);font-size:.72em;line-height:1}
.fb-mat{display:inline-flex;align-items:stretch;vertical-align:middle;gap:1px}
.fb-mat-bracket{font-size:2.1em;color:var(--dsw-alias-label-secondary,#c3cbdb);display:flex;align-items:center}
.fb-mat table{border-collapse:collapse}
.fb-mat td{padding:1px 6px;text-align:center;font-size:.86em}
.fb-ph{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;border-radius:8px;border:1.6px dashed rgba(148,163,184,.55);color:rgba(148,163,184,.9);background:rgba(148,163,184,.06);margin:0 2px;vertical-align:middle;cursor:pointer;transition:border-color .12s ease,background .12s ease,transform .12s ease}
.fb-ph:hover{border-color:#22d3ee;background:rgba(34,211,238,.12);transform:scale(1.04)}
.fb-ph.fb-sel{border-color:#4f8cff;background:rgba(79,140,255,.18);box-shadow:0 0 0 2px rgba(79,140,255,.25)}
.fb-ph.fb-hover{border-color:#22d3ee;background:rgba(34,211,238,.18);transform:scale(1.02)}
.fb-ph-plus{font-size:15px;font-weight:600;line-height:1}
.fb-preview{margin-top:14px;display:flex;gap:10px;align-items:center;font-size:12px;color:var(--dsw-alias-label-secondary,#9aa6bd);flex-wrap:wrap}
.fb-chip{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));border-radius:99px;padding:3px 10px;font-size:11px}
.fb-chip.fb-ok{color:#6ee7b7;border-color:rgba(110,231,183,.45);background:rgba(110,231,183,.08)}
.fb-chip.fb-warn{color:#fcd34d;border-color:rgba(252,211,77,.45);background:rgba(252,211,77,.08)}
.fb-latex{display:flex;align-items:center;gap:8px;border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));padding:8px 10px;background:var(--dsw-alias-bg-base,rgba(0,0,0,.14))}
.fb-latex code{flex:1;font-family:ui-monospace,Consolas,monospace;font-size:12px;color:var(--dsw-alias-label-secondary,#c3cbdb);white-space:nowrap;overflow:auto;padding:5px 8px;border-radius:7px;background:rgba(148,163,184,.10)}
.fb-props{width:268px;min-width:268px;border-left:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));display:flex;flex-direction:column;background:var(--dsw-alias-bg-base,rgba(0,0,0,.12))}
.fb-tabs{display:flex;gap:2px;padding:8px 8px 0}
.fb-tab{flex:1;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary,#9aa6bd);padding:6px 4px;border-radius:8px;font-size:12px;cursor:pointer}
.fb-tab.fb-on{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));color:var(--dsw-alias-label-primary,#e8ecf5);border-color:var(--dsw-alias-border-l1,rgba(255,255,255,.12))}
.fb-prop-scroll{flex:1;overflow:auto;padding:10px}
.fb-field{display:flex;flex-direction:column;gap:4px;margin-bottom:9px}
.fb-field label{font-size:11px;color:var(--dsw-alias-label-secondary,#9aa6bd);letter-spacing:.02em}
.fb-field input,.fb-field textarea,.fb-field select{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));border-radius:8px;background:var(--dsw-alias-bg-layer-1,#171b26);color:inherit;font-size:12px;padding:6px 8px;outline:none;font-family:inherit}
.fb-field input:focus,.fb-field textarea:focus{border-color:var(--dsw-alias-brand-primary,#4f8cff)}
.fb-field textarea{resize:vertical;min-height:52px}
.fb-hint{font-size:11px;color:var(--dsw-alias-label-secondary,#8b95a9);line-height:1.5;padding:8px 10px;border-radius:9px;background:rgba(148,163,184,.08);margin-bottom:10px}
.fb-kv{display:flex;justify-content:space-between;gap:10px;font-size:11.5px;padding:4px 2px;border-bottom:1px dashed rgba(148,163,184,.16)}
.fb-kv span:first-child{color:var(--dsw-alias-label-secondary,#9aa6bd)}
.fb-quest{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));border-radius:10px;padding:8px 10px;margin-bottom:8px;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.03));position:relative;overflow:hidden;transition:border-color .15s}
.fb-quest.fb-done{border-color:rgba(110,231,183,.5);background:rgba(110,231,183,.07)}
.fb-quest-title{font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px}
.fb-quest-hint{font-size:11px;color:var(--dsw-alias-label-secondary,#9aa6bd);margin-top:2px;font-family:"Cambria Math",serif}
.fb-quest-xp{font-size:10px;color:#8ea2ff;margin-top:3px}
.fb-toast{position:absolute;left:50%;bottom:56px;transform:translateX(-50%);background:var(--dsw-alias-bg-overlay,#232a3b);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.2));color:var(--dsw-alias-label-primary,#eef2fa);padding:8px 14px;border-radius:99px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:none;animation:fbPop .18s ease-out}
.fb-burst{position:absolute;left:50%;top:50%;width:1px;height:1px;pointer-events:none}
.fb-burst i{position:absolute;width:6px;height:6px;border-radius:2px;background:var(--c,#8b5cf6);animation:fbBurst .85s ease-out forwards}
.fb-graph{position:relative;min-height:420px;min-width:100%}
.fb-gnode{position:absolute;width:152px;min-height:44px;border-radius:10px;border:1px solid var(--fb-c,rgba(255,255,255,.2));background:var(--dsw-alias-bg-layer-1,#171b26);padding:6px 8px;cursor:grab;user-select:none;box-shadow:0 4px 12px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:2px;z-index:2;transition:box-shadow .12s ease,transform .12s ease}
.fb-gnode:hover{box-shadow:0 6px 18px rgba(0,0,0,.3)}
.fb-gnode.fb-sel{box-shadow:0 0 0 2px var(--fb-c,#4f8cff),0 6px 18px rgba(0,0,0,.3)}
.fb-gnode-k{font-size:9.5px;letter-spacing:.06em;color:var(--fb-c,#9aa6bd);text-transform:uppercase}
.fb-gnode-t{font-size:12.5px;font-family:"Cambria Math",serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fb-edges{position:absolute;inset:0;pointer-events:none;z-index:1}
.fb-ghint{font-size:11px;color:var(--dsw-alias-label-secondary,#8b95a9);padding:4px 2px 10px}
.fb-resize{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,rgba(148,163,184,.55) 50%);border-bottom-right-radius:14px}
.fb-launch{border:1px solid transparent;background:transparent;color:inherit;border-radius:8px;height:28px;min-width:28px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;line-height:1}
.fb-launch:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.08))}
.fb-rail{width:32px;height:32px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;font-size:16px}
.fb-rail:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.08))}
.fb-mini{font-size:11px;color:var(--dsw-alias-label-secondary,#8b95a9);padding:2px 0}
.fb-favbar{display:flex;align-items:center;gap:8px;padding:6px 10px;border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));background:var(--dsw-alias-bg-base,rgba(0,0,0,.10));overflow:hidden}
.fb-fav-add{border:1px solid rgba(252,211,77,.5);background:rgba(252,211,77,.10);color:#fcd34d;border-radius:99px;height:24px;padding:0 10px;font-size:11.5px;cursor:pointer;white-space:nowrap}
.fb-fav-add:hover{background:rgba(252,211,77,.2)}
.fb-fav-list{display:flex;align-items:center;gap:6px;overflow-x:auto;flex:1;min-width:0}
.fb-fav-chip{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.05));border-radius:99px;height:24px;white-space:nowrap;overflow:hidden}
.fb-fav-name{border:0;background:transparent;color:var(--dsw-alias-label-primary,#e8ecf5);font-size:11.5px;padding:0 4px 0 10px;cursor:pointer;max-width:180px;overflow:hidden;text-overflow:ellipsis}
.fb-fav-name:hover{color:#fcd34d}
.fb-fav-del{border:0;background:transparent;color:var(--dsw-alias-label-secondary,#9aa6bd);cursor:pointer;font-size:13px;padding:0 8px 0 4px;line-height:1}
.fb-fav-del:hover{color:#f87171}
.fb-fav-empty{font-size:11px;color:var(--dsw-alias-label-secondary,#8b95a9)}
.fb-zoomwrap{transform-origin:top left;transition:transform .12s ease}
.fb-zoomctl{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));border-radius:8px;overflow:hidden}
.fb-zoomctl button{border:0;background:transparent;color:inherit;height:25px;min-width:24px;cursor:pointer;font-size:12px}
.fb-zoomctl button:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.08))}
.fb-zoomctl span{font-size:10.5px;color:var(--dsw-alias-label-secondary,#9aa6bd);min-width:38px;text-align:center}
.fb-hinttext{font-size:10.5px;color:var(--dsw-alias-label-secondary,#8b95a9);white-space:nowrap}
.fb-rz{position:absolute;z-index:5}
.fb-rz-n{left:8px;right:8px;top:-3px;height:6px;cursor:ns-resize}
.fb-rz-s{left:8px;right:8px;bottom:-3px;height:6px;cursor:ns-resize}
.fb-rz-e{top:8px;bottom:8px;right:-3px;width:6px;cursor:ew-resize}
.fb-rz-w{top:8px;bottom:8px;left:-3px;width:6px;cursor:ew-resize}
.fb-rz-ne{right:-3px;top:-3px;width:12px;height:12px;cursor:nesw-resize}
.fb-rz-nw{left:-3px;top:-3px;width:12px;height:12px;cursor:nwse-resize}
.fb-rz-se{right:-3px;bottom:-3px;width:14px;height:14px;cursor:nwse-resize}
.fb-rz-sw{left:-3px;bottom:-3px;width:14px;height:14px;cursor:nesw-resize}
.fb-modal{position:fixed;inset:0;background:rgba(4,8,18,.55);display:flex;align-items:center;justify-content:center;z-index:120;pointer-events:auto;backdrop-filter:blur(2px)}
.fb-modal-card{width:min(760px,calc(100vw - 40px));max-height:calc(100vh - 80px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#171b26);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.18));border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden;animation:fbIn .16s ease-out}
.fb-modal-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1))}
.fb-modal-title{font-size:14px;font-weight:650}
.fb-modal-body{overflow:auto;padding:12px 14px 18px}
.fb-set-section{margin-bottom:14px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10));border-radius:11px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.025))}
.fb-set-title{font-size:12px;font-weight:650;color:var(--dsw-alias-label-primary,#e8ecf5);margin-bottom:8px;letter-spacing:.02em}
.fb-set-row{display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0;flex-wrap:wrap}
.fb-set-row span:first-child{color:var(--dsw-alias-label-secondary,#9aa6bd);min-width:96px}
.fb-set-row select,.fb-set-row input[type=range]{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));border-radius:7px;background:var(--dsw-alias-bg-layer-1,#171b26);color:inherit;font-size:12px;padding:4px 6px}
.fb-set-val{font-size:11px;color:var(--dsw-alias-label-secondary,#9aa6bd)}
.fb-set-note{font-size:11px;color:var(--dsw-alias-label-secondary,#8b95a9);line-height:1.55;margin-bottom:8px}
.fb-set-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.fb-set-box{border:1px dashed var(--dsw-alias-border-l1,rgba(255,255,255,.16));border-radius:10px;padding:8px 10px;margin-top:8px}
.fb-tool-list{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}
.fb-tool-row{display:grid;grid-template-columns:170px 1fr auto;gap:8px;align-items:center;font-size:11.5px;padding:4px 0;border-bottom:1px dashed rgba(148,163,184,.14)}
.fb-tool-name{color:var(--dsw-alias-label-primary,#e8ecf5);font-weight:600;white-space:nowrap}
.fb-tool-note{color:var(--dsw-alias-label-secondary,#8b95a9);line-height:1.4}
.fb-tool-link{color:var(--dsw-alias-brand-primary,#4f8cff);text-decoration:none;white-space:nowrap;font-size:11px}
.fb-tool-link:hover{text-decoration:underline}
.fb-about{display:flex;flex-direction:column;gap:5px;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary,#9aa6bd)}
.fb-about-strong{font-weight:650;color:var(--dsw-alias-label-primary,#e8ecf5)}
.fb-lit-list{margin-top:8px;max-height:220px;overflow:auto;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10));border-radius:9px;padding:4px}
.fb-lit-row{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:4px 6px;border-bottom:1px dashed rgba(148,163,184,.14);cursor:pointer}
.fb-lit-row:last-child{border-bottom:0}
.fb-lit-tex{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary,#c3cbdb);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fb-lit-origin{font-size:10px;color:var(--dsw-alias-label-secondary,#8b95a9);white-space:nowrap}
.fb-projsel{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));border-radius:7px;background:var(--dsw-alias-bg-layer-1,#171b26);color:inherit;font-size:11.5px;padding:4px 6px;max-width:150px}
.fb-projname{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10));border-radius:7px;background:transparent;color:inherit;font-size:12px;padding:4px 7px;width:130px;outline:none}
.fb-projname:focus{border-color:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff))}
.fb-statusbar{display:flex;align-items:center;gap:10px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10));background:var(--dsw-alias-bg-base,rgba(0,0,0,.10));flex-wrap:wrap}
.fb-lamps{display:inline-flex;align-items:center;gap:7px;padding:0 4px}
.fb-lamp{width:12px;height:12px;border-radius:50%;display:inline-block;opacity:.28;transition:opacity .2s ease,box-shadow .2s ease,transform .2s ease}
.fb-lamp-r{background:#ef4444}
.fb-lamp-y{background:#f59e0b}
.fb-lamp-g{background:#22c55e}
.fb-lamp-on{opacity:1;transform:scale(1.12)}
.fb-lamp-r.fb-lamp-on{box-shadow:0 0 10px rgba(239,68,68,.8)}
.fb-lamp-y.fb-lamp-on{box-shadow:0 0 10px rgba(245,158,11,.8)}
.fb-lamp-g.fb-lamp-on{box-shadow:0 0 10px rgba(34,197,94,.85)}
.fb-status-text{font-size:11px;color:var(--dsw-alias-label-secondary,#9aa6bd)}
.fb-rowstrip{display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.02));overflow:hidden}
.fb-rowstrip-label{font-size:10.5px;color:var(--dsw-alias-label-secondary,#8b95a9);white-space:nowrap}
.fb-rowchips{display:flex;align-items:center;gap:5px;overflow-x:auto;min-width:0;max-width:60%}
.fb-rowchip{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));background:transparent;color:var(--dsw-alias-label-secondary,#9aa6bd);border-radius:99px;height:23px;padding:0 10px;font-size:11px;cursor:pointer;white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis}
.fb-rowchip:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.08))}
.fb-rowchip.fb-rowchip-on{background:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff));border-color:transparent;color:#fff;font-weight:600}
.fb-inspector{border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10));padding:7px 12px 9px;min-height:96px;max-height:190px;overflow:auto;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.025))}
.fb-insp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;font-weight:650;color:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff));letter-spacing:.03em;margin-bottom:4px}
.fb-insp-desc{font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-primary,#dbe2ef);margin-bottom:6px}
.fb-insp-row{display:flex;align-items:center;gap:8px;margin-top:4px;font-size:11px;color:var(--dsw-alias-label-secondary,#9aa6bd)}
.fb-insp-row span:first-child{min-width:58px}
.fb-insp-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;margin-top:6px}
.fb-insp-field{display:flex;flex-direction:column;gap:2px;font-size:10.5px;color:var(--dsw-alias-label-secondary,#8b95a9)}
.fb-insp-input{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));border-radius:6px;background:var(--dsw-alias-bg-layer-1,#171b26);color:inherit;font-size:11.5px;padding:4px 7px;outline:none;min-width:80px}
.fb-insp-input:focus{border-color:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff))}
.fb-insp-latex{font-family:ui-monospace,Consolas,monospace;font-size:10.5px;color:var(--dsw-alias-label-secondary,#c3cbdb);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.fb-drop{animation:fbDrop .38s cubic-bezier(.2,.9,.3,1.25)}
@keyframes fbDrop{0%{transform:scale(.9);opacity:.55}65%{transform:scale(1.025);opacity:1}100%{transform:scale(1);opacity:1}}
.fb-b.fb-seq{display:inline-flex;align-items:baseline;gap:.16em;padding:0 .04em}
.fb-b.fb-seq > *{transition:margin .18s ease,transform .18s ease}
.fb-b.fb-jelly{animation:fbJelly .4s cubic-bezier(.3,.8,.3,1.25)}
.fb-b.fb-seq.fb-jelly > *{animation:fbJellyChild .4s ease}
@keyframes fbJelly{0%{transform:scaleX(.97) scaleY(1.02)}42%{transform:scaleX(1.018) scaleY(.992)}72%{transform:scaleX(.997) scaleY(1.002)}100%{transform:scaleX(1) scaleY(1)}}
@keyframes fbJellyChild{0%{transform:translateX(0)}28%{transform:translateX(.07em)}62%{transform:translateX(-.022em)}100%{transform:translateX(0)}}
.fb-review-list{max-height:200px;overflow:auto;margin:8px 0;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));border-radius:9px;padding:4px}
.fb-review-row{display:grid;grid-template-columns:170px 1fr;gap:8px;padding:5px 7px;border-bottom:1px dashed rgba(148,163,184,.14);font-size:11.5px}
.fb-review-row:last-child{border-bottom:0}
.fb-review-name{color:var(--dsw-alias-label-primary,#e8ecf5);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fb-review-issue{color:var(--dsw-alias-label-secondary,#9aa6bd);line-height:1.45}
.fb-crash{margin:12px;padding:12px 14px;border:1px solid rgba(248,113,113,.4);border-radius:10px;background:rgba(248,113,113,.08);color:#fca5a5;font-size:12px;line-height:1.5}
.fb-sheet{display:flex;flex-direction:column;gap:8px;min-height:100%}
.fb-sheet-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;border:1px solid transparent;background:rgba(148,163,184,.04);cursor:pointer;min-height:54px;transition:border-color .15s ease,background .15s ease}
.fb-sheet-row:hover{border-color:var(--dsw-alias-border-l1,rgba(255,255,255,.14));background:rgba(148,163,184,.08)}
.fb-sheet-row.fb-sheet-active{border-color:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff));background:rgba(79,140,255,.08);box-shadow:inset 0 0 0 1px rgba(79,140,255,.15)}
.fb-sheet-idx{width:22px;height:22px;border-radius:6px;background:rgba(148,163,184,.15);font-size:11px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary,#9aa6bd);flex:none}
.fb-sheet-name{margin-left:auto;font-size:10.5px;color:var(--dsw-alias-label-secondary,#8b95a9);white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis}
.fb-sheet-add{border:1px dashed var(--dsw-alias-border-l1,rgba(255,255,255,.2));background:transparent;color:var(--dsw-alias-label-secondary,#9aa6bd);border-radius:9px;padding:9px;font-size:12px;cursor:pointer;transition:border-color .15s ease,color .15s ease}
.fb-sheet-add:hover{border-color:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff));color:var(--dsw-alias-label-primary,#e8ecf5)}
.fb-ghost{position:fixed;transform:translate(-50%,-50%);pointer-events:none;z-index:200;display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;background:var(--dsw-alias-bg-overlay,#232a3b);border:1px solid var(--fb-accent,#4f8cff);box-shadow:0 10px 24px rgba(0,0,0,.4);font-size:13px;color:var(--dsw-alias-label-primary,#eef2fa);transition:left .05s linear,top .05s linear}
.fb-ghost-snap{transition:left .08s ease-out,top .08s ease-out;box-shadow:0 0 0 2px rgba(34,211,238,.28),0 8px 18px rgba(0,0,0,.35)}
.fb-warnbar{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.10);flex-wrap:wrap}
.fb-warn-text{font-size:11px;color:#fbbf24;line-height:1.4;flex:1;min-width:220px}
.fb-ghost-glyph{font-family:"Cambria Math",serif;color:var(--fb-accent,#4f8cff)}
.fb-ghost-label{font-size:11px;color:var(--dsw-alias-label-secondary,#9aa6bd)}
.fb-formula .fb-hover{transform:scale(1.02)}
.fb-library-list{display:flex;flex-direction:column;gap:6px;max-height:280px;overflow:auto}
.fb-lib-item{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));border-radius:9px;padding:7px 9px;cursor:pointer;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.03))}
.fb-lib-item:hover{border-color:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff))}
.fb-lib-title{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-primary,#e8ecf5);display:flex;justify-content:space-between;gap:8px}
.fb-lib-domain{font-size:10px;color:var(--dsw-alias-label-secondary,#8b95a9);font-weight:400;white-space:nowrap}
.fb-lib-latex{font-family:ui-monospace,Consolas,monospace;font-size:10.5px;color:var(--dsw-alias-label-secondary,#c3cbdb);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.fb-lib-meaning{font-size:10.5px;color:var(--dsw-alias-label-secondary,#9aa6bd);margin-top:2px;line-height:1.4}
.fb-cont{border:1.3px dashed rgba(148,163,184,.45);border-radius:8px;color:var(--dsw-alias-label-secondary,#9aa6bd);font-size:11px;padding:6px 10px;margin:4px 6px;cursor:pointer;white-space:nowrap;transition:border-color .12s ease,color .12s ease,background .12s ease}
.fb-cont:hover{border-color:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff));color:var(--dsw-alias-label-primary,#e8ecf5);background:rgba(79,140,255,.06)}
.fb-imgdrop{border:1.4px dashed var(--dsw-alias-border-l2,rgba(255,255,255,.22));border-radius:10px;min-height:120px;display:flex;align-items:center;justify-content:center;padding:8px;cursor:pointer;background:rgba(148,163,184,.05);overflow:hidden;outline:none}
.fb-imgdrop:focus{border-color:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff));box-shadow:0 0 0 2px rgba(79,140,255,.2)}
.fb-imgph{font-size:11.5px;color:var(--dsw-alias-label-secondary,#8b95a9);text-align:center;line-height:1.5}
.fb-img{max-width:100%;max-height:180px;border-radius:6px;display:block}
.fb-inline-wrap{position:fixed;z-index:400;display:flex;align-items:stretch;gap:4px}
.fb-inline-edit{border:1.6px solid var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff));border-radius:7px;background:var(--dsw-alias-bg-overlay,#232a3b);color:var(--dsw-alias-label-primary,#eef2fa);font-family:Cambria Math,serif;font-size:15px;padding:3px 7px;outline:none;box-shadow:0 6px 20px rgba(0,0,0,.4)}
.fb-inline-del{border:1.4px solid rgba(248,113,113,.6);border-radius:7px;background:rgba(248,113,113,.14);color:#fca5a5;font-size:13px;line-height:1;padding:0 8px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.4)}
.fb-inline-del:hover{background:rgba(248,113,113,.28);color:#fff}
.fb-delrow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding:7px 8px;border:1px solid rgba(248,113,113,.35);border-radius:9px;background:rgba(248,113,113,.08)}
.fb-delbtn{border:1.4px solid rgba(248,113,113,.65);border-radius:8px;background:rgba(248,113,113,.16);color:#fca5a5;font-size:12px;font-weight:650;padding:5px 10px;cursor:pointer;white-space:nowrap}
.fb-delbtn:hover{background:rgba(248,113,113,.3);color:#fff}
.fb-insp-del{border:1.3px solid rgba(248,113,113,.6);border-radius:7px;background:rgba(248,113,113,.14);color:#fca5a5;font-size:10.5px;font-weight:650;padding:3px 8px;cursor:pointer;white-space:nowrap;flex:none}
.fb-insp-del:hover{background:rgba(248,113,113,.28);color:#fff}
.fb-keybar{display:flex;align-items:center;gap:8px;padding:6px 10px;border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.02));flex-wrap:wrap}
.fb-keybar-label{font-size:10.5px;color:var(--dsw-alias-label-secondary,#8b95a9);white-space:nowrap}
.fb-keybar-input{flex:1;min-width:180px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));border-radius:7px;background:var(--dsw-alias-bg-layer-1,#171b26);color:inherit;font-family:ui-monospace,Consolas,monospace;font-size:11.5px;padding:5px 8px;outline:none}
.fb-keybar-input:focus{border-color:var(--fb-accent,var(--dsw-alias-brand-primary,#4f8cff))}
`;

    /* ------------------------------------------------------------------ *
     * 10. rendering: tree view
     * ------------------------------------------------------------------ */
    function fmtSym(node) {
      if (!node) return '';
      const s = node.sym || '';
      return UNI[s] || s;
    }

    function BlockShell({ node, ui, children, extraClass }) {
      const selected = ui.selectedId === node.id;
      const hover = ui.hoverId === node.id;
      const color = CATEGORY_COLOR[node.k] || '#94a3b8';
      const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); ui.setHover(node.id); };
      const onDragLeave = () => ui.setHover(ui.hoverId === node.id ? null : ui.hoverId);
      const onDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); ui.setHover(null);
        const itemId = e.dataTransfer.getData('text/fb-palette');
        if (itemId) ui.dropItem(itemId, node.id);
      };
      return h('span', {
        className: 'fb-b fb-' + node.k + (selected ? ' fb-sel' : '') + (hover ? ' fb-hover' : '') + (ui.lastDrop === node.id ? ' fb-drop' : '') + (ui.jellyId === node.id ? ' fb-jelly' : '') + (extraClass ? ' ' + extraClass : ''),
        style: { '--fb-c': color },
        title: KIND_LABEL[node.k] + '块（双击修改）',
        onClick: (e) => { e.stopPropagation(); if (!ui.thumb) ui.select(node.id); },
        onDoubleClick: (e) => { e.stopPropagation(); if (!ui.thumb && ui.editNode) ui.editNode(node.id, e.currentTarget); },
        onDragOver, onDragLeave, onDrop,
        ...(ui.thumb ? {} : { 'data-slot-id': node.id, 'data-node-id': node.id }),
      }, children);
    }

    function Placeholder({ node, ui }) {
      const selected = ui.selectedId === node.id;
      const hover = ui.hoverId === node.id;
      return h('span', {
        className: 'fb-ph' + (selected ? ' fb-sel' : '') + (hover ? ' fb-hover' : '') + (ui.lastDrop === node.id ? ' fb-drop' : ''),
        onClick: (e) => { e.stopPropagation(); if (!ui.thumb) ui.select(node.id); },
        onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); if (!ui.thumb) ui.setHover(node.id); },
        onDragLeave: () => { if (!ui.thumb) ui.setHover(null); },
        onDrop: (e) => {
          e.preventDefault(); e.stopPropagation();
          if (ui.thumb) return;
          ui.setHover(null);
          const itemId = e.dataTransfer.getData('text/fb-palette');
          if (itemId) ui.dropItem(itemId, node.id);
        },
        title: '空位：点击左侧块或拖入',
        ...(ui.thumb ? {} : { 'data-slot-id': node.id, 'data-node-id': node.id }),
      }, h('span', { className: 'fb-ph-plus' }, '+'));
    }

    function renderNode(node, ui) {
      if (!node) return null;
      if (node.k === 'ph') return h(Placeholder, { key: node.id, node, ui });
      switch (node.k) {
        case 'num':
          return h(BlockShell, { key: node.id, node, ui }, h('span', { className: 'fb-num' }, node.v || '0'));
        case 'var':
          return h(BlockShell, { key: node.id, node, ui }, h('span', { className: 'fb-var' }, fmtSym(node) || 'x'));
        case 'const':
          return h(BlockShell, { key: node.id, node, ui }, h('span', { className: 'fb-const' }, fmtSym(node) || 'c'));
        case 'op':
          return h(BlockShell, { key: node.id, node, ui }, [
            renderNode(node.args[0], ui),
            h('span', { key: node.id + '-op', className: 'fb-op' }, node.op),
            renderNode(node.args[1], ui),
          ]);
        case 'seq':
          return h(BlockShell, { key: node.id, node, ui, extraClass: 'fb-seq' }, node.args.map((a) => renderNode(a, ui)));
        case 'tex':
          return h(BlockShell, { key: node.id, node, ui, extraClass: 'fb-texblock' }, h(TexBlock, { latex: node.latex }));
        case 'neg':
          return h(BlockShell, { key: node.id, node, ui }, [h('span', { key: node.id + '-neg', className: 'fb-op' }, '−'), renderNode(node.a, ui)]);
        case 'frac':
          return h(BlockShell, { key: node.id, node, ui }, [
            h('span', { key: node.id + '-frac', className: 'fb-frac' }, [
              h('span', { key: 'n', className: 'fb-num-part' }, renderNode(node.a, ui)),
              h('span', { key: 'd', className: 'fb-den-part' }, renderNode(node.b, ui)),
            ]),
          ]);
        case 'sqrt':
          return h(BlockShell, { key: node.id, node, ui }, h('span', { className: 'fb-sqrt' }, [
            h('span', { key: 'r', className: 'fb-rad' }, '√'),
            h('span', { key: 'c', className: 'fb-radicand' }, renderNode(node.a, ui)),
          ]));
        case 'sup':
          return h(BlockShell, { key: node.id, node, ui }, [
            h('span', { key: 'b', className: 'fb-base' }, renderNode(node.a, ui)),
            h('sup', { key: 's', className: 'fb-sup' }, renderNode(node.b, ui)),
          ]);
        case 'sub':
          return h(BlockShell, { key: node.id, node, ui }, [
            h('span', { key: 'b', className: 'fb-base' }, renderNode(node.a, ui)),
            h('sub', { key: 's', className: 'fb-sub' }, renderNode(node.b, ui)),
          ]);
        case 'paren':
          return h(BlockShell, { key: node.id, node, ui }, [
            h('span', { key: 'l', className: 'fb-op' }, '('),
            renderNode(node.a, ui),
            h('span', { key: 'r', className: 'fb-op' }, ')'),
          ]);
        case 'fn':
          return h(BlockShell, { key: node.id, node, ui }, [
            h('span', { key: 'n', className: 'fb-fnname' }, node.name),
            h('span', { key: 'l', className: 'fb-op' }, '('),
            ...node.args.map((a, i) => [i ? h('span', { key: 'c' + i, className: 'fb-op' }, ', ') : null, renderNode(a, ui)]),
            h('span', { key: 'r', className: 'fb-op' }, ')'),
          ]);
        case 'call':
          return h(BlockShell, { key: node.id, node, ui }, [
            h('span', { key: 'n', className: 'fb-var' }, UNI[node.name] || node.name),
            h('span', { key: 'l', className: 'fb-op' }, '('),
            ...node.args.map((a, i) => [i ? h('span', { key: 'c' + i, className: 'fb-op' }, ', ') : null, renderNode(a, ui)]),
            h('span', { key: 'r', className: 'fb-op' }, ')'),
          ]);
        case 'sum':
          return h(BlockShell, { key: node.id, node, ui }, h('span', { className: 'fb-bigop' }, [
            h('span', { key: 'lim', className: 'fb-limits' }, [
              h('span', { key: 't' }, renderNode(node.to, ui)),
              h('span', { key: 'g', style: { fontSize: '1.8em', color: '#fb923c' } }, 'Σ'),
              h('span', { key: 'f' }, [
                node.idx ? h('span', { key: 'i', className: 'fb-var' }, UNI[node.idx] || node.idx) : null,
                h('span', { key: 'eq', className: 'fb-op' }, '='),
                renderNode(node.from, ui),
              ]),
            ]),
            h('span', { key: 'body', className: 'fb-int-body' }, renderNode(node.body, ui)),
          ]));
        case 'int':
          return h(BlockShell, { key: node.id, node, ui }, h('span', { className: 'fb-bigop' }, [
            h('span', { key: 'lim', className: 'fb-limits' }, [
              h('span', { key: 't' }, renderNode(node.to, ui)),
              h('span', { key: 'g', style: { fontSize: '1.9em', color: '#fb923c' } }, '∫'),
              h('span', { key: 'f' }, renderNode(node.from, ui)),
            ]),
            h('span', { key: 'body', className: 'fb-int-body' }, [
              renderNode(node.body, ui),
              h('span', { key: 'd', className: 'fb-op', style: { fontSize: '.8em' } }, ' d' + (UNI[node.variable] || node.variable)),
            ]),
          ]));
        case 'pd':
          return h(BlockShell, { key: node.id, node, ui }, h('span', { className: 'fb-pd' }, [
            h('span', { key: 'n', className: 'fb-frac' }, [
              h('span', { key: 'a', className: 'fb-num-part' }, [h('span', { key: 'p', className: 'fb-op' }, '∂'), renderNode(node.f, ui)]),
              h('span', { key: 'b', className: 'fb-den-part' }, [h('span', { key: 'p2', className: 'fb-op' }, '∂' + (UNI[node.x] || node.x))]),
            ]),
          ]));
        case 'hat':
          return h(BlockShell, { key: node.id, node, ui }, h('span', { className: 'fb-hat' }, renderNode(node.a, ui)));
        case 'mat':
          return h(BlockShell, { key: node.id, node, ui }, h('span', { className: 'fb-mat' }, [
            h('span', { key: 'l', className: 'fb-mat-bracket' }, '('),
            h('table', { key: 't' }, h('tbody', null, node.rows.map((row, ri) => h('tr', { key: 'r' + ri }, row.map((cell, ci) => h('td', { key: 'c' + ci }, renderNode(cell, ui))))))),
            h('span', { key: 'r', className: 'fb-mat-bracket' }, ')'),
          ]));
        default:
          return h(BlockShell, { key: node.id, node, ui }, h('span', null, '[' + node.k + ']'));
      }
    }

    /* ------------------------------------------------------------------ *
     * 11. graph view
     * ------------------------------------------------------------------ */
    function layoutGraph(root) {
      const nodes = [];
      const edges = [];
      let leafRow = 0;
      function walk(node, depth, parentId) {
        const children = childNodes(node);
        let row;
        if (!children.length) {
          row = leafRow++;
        } else {
          const rows = children.map((c) => walk(c, depth + 1, node.id));
          row = (Math.min(...rows) + Math.max(...rows)) / 2;
        }
        nodes.push({ id: node.id, node, depth, row, parentId });
        if (parentId) edges.push({ from: parentId, to: node.id });
        return row;
      }
      walk(root, 0, null);
      const byId = {};
      nodes.forEach((n) => { byId[n.id] = n; });
      return { nodes, edges, byId };
    }

    function graphLabel(node) {
      try {
        const tex = toLatex(node || {});
        return tex.length > 26 ? tex.slice(0, 26) + '…' : tex;
      } catch (e) { return KIND_LABEL[node.k] || ''; }
    }

    function GraphView({ root, selectedId, onSelect, onMoveNode, resetKey }) {
      const layout = useMemo(() => layoutGraph(root), [root]);
      const [pos, setPos] = useState({});
      useEffect(() => { setPos({}); }, [resetKey]);
      const dragRef = useRef(null);
      const gw = 152;
      const gh = 46;
      const baseX = (n) => 26 + n.depth * 196;
      const baseY = (n) => 26 + n.row * 76;
      const getPos = (n) => pos[n.id] || { x: baseX(n), y: baseY(n) };

      const onPointerDown = (e, node) => {
        e.stopPropagation();
        const origin = getPos(layout.byId[node.id]);
        dragRef.current = { id: node.id, sx: e.clientX, sy: e.clientY, ox: origin.x, oy: origin.y, moved: false };
        const move = (ev) => {
          const d = dragRef.current;
          if (!d) return;
          if (Math.abs(ev.clientX - d.sx) + Math.abs(ev.clientY - d.sy) > 4) d.moved = true;
          if (d.moved) setPos((p) => ({ ...p, [d.id]: { x: d.ox + ev.clientX - d.sx, y: d.oy + ev.clientY - d.sy } }));
        };
        const up = (ev) => {
          const d = dragRef.current;
          dragRef.current = null;
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          if (!d) return;
          if (!d.moved) { onSelect(d.id); return; }
          try {
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const holder = el && el.closest ? el.closest('[data-node-id]') : null;
            const targetId = holder ? holder.getAttribute('data-node-id') : null;
            if (targetId && targetId !== d.id && onMoveNode) onMoveNode(d.id, targetId);
          } catch (err) { /* ignore */ }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      };

      const maxX = layout.nodes.reduce((m, n) => Math.max(m, getPos(n).x), 0) + gw + 60;
      const maxY = layout.nodes.reduce((m, n) => Math.max(m, getPos(n).y), 0) + gh + 60;

      return h('div', { className: 'fb-graph', style: { width: Math.max(maxX, 520), height: Math.max(maxY, 420) } }, [
        h('div', { key: 'hint', className: 'fb-ghint' }, '节点图：拖动节点调整位置，点击选中；在“积木树”视图里编辑更快。'),
        h('svg', { key: 'edges', className: 'fb-edges', width: Math.max(maxX, 520), height: Math.max(maxY, 420) }, layout.edges.map((e) => {
          const p = layout.byId[e.from];
          const c = layout.byId[e.to];
          if (!p || !c) return null;
          const pp = getPos(p);
          const pc = getPos(c);
          const x1 = pp.x + gw;
          const y1 = pp.y + gh / 2;
          const x2 = pc.x;
          const y2 = pc.y + gh / 2;
          const mx = (x1 + x2) / 2;
          return h('path', {
            key: e.from + '->' + e.to,
            d: 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2,
            fill: 'none',
            stroke: 'rgba(148,163,184,.42)',
            strokeWidth: 1.6,
          });
        })),
        ...layout.nodes.map((n) => {
          const p = getPos(n);
          const color = CATEGORY_COLOR[n.node.k] || '#94a3b8';
          return h('div', {
            key: n.id,
            className: 'fb-gnode' + (selectedId === n.id ? ' fb-sel' : ''),
            style: { left: p.x, top: p.y, '--fb-c': color },
            'data-node-id': n.id,
            'data-slot-id': n.id,
            onPointerDown: (e) => onPointerDown(e, n.node),
            title: '点击选中；拖动可移动；拖到另一个节点上可把子树移过去（相当于连线）',
          }, [
            h('div', { key: 'k', className: 'fb-gnode-k' }, KIND_LABEL[n.node.k] || n.node.k),
            h('div', { key: 't', className: 'fb-gnode-t' }, graphLabel(n.node)),
          ]);
        }),
      ]);
    }

    /* ------------------------------------------------------------------ *
     * 12. quests panel
     * ------------------------------------------------------------------ */
    function QuestPanel({ done, xp, onInsert }) {
      const level = Math.floor(xp / 100) + 1;
      return h('div', null, [
        h('div', { key: 'lv', className: 'fb-hint' }, [
          h('div', { key: 'a', style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, 'Lv.' + level + ' · ' + xp + ' XP'),
          h('div', { key: 'b' }, '拼出经典公式完成关卡；也可以自由拼装，随时复制 LaTeX。'),
        ]),
        ...QUESTS.map((q) => {
          const isDone = !!done[q.id];
          return h('div', { key: q.id, className: 'fb-quest' + (isDone ? ' fb-done' : '') }, [
            h('div', { key: 't', className: 'fb-quest-title' }, [
              h('span', { key: 'i' }, isDone ? '✅' : '🧩'),
              h('span', { key: 'n' }, q.title),
            ]),
            h('div', { key: 'h', className: 'fb-quest-hint' }, q.hint),
            h('div', { key: 'x', className: 'fb-quest-xp' }, '+' + q.xp + ' XP' + (isDone ? ' · 已完成' : '')),
            onInsert ? h('button', {
              key: 'b', className: 'fb-toolbtn', style: { marginTop: '6px' },
              onClick: (e) => { e.stopPropagation(); onInsert(q); },
            }, '插入模板') : null,
          ]);
        }),
      ]);
    }

    /* ------------------------------------------------------------------ *
     * 12b. favorites bar
     * ------------------------------------------------------------------ */
    function FavoritesBar({ favorites, onAdd, onLoad, onRemove }) {
      return h('div', { className: 'fb-favbar' }, [
        h('button', {
          key: 'add', className: 'fb-fav-add', title: '收藏当前公式',
          onClick: onAdd,
        }, '★ 收藏'),
        h('div', { key: 'list', className: 'fb-fav-list' }, favorites.length
          ? favorites.map((f) => h('span', { key: f.id, className: 'fb-fav-chip', title: f.latex }, [
            h('button', { key: 'l', className: 'fb-fav-name', onClick: () => onLoad(f) }, f.name || '未命名公式'),
            h('button', { key: 'x', className: 'fb-fav-del', title: '取消收藏', onClick: () => onRemove(f.id) }, '×'),
          ]))
          : h('span', { key: 'empty', className: 'fb-fav-empty' }, '收藏夹为空：拼好公式后点“★ 收藏”，这里会出现快捷入口')),
      ]);
    }

    function LiteraturePanel({ copy, onImport, showToast }) {
      const [text, setText] = useState('');
      const [cands, setCands] = useState([]);
      const [sel, setSel] = useState({});
      const extract = () => {
        const list = extractLatexCandidates(text);
        setCands(list);
        const s = {};
        list.forEach((c) => { s[c.id] = true; });
        setSel(s);
        showToast(list.length ? ('提取到 ' + list.length + ' 条候选') : '没有识别到公式：请粘贴 LaTeX 片段，或每行含等号的公式行');
      };
      const doImport = () => {
        const chosen = cands.filter((c) => sel[c.id]);
        if (!chosen.length) { showToast('先勾选要导入的公式'); return; }
        onImport(chosen);
      };
      const promptText = '请帮我从下面这篇文献中提取公式。优先使用 arXiv 官方 HTML（MathML alttext）或 e-print 的 TeX 源码；'
        + '每条公式请给出 LaTeX、式号、页码/章节、来源（DOI/arXiv ID）；无法确定的请标注“待核验”，不要编造。\n\n'
        + (text || '（粘贴论文链接、DOI、arXiv ID 或正文片段）');
      return h('div', null, [
        h('div', { key: 'n', className: 'fb-set-note' }, '粘贴论文里的 LaTeX 片段/整段文本，自动识别公式候选；也可复制提示词交给 Agent 从 arXiv/PDF 中提取。'),
        h('textarea', {
          key: 'ta', className: 'fb-import-ta', style: { minHeight: '120px' },
          placeholder: '例如：\n\\begin{equation}\nE = mc^2\n\\end{equation}\n或每行一条 F = ma',
          value: text, onChange: (e) => setText(e.target.value),
        }),
        h('div', { key: 'btns', className: 'fb-set-btns' }, [
          h('button', { key: 'ex', className: 'fb-toolbtn fb-primary', onClick: extract }, '识别公式候选'),
          h('button', { key: 'im', className: 'fb-toolbtn', onClick: doImport }, '导入所选到收藏夹'),
          h('button', { key: 'p', className: 'fb-toolbtn', onClick: () => copy(promptText) }, '复制“文献提取”提示词'),
        ]),
        cands.length ? h('div', { key: 'list', className: 'fb-lit-list' }, cands.map((c) => h('label', { key: c.id, className: 'fb-lit-row' }, [
          h('input', {
            key: 'c', type: 'checkbox', checked: !!sel[c.id],
            onChange: () => setSel((prev) => ({ ...prev, [c.id]: !prev[c.id] })),
          }),
          h('code', { key: 'l', className: 'fb-lit-tex' }, c.latex.length > 120 ? c.latex.slice(0, 120) + '…' : c.latex),
          h('span', { key: 'o', className: 'fb-lit-origin' }, c.origin),
        ]))) : null,
        h('div', { key: 'tip', className: 'fb-set-note', style: { marginTop: '8px' } }, '提示：更完整的文献链路（arXiv 直连、PDF 文字层、扫描件 OCR）在下一版接入；当前先支持“粘贴即用”。'),
      ]);
    }

    /* ------------------------------------------------------------------ *
     * 12d. settings panel shell
     * ------------------------------------------------------------------ */
    const TOOL_GUIDES = [
      { id: 'python', name: 'Python', url: 'https://www.python.org/downloads/', note: '数值/符号计算（NumPy/SciPy/SymPy）；安装时勾选 Add to PATH' },
      { id: 'vscode', name: 'VS Code / Visual Studio', url: 'https://code.visualstudio.com/', note: '写代码/调试；VS Code 装 Python、LaTeX Workshop 扩展' },
      { id: 'matlab', name: 'MATLAB', url: 'https://www.mathworks.com/products/matlab.html', note: '需 MathWorks 账号与许可证；支持 matlab -batch' },
      { id: 'comsol', name: 'COMSOL Multiphysics', url: 'https://www.comsol.com/', note: '商业仿真软件；需许可证，适合多物理场' },
      { id: 'latex', name: 'LaTeX（TeX Live / MiKTeX）', url: 'https://www.tug.org/texlive/', note: '论文排版；装完用 pdflatex/xelatex 验证' },
      { id: 'overleaf', name: 'Overleaf（网页）', url: 'https://www.overleaf.com/', note: '无需本地安装，浏览器即可写 LaTeX 论文' },
      { id: 'office', name: 'Microsoft Office（Word/PPT）', url: 'https://www.microsoft.com/microsoft-365', note: '公式可走 OMML 导入/导出' },
      { id: 'wps', name: 'WPS Office', url: 'https://www.wps.cn/', note: '国内常用；公式/论文排版另一选择' },
    ];

    function promptToolcheck() {
      return '请检查我本机已安装的科研/写作工具：Python、VS Code、MATLAB、COMSOL、LaTeX（TeX Live/MiKTeX）、Microsoft Office、WPS。'
        + '优先使用插件命令 /toolcheck 或直接扫描 PATH 与常见安装目录；请报告每个工具的路径与版本，未安装的给出官方下载链接和 Windows 配置步骤，不要替我安装。';
    }
    function promptProject(latex, tool, folder) {
      return '请根据下面这条公式，帮我在本地搭建/打开一个可运行的项目。\n'
        + '公式（LaTeX）：' + latex + '\n'
        + '目标工具：' + (tool || 'Python') + '\n'
        + '项目目录：' + (folder || '请先问我选哪个文件夹（新建或已有项目）') + '\n'
        + '要求：1) 先检查本机该工具是否可用并报告结果；2) 如果是新项目，生成最小可运行骨架与 README；'
        + '3) 生成实现该公式的代码/设置文件，在插件里先预览给我确认再运行；4) 运行结果（数值/图表路径/日志）回帖给我；'
        + '5) 不要静默安装任何软件，不要写项目目录以外的文件。';
    }
    function promptPaper(latex, target) {
      return '请帮我围绕下面这条公式写一段论文内容（可继续扩写成小节）。\n'
        + '公式（LaTeX）：' + latex + '\n'
        + '目标：' + (target || '中文/英文期刊论文的方法或结果小节') + '\n'
        + '要求：先说明公式的物理/数学含义、适用条件与符号定义，再给出推导要点与可验证的数值例子；'
        + '写作遵循目标期刊/学校的规范，引用真实可核验的文献，不编造数据或 DOI。';
    }

    function SettingsPanel({ settings, update, favorites, onClose, copy, onExport, onImport, onClearFav, onClearAll, latex, name }) {
      const [tool, setTool] = useState('Python');
      const [folder, setFolder] = useState('');
      const fileRef = useRef(null);
      const section = (title, children) => h('div', { className: 'fb-set-section', key: title }, [
        h('div', { key: 't', className: 'fb-set-title' }, title),
        h('div', { key: 'c' }, children),
      ]);
      return h('div', { className: 'fb-modal', onClick: onClose }, h('div', {
        className: 'fb-modal-card',
        onClick: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'h', className: 'fb-modal-head' }, [
          h('div', { key: 't', className: 'fb-modal-title' }, '⚙ 设置与说明'),
          h('button', { key: 'x', className: 'fb-iconbtn', onClick: onClose }, '✕'),
        ]),
        h('div', { key: 'b', className: 'fb-modal-body' }, [
          section('OCR 后端（可选）', [
            h('div', { key: 'n', className: 'fb-mini' }, 'Mathpix 凭据只保存在本机 localStorage，由 Host 调用 Mathpix API；也可用 pix2tex 本地识别（无需 Key）。'),
            h('label', { key: 'id', className: 'fb-set-row' }, [
              h('span', { key: 's' }, 'Mathpix App ID'),
              h('input', {
                key: 'i', className: 'fb-insp-input', value: settings.mathpixId || '',
                onChange: (e) => update({ mathpixId: e.target.value }),
              }),
            ]),
            h('label', { key: 'key', className: 'fb-set-row' }, [
              h('span', { key: 's' }, 'Mathpix App Key'),
              h('input', {
                key: 'i', type: 'password', className: 'fb-insp-input', value: settings.mathpixKey || '',
                onChange: (e) => update({ mathpixKey: e.target.value }),
              }),
            ]),
          ]),
          section('外观与画布', [
            h('label', { key: 'hint', className: 'fb-set-row' }, [
              h('input', {
                key: 'c', type: 'checkbox', checked: !!settings.showHints,
                onChange: (e) => update({ showHints: e.target.checked }),
              }),
              h('span', { key: 's' }, '显示操作提示（Ctrl+滚轮缩放、拖拽说明）'),
            ]),
            h('label', { key: 'step', className: 'fb-set-row' }, [
              h('span', { key: 's' }, '缩放步长'),
              h('select', {
                key: 'v', value: String(settings.zoomStep),
                onChange: (e) => update({ zoomStep: Number(e.target.value) }),
              }, [0.05, 0.1, 0.15, 0.2].map((v) => h('option', { key: v, value: String(v) }, Math.round(v * 100) + '%'))),
            ]),
            h('label', { key: 'size', className: 'fb-set-row' }, [
              h('span', { key: 's' }, '公式字号'),
              h('input', {
                key: 'v', type: 'range', min: 20, max: 40, value: settings.mathSize,
                onChange: (e) => update({ mathSize: Number(e.target.value) }),
              }),
              h('span', { key: 'n', className: 'fb-set-val' }, settings.mathSize + 'px'),
            ]),
            h('label', { key: 'accent', className: 'fb-set-row' }, [
              h('span', { key: 's' }, '强调色'),
              h('select', {
                key: 'v', value: settings.accent,
                onChange: (e) => update({ accent: e.target.value }),
              }, [
                h('option', { key: 'a', value: '#4f8cff' }, '科技蓝'),
                h('option', { key: 'b', value: '#8b5cf6' }, '量子紫'),
                h('option', { key: 'c', value: '#10b981' }, '翡翠绿'),
                h('option', { key: 'd', value: '#f59e0b' }, '琥珀金'),
              ]),
            ]),
            h('label', { key: 'view', className: 'fb-set-row' }, [
              h('span', { key: 's' }, '默认视图'),
              h('select', {
                key: 'v', value: settings.defaultView,
                onChange: (e) => update({ defaultView: e.target.value }),
              }, [
                h('option', { key: 't', value: 'tree' }, '积木树'),
                h('option', { key: 'g', value: 'graph' }, '节点图'),
              ]),
            ]),
          ]),
          section('收藏与数据（浏览器本地）', [
            h('div', { key: 'c', className: 'fb-set-note' }, '当前收藏 ' + favorites.length + ' 条；数据保存在本机浏览器 localStorage，清缓存会丢失。'),
            h('div', { key: 'btns', className: 'fb-set-btns' }, [
              h('button', { key: 'e', className: 'fb-toolbtn', onClick: onExport }, '导出全部数据 (JSON)'),
              h('button', { key: 'i', className: 'fb-toolbtn', onClick: () => fileRef.current && fileRef.current.click() }, '导入 JSON'),
              h('button', { key: 'c', className: 'fb-toolbtn', onClick: onClearFav }, '清空收藏'),
              h('button', { key: 'a', className: 'fb-toolbtn', style: { color: '#f87171' }, onClick: onClearAll }, '清空全部数据'),
            ]),
            h('input', {
              key: 'f', ref: fileRef, type: 'file', accept: '.json,application/json', style: { display: 'none' },
              onChange: (e) => { const f = e.target.files && e.target.files[0]; if (f) onImport(f); e.target.value = ''; },
            }),
          ]),
          section('本地工具与项目（交给 Agent）', [
            h('div', { key: 'note', className: 'fb-set-note' }, '插件不会擅自安装软件。点“检测”提示词发给 Agent，结果会出现在对话里；按需复制项目/论文提示词。'),
            h('div', { key: 'tools', className: 'fb-tool-list' }, TOOL_GUIDES.map((t) => h('div', { key: t.id, className: 'fb-tool-row' }, [
              h('div', { key: 'l', className: 'fb-tool-name' }, t.name),
              h('div', { key: 'n', className: 'fb-tool-note' }, t.note),
              h('a', { key: 'u', className: 'fb-tool-link', href: t.url, target: '_blank', rel: 'noreferrer' }, '官方入口 ↗'),
            ]))),
            h('div', { key: 'detect', className: 'fb-set-btns' }, [
              h('button', { key: 'd', className: 'fb-toolbtn fb-primary', onClick: () => copy(promptToolcheck()) }, '复制“检测本地工具”提示词'),
              h('button', { key: 'c', className: 'fb-toolbtn', onClick: () => copy('/toolcheck') }, '复制 /toolcheck 命令'),
            ]),
            h('div', { key: 'proj', className: 'fb-set-box' }, [
              h('div', { key: 'r1', className: 'fb-set-row' }, [
                h('span', { key: 's' }, '目标工具'),
                h('select', { key: 'v', value: tool, onChange: (e) => setTool(e.target.value) }, ['Python', 'MATLAB', 'COMSOL', 'VS Code / C++', 'LaTeX / Overleaf', 'Office / WPS'].map((x) => h('option', { key: x, value: x }, x))),
              ]),
              h('input', {
                key: 'r2', className: 'fb-search', style: { width: '100%', margin: '6px 0' },
                placeholder: '项目文件夹（可留空，让 Agent 先问你）', value: folder,
                onChange: (e) => setFolder(e.target.value),
              }),
              h('div', { key: 'r3', className: 'fb-set-btns' }, [
                h('button', { key: 'p', className: 'fb-toolbtn fb-primary', onClick: () => copy(promptProject(latex, tool, folder)) }, '复制“搭建/运行项目”提示词'),
                h('button', { key: 'w', className: 'fb-toolbtn', onClick: () => copy(promptPaper(latex, '中文/英文期刊论文')) }, '复制“论文写作”提示词'),
              ]),
            ]),
          ]),
          section('版权与使用说明', [
            h('div', { key: 'about', className: 'fb-about' }, [
              h('div', { key: 'v', className: 'fb-about-strong' }, '公式积木 Formula Blocks v2.1.0'),
              h('div', { key: 'c' }, '© 2026 公式积木插件作者。本插件以 MIT License 发布（可自由使用、修改、分发，保留版权声明）。'),
              h('div', { key: 'd' }, '第三方：React 由 DeepSeek Harness 宿主提供；本插件未打包第三方数学库。公式库中的常量数值参考 CODATA 2022 常用值，仅作计算提示，请以官方发布为准。'),
              h('div', { key: 'u' }, '使用说明：左侧选块或拖入空位拼装；右侧调变量单位/量纲/含义；“关卡”可完成示例；底部复制 LaTeX。数据默认只存本机浏览器，不上传服务器。'),
              h('div', { key: 'w' }, '免责声明：本插件生成的结果（公式、代码、提示词）仅供科研辅助，正确性需作者自行核验；调用本地软件/运行代码前请确认内容与权限。'),
              h('div', { key: 'n' }, '当前公式：' + (name || '未命名') + ' · ' + String(latex || '').slice(0, 120)),
            ]),
          ]),
        ]),
      ]));
    }

    function LibraryPanel({ onInsert }) {
      const [state, setState] = useState({ loading: true, items: [], error: '' });
      const [query, setQuery] = useState('');
      useEffect(() => {
        let alive = true;
        (async () => {
          try {
            const data = await apiGet('library');
            if (!alive) return;
            setState({ loading: false, items: Array.isArray(data.formulas) ? data.formulas : [], error: '' });
          } catch (e) {
            if (!alive) return;
            setState({ loading: false, items: [], error: '公式库不可用（Host 路由未就绪）：' + ((e && e.message) || e) });
          }
        })();
        return () => { alive = false; };
      }, []);
      const items = state.items.filter((it) => {
        if (!query) return true;
        const hay = ((it.title || '') + ' ' + (it.domain || '') + ' ' + (it.latex || '') + ' ' + (it.meaning || '')).toLowerCase();
        return hay.indexOf(query.toLowerCase()) >= 0;
      });
      return h('div', null, [
        h('div', { key: 'n', className: 'fb-set-note' }, '内置审定种子公式（' + state.items.length + ' 条，来自核验过的 seed 数据）。点击插入当前行；复杂公式解析失败时会复制 LaTeX 供你粘贴或交给 Agent。'),
        h('input', {
          key: 'q', className: 'fb-search', style: { width: '100%', margin: '0 0 8px' },
          placeholder: '搜索：领域 / 名称 / LaTeX / 含义', value: query, onChange: (e) => setQuery(e.target.value),
        }),
        state.loading ? h('div', { key: 'l', className: 'fb-set-note' }, '加载公式库…') : null,
        state.error ? h('div', { key: 'e', className: 'fb-import-err' }, state.error) : null,
        h('div', { key: 'list', className: 'fb-library-list' }, items.map((it) => h('div', {
          key: it.id, className: 'fb-lib-item', title: it.source || '', onClick: () => onInsert(it),
        }, [
          h('div', { key: 't', className: 'fb-lib-title' }, [h('span', { key: 'a' }, it.title), h('span', { key: 'b', className: 'fb-lib-domain' }, it.domain)]),
          h('div', { key: 'x', className: 'fb-lib-latex' }, it.latex),
          it.meaning ? h('div', { key: 'm', className: 'fb-lib-meaning' }, it.meaning) : null,
        ]))),
      ]);
    }

    function ImagePanel({ copy, onLatex, showToast, settings }) {
      const [img, setImg] = useState(null);
      const [saved, setSaved] = useState(null);
      const [latex, setLatex] = useState('');
      const [busy, setBusy] = useState(false);
      const [ocrBusy, setOcrBusy] = useState(false);
      const [ocrMsg, setOcrMsg] = useState('');
      const fileRef = useRef(null);
      const readFile = (file) => {
        if (!file || !file.type || file.type.indexOf('image/') !== 0) { showToast('请粘贴/选择图片文件'); return; }
        const reader = new FileReader();
        reader.onload = () => {
          setImg({ dataUrl: String(reader.result || ''), mime: file.type || 'image/png', name: file.name || 'screenshot.png' });
          setSaved(null);
        };
        reader.onerror = () => showToast('读取图片失败');
        reader.readAsDataURL(file);
      };
      const onPaste = (e) => {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (const item of items) {
          if (item.type && item.type.indexOf('image/') === 0) {
            const file = item.getAsFile();
            if (file) { e.preventDefault(); readFile(file); return; }
          }
        }
      };
      const saveAndPrompt = async () => {
        if (!img) { showToast('先粘贴或选择一张公式截图'); return; }
        setBusy(true);
        try {
          const base64 = String(img.dataUrl).split(',')[1] || '';
          const res = await apiPost('image', { data: base64, mime: img.mime, name: img.name });
          setSaved(res);
          await copy('请用 read_image 读取图片 ' + res.path + ' ，识别其中的数学公式并输出 LaTeX（只输出公式本身；多行用 \\\\ 分隔；不确定的符号标注“待核验”）。');
          showToast('图片已保存，识图提示词已复制；发给 Agent 后把返回的 LaTeX 贴回这里');
        } catch (e) { showToast('保存图片失败：' + ((e && e.message) || e)); }
        finally { setBusy(false); }
      };
      const runOcr = async () => {
        if (!img) { showToast('先粘贴或选择一张公式截图'); return; }
        setOcrBusy(true);
        setOcrMsg('识别中…（pix2tex/Mathpix）');
        try {
          let path = saved && saved.path;
          if (!path) {
            const base64 = String(img.dataUrl).split(',')[1] || '';
            const up = await apiPost('image', { data: base64, mime: img.mime, name: img.name });
            path = up.path;
            setSaved(up);
          }
          const res = await apiPost('ocr', {
            path, mime: img.mime,
            mathpixId: settings && settings.mathpixId ? settings.mathpixId : '',
            mathpixKey: settings && settings.mathpixKey ? settings.mathpixKey : '',
          });
          if (res && res.ok && res.latex) {
            setLatex(res.latex);
            setOcrMsg('识别完成（' + res.backend + '）：已填入下方，核对后导入');
            showToast('识别完成，请核对后导入');
          } else {
            setOcrMsg('未识别：' + ((res && res.message) || '无结果'));
          }
        } catch (e) { setOcrMsg('识别失败：' + ((e && e.message) || e)); }
        finally { setOcrBusy(false); }
      };
      return h('div', null, [
        h('div', { key: 'n', className: 'fb-set-note' }, '粘贴/拖入公式截图 → 保存图片并复制识图提示词 → 发给 Agent（多模态）→ 把返回的 LaTeX 贴回下面导入。识别由 Agent 完成，不上传第三方。'),
        h('div', {
          key: 'drop', className: 'fb-imgdrop', tabIndex: 0,
          onPaste, onDragOver: (e) => e.preventDefault(),
          onDrop: (e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; readFile(f); },
          onClick: () => fileRef.current && fileRef.current.click(),
        }, img
          ? h('img', { key: 'i', className: 'fb-img', src: img.dataUrl, alt: '公式截图' })
          : h('div', { key: 'p', className: 'fb-imgph' }, '点击选择 / 拖入 / 聚焦后 Ctrl+V 粘贴截图')),
        h('input', {
          key: 'f', ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' },
          onChange: (e) => { const f = e.target.files && e.target.files[0]; if (f) readFile(f); e.target.value = ''; },
        }),
        h('div', { key: 'btns', className: 'fb-set-btns' }, [
          h('button', { key: 's', className: 'fb-toolbtn fb-primary', disabled: busy, onClick: saveAndPrompt }, busy ? '保存中…' : '保存图片并复制识图提示词'),
          h('button', { key: 'o', className: 'fb-toolbtn', disabled: ocrBusy, onClick: runOcr }, ocrBusy ? '识别中…' : '一键识别（本地/云 OCR）'),
          h('button', {
            key: 'pix', className: 'fb-toolbtn',
            onClick: () => copy('python -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple pix2tex'),
          }, '复制 pix2tex 安装命令'),
        ]),
        ocrMsg ? h('div', { key: 'ocrmsg', className: 'fb-mini' }, ocrMsg) : null,
        saved ? h('div', { key: 'saved', className: 'fb-mini', style: { wordBreak: 'break-all' } }, '已保存：' + saved.path) : null,
        h('div', { key: 'ta', className: 'fb-field', style: { marginTop: '8px' } }, [
          h('label', { key: 'l' }, 'Agent / SimpleTex 返回的 LaTeX'),
          h('textarea', {
            key: 't', className: 'fb-import-ta', value: latex,
            placeholder: '例如：E = mc^2 或 \\frac{\\partial \\psi}{\\partial t}',
            onChange: (e) => setLatex(e.target.value),
          }),
        ]),
        h('div', { key: 'imp', className: 'fb-set-btns' }, [
          h('button', { key: 'i', className: 'fb-toolbtn', onClick: () => onLatex(latex) }, '解析并插入当前行'),
          h('button', { key: 'c', className: 'fb-toolbtn', onClick: () => copy(latex) }, '复制 LaTeX'),
        ]),
      ]);
    }

    function useKatex() {
      const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.katex);
      useEffect(() => {
        if (ready) return undefined;
        if (typeof document === 'undefined' || !document.head) return undefined;
        let script = document.getElementById('fb-katex-script');
        const onload = () => setReady(!!(window.katex));
        if (!script) {
          try {
            const link = document.createElement('link');
            link.id = 'fb-katex-css'; link.rel = 'stylesheet';
            link.href = '/formula-blocks/assets/katex/katex.min.css';
            document.head.appendChild(link);
            script = document.createElement('script');
            script.id = 'fb-katex-script';
            script.src = '/formula-blocks/assets/katex/katex.min.js';
            script.onload = onload;
            document.head.appendChild(script);
          } catch (e) { return undefined; }
        } else {
          script.addEventListener('load', onload);
        }
        return () => { try { script.removeEventListener('load', onload); } catch (e) { /* ignore */ } };
      }, [ready]);
      return ready;
    }

    function KatexBlock({ latex }) {
      const ready = useKatex();
      const ref = useRef(null);
      useEffect(() => {
        if (!ready || !ref.current || !window.katex) return;
        try {
          window.katex.render(String(latex || ''), ref.current, { throwOnError: false, displayMode: true, strict: 'ignore' });
        } catch (e) {
          try { ref.current.textContent = String(latex || ''); } catch (e2) { /* ignore */ }
        }
      }, [ready, latex]);
      if (!ready) return h('div', { className: 'fb-katex-fallback' }, 'KaTeX 加载中…  ' + String(latex || ''));
      return h('div', { className: 'fb-katex', ref });
    }

    function TexBlock({ latex }) {
      const ready = useKatex();
      if (!ready) return h('span', { className: 'fb-textext' }, String(latex || ''));
      return h(KatexBlock, { latex: '\\displaystyle ' + String(latex || '') });
    }

    function MathLiveModal({ initialLatex, onInsert, onClose, copy }) {
      const hostRef = useRef(null);
      const fieldRef = useRef(null);
      const [ready, setReady] = useState(false);
      const [err, setErr] = useState('');
      useEffect(() => {
        let alive = true;
        const addCss = (id, href) => {
          if (document.getElementById(id)) return;
          const link = document.createElement('link');
          link.id = id; link.rel = 'stylesheet'; link.href = href;
          document.head.appendChild(link);
        };
        addCss('fb-mathlive-fonts', '/formula-blocks/assets/mathlive/mathlive-fonts.css');
        addCss('fb-mathlive-static', '/formula-blocks/assets/mathlive/mathlive-static.css');
        import('/formula-blocks/assets/mathlive/mathlive.min.mjs').then(() => {
          if (!alive || !hostRef.current) return;
          const el = document.createElement('math-field');
          el.style.width = '100%';
          el.style.minHeight = '130px';
          el.style.fontSize = '22px';
          el.style.background = 'var(--dsw-alias-bg-layer-1,#171b26)';
          el.style.color = 'var(--dsw-alias-label-primary,#eef2fa)';
          el.style.border = '1px solid rgba(148,163,184,.3)';
          el.style.borderRadius = '10px';
          el.style.padding = '8px';
          try { el.value = initialLatex || ''; } catch (e) { /* ignore */ }
          hostRef.current.appendChild(el);
          fieldRef.current = el;
          setReady(true);
        }).catch((e) => { if (alive) setErr('MathLive 加载失败：' + ((e && e.message) || e)); });
        return () => { alive = false; };
      }, [initialLatex]);
      const getLatex = () => {
        try {
          const el = fieldRef.current;
          if (!el) return '';
          const v = typeof el.getValue === 'function' ? el.getValue() : el.value;
          return String(v || '');
        } catch (e) { return ''; }
      };
      return h('div', { className: 'fb-modal', onClick: onClose }, h('div', {
        className: 'fb-modal-card', onClick: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'h', className: 'fb-modal-head' }, [
          h('div', { key: 't', className: 'fb-modal-title' }, 'MathLive 专业输入'),
          h('button', { key: 'x', className: 'fb-iconbtn', onClick: onClose }, '✕'),
        ]),
        h('div', { key: 'b', className: 'fb-modal-body' }, [
          h('div', { key: 'n', className: 'fb-set-note' }, '所见即所得输入（MathLive 内核，本地加载）。输入完成后插入当前行；复杂公式会作为 LaTeX 保真块。'),
          h('div', { key: 'host', ref: hostRef, className: 'fb-mathlive-host' }),
          !ready && !err ? h('div', { key: 'l', className: 'fb-set-note' }, 'MathLive 加载中…') : null,
          err ? h('div', { key: 'e', className: 'fb-import-err' }, err) : null,
          h('div', { key: 'btns', className: 'fb-set-btns' }, [
            h('button', { key: 'i', className: 'fb-toolbtn fb-primary', disabled: !ready, onClick: () => onInsert(getLatex()) }, '插入当前行'),
            h('button', { key: 'c', className: 'fb-toolbtn', onClick: () => copy(getLatex()) }, '复制 LaTeX'),
            h('button', { key: 'x2', className: 'fb-toolbtn', onClick: onClose }, '关闭'),
          ]),
        ]),
      ]));
    }

    function LatexPreviewModal({ project, onClose, copy, onExport }) {
      const rows = project.rows;
      return h('div', { className: 'fb-modal', onClick: onClose }, h('div', {
        className: 'fb-modal-card fb-preview-card', onClick: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'h', className: 'fb-modal-head' }, [
          h('div', { key: 't', className: 'fb-modal-title' }, '排版预览 · KaTeX'),
          h('button', { key: 'x', className: 'fb-iconbtn', onClick: onClose }, '✕'),
        ]),
        h('div', { key: 'b', className: 'fb-modal-body' }, [
          h('div', { key: 'n', className: 'fb-set-note' }, '用 KaTeX 按出版风格排版当前项目的每一行公式；编辑仍在积木视图中进行。'),
          ...rows.map((row, i) => h('div', { key: row.id, className: 'fb-preview-row' }, [
            h('div', { key: 'n', className: 'fb-preview-row-name' }, (i + 1) + '. ' + row.name),
            h(KatexBlock, { key: 'k', latex: toLatex(row.root) }),
            h('button', { key: 'c', className: 'fb-toolbtn', onClick: () => copy('$$ ' + toLatex(row.root) + ' $$') }, '复制 $$…$$'),
            h('button', { key: 'png', className: 'fb-toolbtn', onClick: () => onExport('png', row.root) }, 'PNG'),
            h('button', { key: 'jpg', className: 'fb-toolbtn', onClick: () => onExport('jpg', row.root) }, 'JPG'),
            h('button', { key: 'pdf', className: 'fb-toolbtn', onClick: () => onExport('pdf', row.root) }, 'PDF'),
          ])),
        ]),
      ]));
    }

    function InlineEditor({ edit, onCommit, onDelete }) {
      const [value, setValue] = useState(edit.value);
      const ref = useRef(null);
      const done = useRef(false);
      useEffect(() => {
        const el = ref.current;
        if (el) { try { el.focus(); el.select(); } catch (e) { /* ignore */ } }
      }, []);
      const finish = (cancel) => {
        if (done.current) return;
        done.current = true;
        onCommit(value, cancel);
      };
      return h('div', {
        className: 'fb-inline-wrap',
        style: { left: edit.left + 'px', top: edit.top + 'px' },
      }, [
        h('input', {
          key: 'i', ref, className: 'fb-inline-edit',
          style: { width: Math.max(56, edit.width - 34) + 'px' },
          value, spellCheck: false,
          onChange: (e) => setValue(e.target.value),
          onKeyDown: (e) => {
            if (e.key === 'Enter') { e.preventDefault(); finish(false); }
            else if (e.key === 'Escape') { e.preventDefault(); finish(true); }
            e.stopPropagation();
          },
          onBlur: () => finish(false),
          onClick: (e) => e.stopPropagation(),
        }),
        h('button', {
          key: 'd', className: 'fb-inline-del', title: '删除此块',
          onMouseDown: (e) => e.preventDefault(),
          onClick: (e) => {
            e.stopPropagation();
            if (done.current) return;
            done.current = true;
            if (onDelete) onDelete();
          },
        }, '🗑'),
      ]);
    }

    /* ------------------------------------------------------------------ *
     * 12e. status lamps / row strip / inspector / review
     * ------------------------------------------------------------------ */
    function describeNode(node, root, dimInfo) {
      if (!node) {
        const vars = [];
        (function walk(n) { if (!n) return; if (n.k === 'var') vars.push(n.sym || '?'); childNodes(n).forEach(walk); })(root);
        return '整条公式：' + (toLatex(root) || '空') + '。包含 ' + vars.length + ' 个变量'
          + (vars.length ? ('（' + Array.from(new Set(vars)).join('、') + '）') : '')
          + '。量纲：' + (dimInfo.issues.length ? dimInfo.issues.join('；') : (dimInfo.unknown.length ? ('未标注 ' + dimInfo.unknown.join('、')) : '一致（' + dimText(dimInfo.dim) + '）'));
      }
      const kind = KIND_LABEL[node.k] || node.k;
      if (node.k === 'var') {
        return '变量块「' + (node.sym || '?') + '」'
          + (node.name ? ('，物理量：' + node.name) : '')
          + (node.unit ? ('，单位 ' + node.unit) : '，单位未填')
          + (node.dim ? ('，量纲 ' + node.dim) : '，量纲未填')
          + (node.domain ? ('，值域 ' + node.domain) : '')
          + (node.type ? ('，数据形式 ' + node.type) : '')
          + (node.meaning ? ('。含义：' + node.meaning) : '。');
      }
      if (node.k === 'const') return '常量块「' + (node.sym || '') + '」：' + node.name + '，数值 ' + node.value + (node.unit ? ('，单位 ' + node.unit) : '') + '。';
      if (node.k === 'num') return '数字块：' + node.v + '。';
      if (node.k === 'op') return '运算块「' + node.op + '」：把左右子表达式按该算符组合；量纲检查会验证两侧是否匹配。';
      if (node.k === 'frac') return '分式块：分子 ÷ 分母；量纲为两者量纲之差。';
      if (node.k === 'sqrt') return '根式块：对内部表达式开方；量纲指数减半。';
      if (node.k === 'sup') return '幂块：底数 ^ 指数；常量指数会把量纲按指数缩放。';
      if (node.k === 'int') return '积分块：对内部表达式沿指定变量积分；结果量纲乘以积分变量量纲。';
      if (node.k === 'sum') return '求和块：对指标求和，量纲取被求和项。';
      if (node.k === 'pd') return '偏导块：对内部表达式求偏导；量纲除以变量量纲。';
      if (node.k === 'fn') return '函数块「' + node.name + '」：参数通常应无量纲。';
      if (node.k === 'call') return '函数调用块「' + (node.name || '') + '」。';
      return kind + '块：' + (toLatex(node) || '');
    }

    function StatusLamps({ checks, agentChecked, onReview, onMarkAgent }) {
      const lamp = checks.lamp;
      return h('div', { className: 'fb-statusbar' }, [
        h('div', { key: 'lamps', className: 'fb-lamps' }, [
          h('span', { key: 'r', className: 'fb-lamp fb-lamp-r' + (lamp === 'red' ? ' fb-lamp-on' : '') }),
          h('span', { key: 'y', className: 'fb-lamp fb-lamp-y' + (lamp === 'yellow' ? ' fb-lamp-on' : '') }),
          h('span', { key: 'g', className: 'fb-lamp fb-lamp-g' + (lamp === 'green' ? ' fb-lamp-on' : '') })
        ]),
        h('span', { key: 't', className: 'fb-status-text' }, checks.reason),
        h('div', { key: 'sp', style: { flex: 1 } }),
        h('button', { key: 'rev', className: 'fb-toolbtn', onClick: onReview }, '审核当前项目'),
        h('button', {
          key: 'agent', className: 'fb-toolbtn' + (agentChecked ? ' fb-primary' : ''),
          onClick: () => onMarkAgent(!agentChecked),
          title: '你自己确认 Agent 已用 Python/计算后端复核通过后，点亮绿灯',
        }, agentChecked ? '✓ Agent 已复核' : '标记 Agent 已复核'),
      ]);
    }

    function RowStrip({ rows, activeId, onSelect, onAdd, onDup, onDel }) {
      return h('div', { className: 'fb-rowstrip' }, [
        h('span', { key: 'l', className: 'fb-rowstrip-label' }, '公式行'),
        h('div', { key: 'list', className: 'fb-rowchips' }, rows.map((r, i) => h('button', {
          key: r.id,
          className: 'fb-rowchip' + (r.id === activeId ? ' fb-rowchip-on' : ''),
          onClick: () => onSelect(r.id),
          title: r.name,
        }, (i + 1) + '. ' + r.name))),
        h('div', { key: 'sp', style: { flex: 1 } }),
        h('button', { key: 'add', className: 'fb-toolbtn', onClick: onAdd, title: '添加一行公式' }, '＋ 行'),
        h('button', { key: 'dup', className: 'fb-toolbtn', onClick: onDup, title: '复制当前行' }, '复制行'),
        h('button', { key: 'del', className: 'fb-toolbtn', onClick: onDel, title: '删除当前行（至少保留一行）', style: { color: '#f87171' } }, '删除行'),
      ]);
    }

    function Inspector({ node, root, dimInfo, row, updateSelected, updateRowNote, onRenameRow, onDelete, copy }) {
      const title = node ? ('选中：' + (KIND_LABEL[node.k] || node.k) + '块') : '整条公式';
      const body = [];
      body.push(h('div', { key: 'd', className: 'fb-insp-desc' }, describeNode(node, root, dimInfo)));
      if (!node) {
        body.push(h('div', { key: 'row', className: 'fb-insp-row' }, [
          h('span', { key: 'l' }, '行名称'),
          h('input', {
            key: 'i', className: 'fb-insp-input', value: row.name,
            onChange: (e) => onRenameRow(row.id, e.target.value),
          }),
        ]));
        body.push(h('div', { key: 'note', className: 'fb-insp-row' }, [
          h('span', { key: 'l' }, '备注/含义'),
          h('input', {
            key: 'i', className: 'fb-insp-input', value: row.note || '',
            placeholder: '这条公式的用途、假设或出处', onChange: (e) => updateRowNote(e.target.value),
          }),
        ]));
      } else if (node.k === 'var') {
        const f = (label, key, placeholder, onChange) => h('label', { key: label, className: 'fb-insp-field' }, [
          h('span', { key: 'l' }, label),
          h('input', {
            key: 'i', className: 'fb-insp-input', value: node[key] || '', placeholder,
            onChange: (e) => updateSelected({ [key]: e.target.value }),
          }),
        ]);
        body.push(h('div', { key: 'fields', className: 'fb-insp-fields' }, [
          f('符号', 'sym', 'x / ω', (v) => updateSelected({ sym: v })),
          f('物理量', 'name', '质量 / 加速度'),
          f('单位', 'unit', 'kg / m·s⁻²'),
          f('量纲', 'dim', 'M L T^-2'),
          f('值域', 'domain', 'x > 0'),
        ]));
        body.push(h('div', { key: 'type', className: 'fb-insp-row' }, [
          h('span', { key: 'l' }, '数据形式'),
          h('select', {
            key: 's', className: 'fb-insp-input', value: node.type || 'scalar',
            onChange: (e) => updateSelected({ type: e.target.value }),
          }, [
            h('option', { key: 's', value: 'scalar' }, '标量（连续）'),
            h('option', { key: 'v', value: 'vector' }, '向量'),
            h('option', { key: 'm', value: 'matrix' }, '矩阵'),
            h('option', { key: 'r', value: 'random' }, '随机变量'),
            h('option', { key: 'f', value: 'function' }, '函数'),
            h('option', { key: 'd', value: 'discrete' }, '离散值'),
          ]),
        ]));
        body.push(h('div', { key: 'meaning', className: 'fb-insp-row' }, [
          h('span', { key: 'l' }, '含义'),
          h('input', {
            key: 'i', className: 'fb-insp-input', value: node.meaning || '',
            placeholder: '这个量在你的公式里代表什么', onChange: (e) => updateSelected({ meaning: e.target.value }),
          }),
        ]));
      } else {
        body.push(h('div', { key: 'copy', className: 'fb-insp-row' }, [
          h('span', { key: 'l' }, 'LaTeX'),
          h('code', { key: 'c', className: 'fb-insp-latex' }, toLatex(node)),
          h('button', { key: 'b', className: 'fb-toolbtn', onClick: () => copy('$' + toLatex(node) + '$') }, '复制'),
        ]));
      }
      return h('div', { className: 'fb-inspector' }, [
        h('div', { key: 'h', className: 'fb-insp-head' }, [
          h('span', { key: 't' }, title),
          node ? h('button', {
            key: 'del', className: 'fb-insp-del', onClick: onDelete,
            title: '删除此块（也可按 Delete / Backspace）',
          }, '🗑 删除此块') : null,
        ]),
        ...body,
      ]);
    }

    function ReviewModal({ project, checks, checkState, agentChecked, onClose, onApply, onMarkAgent, copy }) {
      const [fixDims, setFixDims] = useState(true);
      const [fixUnits, setFixUnits] = useState(true);
      const [consent, setConsent] = useState(false);
      const prompt = '请作为公式审核员，用 Python/SymPy 检查下面这些公式：\n'
        + project.rows.map((r, i) => (i + 1) + '. ' + r.name + '：' + toLatex(r.root)).join('\n')
        + '\n要求：1) 逐条判断语法/量纲/定义域/符号是否一致；2) 给出可复现的 Python 检查代码与运行结果；'
        + '3) 标注哪些公式理论可行、哪些需要修改；4) 不确定的标“待核验”，不要编造。';
      return h('div', { className: 'fb-modal', onClick: onClose }, h('div', {
        className: 'fb-modal-card', onClick: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'h', className: 'fb-modal-head' }, [
          h('div', { key: 't', className: 'fb-modal-title' }, '审核与优化建议'),
          h('button', { key: 'x', className: 'fb-iconbtn', onClick: onClose }, '✕'),
        ]),
        h('div', { key: 'b', className: 'fb-modal-body' }, [
          h('div', { key: 'sum', className: 'fb-set-note' }, '项目「' + project.name + '」：' + checks.rows.length + ' 行；'
            + (checks.errors ? ('量纲/结构问题 ' + checks.errors + ' 处；') : '')
            + (checks.pending ? ('未完成空位 ' + checks.pending + ' 个；') : '')
            + (checks.unknown ? ('未标注量纲 ' + checks.unknown + ' 个；') : '')
            + '状态：' + checks.reason
            + (checkState && checkState.backend ? ('；Python 后端：' + (checkState.backend.backend || 'unknown') + (checkState.backend.sympy ? '（SymPy 可用）' : '（未装 SymPy）')) : '')),
          h('div', { key: 'list', className: 'fb-review-list' }, checks.rows.map((r, i) => {
            const issues = [];
            if (r.empty) issues.push(r.empty + ' 个空位');
            r.info.issues.forEach((x) => issues.push(x));
            if (!r.empty && r.info.unknown.length) issues.push('未标注量纲：' + r.info.unknown.join('、'));
            const backend = checkState && Array.isArray(checkState.results) ? checkState.results.find((x) => x.id === r.row.id) : null;
            if (backend && backend.ok === false) issues.push('Python: ' + (backend.error || '未通过'));
            if (backend && backend.ok === true) issues.push('Python: 通过');
            return h('div', { key: r.row.id, className: 'fb-review-row' }, [
              h('span', { key: 'n', className: 'fb-review-name' }, (i + 1) + '. ' + r.row.name),
              h('span', { key: 's', className: 'fb-review-issue' }, issues.length ? issues.join('；') : '✓ 结构完整、量纲一致'),
            ]);
          })),
          h('div', { key: 'fix', className: 'fb-set-section' }, [
            h('div', { key: 't', className: 'fb-set-title' }, '安全修复（确定性，应用前请勾选同意）'),
            h('label', { key: 'd', className: 'fb-set-row' }, [
              h('input', { key: 'i', type: 'checkbox', checked: fixDims, onChange: (e) => setFixDims(e.target.checked) }),
              h('span', { key: 's' }, '为已知量纲的变量补全量纲（如 F、m、a）'),
            ]),
            h('label', { key: 'u', className: 'fb-set-row' }, [
              h('input', { key: 'i', type: 'checkbox', checked: fixUnits, onChange: (e) => setFixUnits(e.target.checked) }),
              h('span', { key: 's' }, '为常用变量补全单位'),
            ]),
            h('label', { key: 'c', className: 'fb-set-row' }, [
              h('input', { key: 'i', type: 'checkbox', checked: consent, onChange: (e) => setConsent(e.target.checked) }),
              h('span', { key: 's' }, '我同意将上述修复应用到项目（可撤销）'),
            ]),
            h('div', { key: 'btns', className: 'fb-set-btns' }, [
              h('button', {
                key: 'a', className: 'fb-toolbtn fb-primary', disabled: !consent,
                onClick: () => { onApply([fixDims ? 'dims' : '', fixUnits ? 'units' : ''].filter(Boolean)); },
              }, '应用安全修复'),
              h('button', { key: 'p', className: 'fb-toolbtn', onClick: () => copy(prompt) }, '复制 Agent 审核提示词'),
              h('button', { key: 'm', className: 'fb-toolbtn' + (agentChecked ? ' fb-primary' : ''), onClick: () => onMarkAgent(!agentChecked) }, agentChecked ? '✓ 已标记 Agent 复核' : '标记 Agent 已复核'),
            ]),
            h('div', { key: 'n', className: 'fb-set-note' }, '“优化/修改公式”需要你的同意：本插件只做确定性补全；语义级改写请把提示词发给 Agent，确认后再手动应用。'),
          ]),
        ]),
      ]));
    }

    function CategoryModal({ draft, onClose, onRename, onDelete }) {
      const [name, setName] = useState(draft.name || '');
      return h('div', { className: 'fb-modal', onClick: onClose }, h('div', {
        className: 'fb-modal-card', onClick: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'h', className: 'fb-modal-head' }, [
          h('div', { key: 't', className: 'fb-modal-title' }, '分类管理 · ' + draft.name),
          h('button', { key: 'x', className: 'fb-iconbtn', onClick: onClose }, '✕'),
        ]),
        h('div', { key: 'b', className: 'fb-modal-body' }, [
          h('div', { key: 'n', className: 'fb-set-note' }, '该分类共 ' + draft.count + ' 个整合块。重命名会同步更新分类；删除会移除整组。'),
          h('div', { key: 'f', className: 'fb-field' }, [
            h('label', { key: 'l' }, '分类名称'),
            h('input', { key: 'i', className: 'fb-insp-input', value: name, onChange: (e) => setName(e.target.value) }),
          ]),
          h('div', { key: 'u', className: 'fb-set-btns' }, [
            h('button', { key: 'ok', className: 'fb-toolbtn fb-primary', onClick: () => onRename(name) }, '保存重命名'),
            h('button', { key: 'del', className: 'fb-toolbtn', style: { color: '#f87171' }, onClick: onDelete }, '删除整组'),
            h('button', { key: 'cancel', className: 'fb-toolbtn', onClick: onClose }, '取消'),
          ]),
        ]),
      ]));
    }

    function EditBlockModal({ draft, onClose, onSave }) {
      const [name, setName] = useState(draft.name || '我的块');
      const [category, setCategory] = useState(draft.category || '我的公式');
      return h('div', { className: 'fb-modal', onClick: onClose }, h('div', {
        className: 'fb-modal-card', onClick: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'h', className: 'fb-modal-head' }, [
          h('div', { key: 't', className: 'fb-modal-title' }, '编辑整合块'),
          h('button', { key: 'x', className: 'fb-iconbtn', onClick: onClose }, '✕'),
        ]),
        h('div', { key: 'b', className: 'fb-modal-body' }, [
          h('div', { key: 'n', className: 'fb-field' }, [
            h('label', { key: 'l' }, '名称'),
            h('input', { key: 'i', className: 'fb-insp-input', value: name, onChange: (e) => setName(e.target.value) }),
          ]),
          h('div', { key: 'c', className: 'fb-field' }, [
            h('label', { key: 'l' }, '分类（改名/换组）'),
            h('input', { key: 'i', className: 'fb-insp-input', value: category, onChange: (e) => setCategory(e.target.value), placeholder: '我的公式 / 量子力学 / 常用结构' }),
          ]),
          h('div', { key: 'u', className: 'fb-set-btns' }, [
            h('button', { key: 'ok', className: 'fb-toolbtn fb-primary', onClick: () => onSave(name, category) }, '保存修改'),
            h('button', { key: 'cancel', className: 'fb-toolbtn', onClick: onClose }, '取消'),
          ]),
        ]),
      ]));
    }

    function SaveBlockModal({ draft, onClose, onSave }) {
      const [name, setName] = useState(draft.name || '我的块');
      const [category, setCategory] = useState(draft.category || '我的公式');
      return h('div', { className: 'fb-modal', onClick: onClose }, h('div', {
        className: 'fb-modal-card', onClick: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'h', className: 'fb-modal-head' }, [
          h('div', { key: 't', className: 'fb-modal-title' }, '存为我的整合块'),
          h('button', { key: 'x', className: 'fb-iconbtn', onClick: onClose }, '✕'),
        ]),
        h('div', { key: 'b', className: 'fb-modal-body' }, [
          h('div', { key: 'p', className: 'fb-set-note' }, '预览：' + toLatex(draft.root).slice(0, 120)),
          h('div', { key: 'n', className: 'fb-field' }, [
            h('label', { key: 'l' }, '名称'),
            h('input', { key: 'i', className: 'fb-insp-input', value: name, onChange: (e) => setName(e.target.value), placeholder: '例如：薛定谔方程左半' }),
          ]),
          h('div', { key: 'c', className: 'fb-field' }, [
            h('label', { key: 'l' }, '分类（可选，用于左侧分组）'),
            h('input', { key: 'i', className: 'fb-insp-input', value: category, onChange: (e) => setCategory(e.target.value), placeholder: '我的公式 / 量子力学 / 常用结构' }),
          ]),
          h('div', { key: 'u', className: 'fb-set-btns' }, [
            h('button', { key: 'ok', className: 'fb-toolbtn fb-primary', onClick: () => onSave(name, category) }, '保存到左侧'),
            h('button', { key: 'cancel', className: 'fb-toolbtn', onClick: onClose }, '取消'),
          ]),
        ]),
      ]));
    }

    function ImportMergeModal({ pending, currentCount, onClose, onMerge, onReplace }) {
      if (!pending) return null;
      const list = Array.isArray(pending.data && pending.data.projects) ? pending.data.projects : [];
      const names = list.slice(0, 6).map((p) => (p && p.name) || '未命名项目');
      return h('div', { className: 'fb-modal', onClick: onClose }, h('div', {
        className: 'fb-modal-card', onClick: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'h', className: 'fb-modal-head' }, [
          h('div', { key: 't', className: 'fb-modal-title' }, '导入项目'),
          h('button', { key: 'x', className: 'fb-iconbtn', onClick: onClose }, '✕'),
        ]),
        h('div', { key: 'b', className: 'fb-modal-body' }, [
          h('div', { key: 'n', className: 'fb-set-note' }, '文件「' + pending.fileName + '」包含 ' + list.length + ' 个项目；当前已有 ' + currentCount + ' 个。'),
          h('div', { key: 'l', className: 'fb-set-note' }, names.join('、') + (list.length > names.length ? ' …' : '')),
          h('div', { key: 'u', className: 'fb-set-btns' }, [
            h('button', { key: 'merge', className: 'fb-toolbtn fb-primary', onClick: onMerge }, '合并导入（保留现有）'),
            h('button', { key: 'replace', className: 'fb-toolbtn', onClick: onReplace }, '替换导入（清空现有）'),
            h('button', { key: 'cancel', className: 'fb-toolbtn', onClick: onClose }, '取消'),
          ]),
        ]),
      ]));
    }

    function HistoryModal({ entries, loading, onClose, onRestore }) {
      return h('div', { className: 'fb-modal', onClick: onClose }, h('div', {
        className: 'fb-modal-card', onClick: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'h', className: 'fb-modal-head' }, [
          h('div', { key: 't', className: 'fb-modal-title' }, '工作区历史版本'),
          h('button', { key: 'x', className: 'fb-iconbtn', onClick: onClose }, '✕'),
        ]),
        h('div', { key: 'b', className: 'fb-modal-body' }, [
          h('div', { key: 'n', className: 'fb-set-note' }, '每次“工作区保存/自动保存”都会追加一个版本（最多保留最近 50 个，来自当前工作区/回退目录）。恢复会替换当前内存中的项目。'),
          loading ? h('div', { key: 'l', className: 'fb-set-note' }, '读取中…') : null,
          !loading && !entries.length ? h('div', { key: 'e', className: 'fb-set-note' }, '还没有历史版本：先点“工作区保存”。') : null,
          h('div', { key: 'list', className: 'fb-review-list' }, (entries || []).map((e) => {
            const names = e.state && Array.isArray(e.state.projects) ? e.state.projects.map((p) => p.name).slice(0, 3).join('、') : '';
            return h('div', { key: e.id, className: 'fb-review-row' }, [
              h('span', { key: 'n', className: 'fb-review-name' }, String(e.savedAt || '').replace('T', ' ').slice(0, 19)),
              h('span', { key: 'i', className: 'fb-review-issue' }, names || '（无项目名）'),
              h('button', { key: 'r', className: 'fb-toolbtn', onClick: () => onRestore(e) }, '恢复'),
            ]);
          })),
        ]),
      ]));
    }

    /* ------------------------------------------------------------------ *
     * 13. the editor panel
     * ------------------------------------------------------------------ */
    const INTRO_ZH = '公式积木 Formula Blocks 是一个把数学公式当成积木来拼的可视化工作台：拖拽、键盘输入或粘贴截图都能生成可编辑的公式树；29 种积木、59 条经典公式、量纲检查与本地 Python/SymPy 验证、项目与版本管理、可复用的“我的整合块”，让写公式像搭乐高一样直观，又像专业计算环境一样可靠——适合物理、数学、工程与教学。';
    const INTRO_EN = 'Formula Blocks is a visual workspace where mathematics clicks together like LEGO: build equations by dragging blocks, typing, or importing a screenshot, then verify them with dimension checks and a local Python/SymPy backend. 29 block types, 59 curated formulas, projects with version history, and reusable custom blocks make formula writing intuitive and dependable — for physics, math, engineering, and teaching.';

    function TutorialModal({ onClose }) {
      const [lang, setLang] = useState('zh');
      const en = lang === 'en';
      const intro = en ? INTRO_EN : INTRO_ZH;
      const cards = en ? [
        ['🧱', 'Block tree', 'Drag blocks into dashed slots, or click to insert. Click to select, double-click to edit.'],
        ['🕸', 'Node graph', 'The same formula as a node graph; drag a node to move its subtree.'],
        ['⌨️', 'Keyboard', 'Type a full expression in the bottom bar, or just type on the canvas: letters become variables, digits numbers, + - * / = build structure.'],
        ['🗂', 'Projects', 'Many formula rows per project; auto-saved under .formula/, with import/export and version history.'],
        ['🧩', 'My blocks', 'Save a half-built formula into the left-top library; pin/collapse/reorder categories, then click or drag to reuse.'],
        ['📚', 'Library & scan', '59 curated formulas one click away; paste a screenshot and let the multimodal agent (or optional OCR) turn it into LaTeX.'],
        ['🚦', 'Checks', 'Red / yellow / green lamps: dimension checks plus local Python/SymPy validation; green means verified.'],
        ['🎮', 'Quests', 'Six classic-formula quests with XP; favorites and undo/redo work everywhere.'],
      ] : [
        ['🧱', '积木树', '拖左侧块到虚线空位，或点块插入；单击选中、双击改字。'],
        ['🕸', '节点图', '同一公式的节点视图；拖动节点可移动整棵子树。'],
        ['⌨️', '键盘输入', '底部键盘栏输入整式回车；画布上字母=变量、数字=数值、+ − * / = 自动成型。'],
        ['🗂', '项目与工作纸', '一个项目多行公式；自动保存到 .formula/，可导入导出、回看历史版本。'],
        ['🧩', '我的整合块', '把拼好的半成品存到左侧顶部；分类可置顶/折叠/拖动排序，点击或拖拽复用。'],
        ['📚', '公式库与识图', '59 条经典公式一键插入；截图粘贴到识图页，Agent 多模态识别或可选 OCR 转成 LaTeX。'],
        ['🚦', '检查与验证', '红黄绿状态灯：量纲检查 + 本机 Python/SymPy 自动验证，绿灯=通过。'],
        ['🎮', '关卡', '6 个经典公式关卡，拼对得 XP；收藏栏与撤销重做贯穿全程。'],
      ];
      const steps = en ? [
        'Open the panel with the 🧩 button (or Ctrl+Shift+F).',
        'Drag a block from the left into a dashed slot, or type directly.',
        'Select a variable/number to edit unit, dimension and meaning; double-click to rename.',
        'Watch the lamps: red = structural/dimension problem, yellow = unfinished or unverified, green = Python check passed.',
        'Click “★ Save as My Block” to reuse your work; projects are auto-saved under .formula/.',
      ] : [
        '点输入框左侧 🧩 打开面板（或 Ctrl+Shift+F）。',
        '从左侧拖一个块到虚线空位，或直接用键盘敲。',
        '选中变量/数字，在右侧改单位、量纲、含义；双击可改文字。',
        '看上方状态灯：红=结构/量纲问题，黄=未完成或待验证，绿=Python 检查通过。',
        '点“★ 存为我的块”复用成果；项目会自动保存到 .formula/。',
      ];
      const keys = en ? [
        ['Ctrl + Shift + F', 'open / close'],
        ['Ctrl + Z / Ctrl + Y', 'undo / redo'],
        ['Delete / Backspace', 'delete selected block (collapse)'],
        ['Double-click block', 'inline edit'],
        ['Enter in bottom bar', 'insert typed expression'],
        ['Drag with ⠿ handle', 'reorder / move custom blocks'],
      ] : [
        ['Ctrl + Shift + F', '打开/关闭面板'],
        ['Ctrl + Z / Ctrl + Y', '撤销/重做'],
        ['Delete / Backspace', '删除选中块（自动折叠合并）'],
        ['双击块', '就地编辑文字'],
        ['底部键盘栏 Enter', '插入整式'],
        ['按住 ⠿ 把手拖动', '调整/跨分类移动整合块'],
      ];
      return h('div', { className: 'fb-modal', onClick: onClose }, h('div', {
        className: 'fb-tutorial-card', onClick: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'h', className: 'fb-modal-head fb-tutorial-head' }, [
          h('div', { key: 't', className: 'fb-modal-title' }, '📖 ' + (en ? 'Formula Blocks · Quick Tutorial' : '公式积木 · 快速教程')),
          h('div', { key: 'seg', className: 'fb-seg' }, [
            h('button', { key: 'zh', className: lang === 'zh' ? 'fb-on' : '', onClick: () => setLang('zh') }, '中文'),
            h('button', { key: 'en', className: lang === 'en' ? 'fb-on' : '', onClick: () => setLang('en') }, 'English'),
          ]),
          h('button', { key: 'x', className: 'fb-iconbtn', onClick: onClose }, '✕'),
        ]),
        h('div', { key: 'b', className: 'fb-tutorial-body' }, [
          h('div', { key: 'intro', className: 'fb-tutorial-intro' }, intro),
          h('div', { key: 'grid', className: 'fb-tutorial-grid' }, cards.map(([icon, title, desc]) => h('div', {
            key: title, className: 'fb-tutorial-carditem',
          }, [
            h('div', { key: 'i', className: 'fb-tutorial-icon' }, icon),
            h('div', { key: 't', className: 'fb-tutorial-title' }, title),
            h('div', { key: 'd', className: 'fb-tutorial-desc' }, desc),
          ]))),
          h('div', { key: 'sh', className: 'fb-tutorial-sub' }, en ? 'First 5 minutes' : '五分钟上手'),
          h('ol', { key: 'steps', className: 'fb-tutorial-steps' }, steps.map((s, i) => h('li', { key: i }, s))),
          h('div', { key: 'kh', className: 'fb-tutorial-sub' }, en ? 'Shortcuts' : '快捷键速查'),
          h('div', { key: 'keys', className: 'fb-tutorial-keys' }, keys.map(([k, v]) => h('div', { key: k, className: 'fb-tutorial-keyrow' }, [
            h('code', { key: 'k' }, k), h('span', { key: 'v' }, v),
          ]))),
          h('div', { key: 'note', className: 'fb-set-note' }, en
            ? 'Local-first: projects live in your workspace .formula/ folder; Python/SymPy is optional and only runs locally; images are saved to a temp folder, never uploaded by the plugin.'
            : '本地优先：项目保存在你的工作区 .formula/ 目录；Python/SymPy 可选且只在本机运行；识图图片保存到临时目录，插件不会上传第三方。'),
        ]),
      ]));
    }

    function FormulaPanel() {
      const open = useOpen();
      const [projectState, setProjectState] = useState(loadProjectState);
      const projects = projectState.projects;
      const doc = findProject(projects, projectState.activeId);
      const activeRow = activeRowOf(doc) || doc.rows[0];
      const root = activeRow.root;
      const agentChecked = doc.rows.length > 0 && doc.rows.every((r) => r.agentReviewed);
      const [selectedId, setSelectedId] = useState(null);
      const [hoverId, setHoverId] = useState(null);
      const [view, setView] = useState('tree');
      const [tab, setTab] = useState('props');
      const [query, setQuery] = useState('');
      const [toast, setToast] = useState(null);
      const [xp, setXp] = useState(loadXp);
      const [done, setDone] = useState(loadDone);
      const [burst, setBurst] = useState(0);
      const [pos, setPos] = useState(() => {
        const saved = readLS(LS_POS, null);
        const w = Math.min(960, window.innerWidth - 24);
        const def = { x: Math.max(12, window.innerWidth - w - 24), y: 74, w, h: Math.min(660, window.innerHeight - 100) };
        return saved && typeof saved.x === 'number' ? { ...def, ...saved } : def;
      });
      const [dragging, setDragging] = useState(false);
      const [settings, setSettings] = useState(loadSettings);
      const [favorites, setFavorites] = useState(loadFavorites);
      const [zoom, setZoom] = useState(1);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [latexOpen, setLatexOpen] = useState(false);
      const [latexText, setLatexText] = useState('');
      const [latexError, setLatexError] = useState('');
      const [pyOpen, setPyOpen] = useState(false);
      const [pyText, setPyText] = useState('');
      const [pyError, setPyError] = useState('');
      const [reviewOpen, setReviewOpen] = useState(false);
      const [tutorialOpen, setTutorialOpen] = useState(false);
      const [latexPreviewOpen, setLatexPreviewOpen] = useState(false);
      const [mathLiveOpen, setMathLiveOpen] = useState(false);
      const [graphReset, setGraphReset] = useState(0);
      const [lastDrop, setLastDrop] = useState(null);
      const [drag, setDrag] = useState(null);
      const [jellyId, setJellyId] = useState(null);
      const jellyTimer = useRef(null);
      const [checkState, setCheckState] = useState({ status: 'idle', ok: null, message: '', results: [], backend: null });
      const [inlineEdit, setInlineEdit] = useState(null);
      const [wsStatus, setWsStatus] = useState({ state: 'idle', path: '', message: '' });
      const [pendingImport, setPendingImport] = useState(null);
      const [historyOpen, setHistoryOpen] = useState(false);
      const [historyItems, setHistoryItems] = useState([]);
      const [historyLoading, setHistoryLoading] = useState(false);
      const [keyText, setKeyText] = useState('');
      const [customBlocks, setCustomBlocks] = useState(loadCustomBlocks);
      const [pinnedCats, setPinnedCats] = useState(loadPins);
      const [collapsedCats, setCollapsedCats] = useState(loadCollapsedCats);
      const [blockDraft, setBlockDraft] = useState(null);
      const [editDraft, setEditDraft] = useState(null);
      const [catDraft, setCatDraft] = useState(null);
      const [reorderOver, setReorderOver] = useState(null);
      const lastKeyRef = useRef(0);
      const [backendInfo, setBackendInfo] = useState({ status: 'unknown', python: null, sympy: false, command: null });
      const [warnDismissed, setWarnDismissed] = useState(false);
      const dropTimer = useRef(null);
      const [manifestFileText, setManifestFileText] = useState('');
      const historyRef = useRef({ undo: [], redo: [] });
      const dragRef = useRef(null);
      const resizeRef = useRef(null);
      const importRef = useRef(null);
      const lastDragRef = useRef(0);
      const toastTimer = useRef(null);

      const selectedNode = useMemo(() => (selectedId ? findNode(root, selectedId) : null), [root, selectedId]);
      const latex = useMemo(() => toLatex(root), [root]);
      const placeholderCount = useMemo(() => countPlaceholders(root), [root]);
      const dimInfo = useMemo(() => inferDim(root), [root]);
      const projectChecks = useMemo(() => {
        const rows = doc.rows.map((r) => {
          const info = inferDim(r.root);
          const empty = countPlaceholders(r.root);
          return { row: r, info, empty };
        });
        const errors = rows.reduce((n, x) => n + x.info.issues.length, 0);
        const pending = rows.reduce((n, x) => n + x.empty, 0);
        const unknown = rows.reduce((n, x) => n + (x.empty ? 0 : x.info.unknown.length), 0);
        const allComplete = rows.length > 0 && rows.every((x) => x.empty === 0);
        const texCount = rows.reduce((n, x) => n + countTex(x.row.root), 0);
        const backendOk = checkState.status === 'done' && checkState.ok === true;
        const backendBad = checkState.status === 'done' && checkState.ok === false;
        const backendRunning = checkState.status === 'running';
        const lamp = errors ? 'red'
          : ((!allComplete || unknown > 0) ? 'yellow'
            : (texCount > 0 ? 'yellow' : ((backendOk || agentChecked) ? 'green' : 'yellow')));
        const reason = errors ? ('量纲/结构问题 ' + errors + ' 处')
          : (!allComplete ? ('还有 ' + pending + ' 个空位')
            : (unknown > 0 ? ('还有 ' + unknown + ' 个量纲待标注')
              : (texCount > 0 ? ('含 ' + texCount + ' 个 LaTeX 保真块，无法自动做 Python 验证')
                : (backendOk ? ('Python 后端检查通过' + (checkState.backend && checkState.backend.sympy ? '（SymPy）' : ''))
                  : (agentChecked ? '手动标记 Agent 已复核'
                    : (backendRunning ? 'Python 后端检测中…'
                      : (backendBad ? ('Python 检查未通过：' + (checkState.message || '见审核'))
                        : '待 Python 后端复核（本地检查通过）')))))));
        return { rows, errors, pending, unknown, allComplete, texCount, lamp, reason, backendOk, backendBad };
      }, [doc, agentChecked, checkState]);

      const showToast = useCallback((msg) => {
        setToast({ msg, id: Date.now() });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2400);
      }, []);

      const runBackendCheck = useCallback(async (targetProject) => {
        setCheckState({ status: 'running', ok: null, message: 'Python 后端检测中…', results: [], backend: null });
        try {
          const items = targetProject.rows.map((r) => ({ id: r.id, label: r.name, code: pythonSnippet(r.root, r.name) }));
          const res = await apiPost('check', { items });
          setCheckState({
            status: 'done', ok: !!res.ok, message: res.message || '',
            results: Array.isArray(res.results) ? res.results : [], backend: res,
          });
        } catch (e) {
          setCheckState({
            status: 'error', ok: null,
            message: '本地后端不可用：' + ((e && e.message) || e),
            results: [], backend: null,
          });
        }
      }, []);

      useEffect(() => {
        if (!projectChecks.allComplete || projectChecks.texCount > 0) {
          setCheckState((prev) => (prev.status === 'idle' ? prev : { status: 'idle', ok: null, message: '', results: [], backend: null }));
          return undefined;
        }
        const timer = setTimeout(() => { runBackendCheck(doc); }, 900);
        return () => clearTimeout(timer);
      }, [projectState, projectChecks.allComplete, runBackendCheck]);

      const refreshBackend = useCallback(async (force) => {
        try {
          const res = await apiGet('health' + (force ? '?force=1' : ''));
          setBackendInfo({
            status: 'ok',
            python: !!(res.python && res.python.available),
            sympy: !!(res.python && res.python.sympy),
            command: (res.python && res.python.command) || null,
            tools: res.tools || {},
          });
        } catch (e) {
          setBackendInfo({ status: 'error', python: false, sympy: false, command: null, error: String((e && e.message) || e), tools: {} });
        }
      }, []);
      useEffect(() => { refreshBackend(false); }, [refreshBackend]);

      useEffect(() => { try { writeLS(LS_PROJECTS, projectState); } catch (e) { /* ignore */ } }, [projectState]);
      useEffect(() => { writeLS(LS_XP, xp); }, [xp]);
      useEffect(() => { writeLS(LS_DONE, done); }, [done]);
      useEffect(() => { writeLS(LS_POS, pos); }, [pos]);
      useEffect(() => { writeLS(LS_SETTINGS, settings); }, [settings]);
      useEffect(() => { writeLS(LS_FAV, favorites); }, [favorites]);
      useEffect(() => { writeLS(LS_CUSTOM, customBlocks); }, [customBlocks]);
      useEffect(() => { writeLS(LS_PINS, pinnedCats); }, [pinnedCats]);
      useEffect(() => { writeLS(LS_COLLAPSED, collapsedCats); }, [collapsedCats]);
      useEffect(() => () => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        if (jellyTimer.current) clearTimeout(jellyTimer.current);
      }, []);

      const checkQuests = useCallback((nextRoot) => {
        const target = canonical(toLatex(nextRoot));
        const newly = QUESTS.filter((q) => !done[q.id] && target === canonical(toLatex(q.build())));
        if (!newly.length) return;
        const nextDone = { ...done };
        let gained = 0;
        newly.forEach((q) => { nextDone[q.id] = Date.now(); gained += q.xp; });
        setDone(nextDone);
        if (gained) setXp(xp + gained);
        setBurst((b) => b + 1);
        showToast('🎉 关卡完成：' + newly.map((q) => q.title).join('、') + ' +' + gained + ' XP');
      }, [done, xp, showToast]);

      const updateProject = useCallback((updater) => {
        setProjectState((prev) => {
          try {
            const current = findProject(prev.projects, prev.activeId);
            const next = updater(current);
            if (!next || !Array.isArray(next.rows) || !next.rows.length) return prev;
            return { ...prev, projects: prev.projects.map((p) => (p.id === next.id ? next : p)) };
          } catch (e) { return prev; }
        });
      }, []);

      const flashDrop = useCallback((id) => {
        setLastDrop(id);
        if (dropTimer.current) clearTimeout(dropTimer.current);
        dropTimer.current = setTimeout(() => setLastDrop(null), 520);
      }, []);

      const mutate = useCallback((fn, options) => {
        const row = activeRowOf(doc);
        if (!row) return;
        const prevRoot = row.root;
        let nextRoot;
        try { nextRoot = fn(prevRoot); } catch (e) { showToast('操作失败：' + ((e && e.message) || e)); return; }
        if (!isValidNode(nextRoot)) { showToast('操作被拒绝：结构无效'); return; }
        const hist = historyRef.current;
        hist.undo.push(cloneJSON(projectState));
        if (hist.undo.length > 100) hist.undo.shift();
        hist.redo.length = 0;
        updateProject((p) => withActiveRoot(p, () => nextRoot));
        if (options && options.selectFirstEmpty) setSelectedId(firstEmpty(nextRoot));
        flashDrop(nextRoot.id);
        setTimeout(() => checkQuests(nextRoot), 0);
      }, [doc, projectState, updateProject, checkQuests, flashDrop, showToast]);

      const buildAny = useCallback((itemId) => {
        if (typeof itemId === 'string' && itemId.indexOf('cb:') === 0) {
          const found = customBlocks.find((b) => b.id === itemId.slice(3));
          if (!found || !isValidNode(found.root)) return null;
          return reid(found.root);
        }
        return B[itemId] ? B[itemId]() : null;
      }, [customBlocks]);

      const insert = useCallback((itemId) => {
        const node = buildAny(itemId);
        if (!node) return;
        mutate((prevRoot) => {
          const sel = selectedId ? findNode(prevRoot, selectedId) : null;
          if (sel) return replaceNode(prevRoot, selectedId, node);
          const first = firstEmpty(prevRoot);
          if (first) return replaceNode(prevRoot, first, node);
          return node;
        }, { selectFirstEmpty: true });
      }, [mutate, selectedId, buildAny]);

      const openSaveBlock = useCallback(() => {
        const source = selectedId ? findNode(root, selectedId) : root;
        if (!source || (!selectedId && source.k === 'ph')) { showToast('先编辑一段公式或选中一个块，再存为整合块'); return; }
        const baseName = selectedId
          ? ((KIND_LABEL[source.k] || '块') + ' · ' + toLatex(source).replace(/[_^{}\\]/g, '').slice(0, 16))
          : (activeRow.name || '整条公式');
        setBlockDraft({
          root: cloneJSON(source),
          name: baseName.slice(0, 40),
          category: (customBlocks[0] && customBlocks[0].category) || '我的公式',
        });
      }, [selectedId, root, activeRow.name, customBlocks, showToast]);

      const commitSaveBlock = useCallback((name, category) => {
        if (!blockDraft) return;
        const block = {
          id: 'cb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name: String(name || '我的块').slice(0, 40),
          category: String(category || '我的公式').slice(0, 24),
          root: blockDraft.root,
          createdAt: Date.now(),
        };
        setCustomBlocks((prev) => [block, ...prev].slice(0, 80));
        setBlockDraft(null);
        showToast('已存入“我的整合块”：' + block.name);
      }, [blockDraft, showToast]);

      const deleteCustomBlock = useCallback((id) => {
        setCustomBlocks((prev) => prev.filter((b) => b.id !== id));
        showToast('已删除整合块');
      }, [showToast]);

      const togglePin = useCallback((key) => {
        setPinnedCats((prev) => (prev.indexOf(key) >= 0 ? prev.filter((k) => k !== key) : [key, ...prev].slice(0, 60)));
      }, []);

      const moveCustomBlock = useCallback((dragId, targetId, before) => {
        setCustomBlocks((prev) => {
          const from = prev.findIndex((b) => b.id === dragId);
          if (from < 0) return prev;
          const target = prev.find((b) => b.id === targetId);
          if (!target || targetId === dragId) return prev;
          const arr = prev.slice();
          const item = arr.splice(from, 1)[0];
          if (target.category && target.category !== item.category) item.category = target.category;
          const to = arr.findIndex((b) => b.id === targetId);
          if (to < 0) return prev;
          arr.splice(before ? to : to + 1, 0, item);
          return arr;
        });
      }, []);

      const moveCustomBlockToCategory = useCallback((dragId, category) => {
        setCustomBlocks((prev) => {
          const from = prev.findIndex((b) => b.id === dragId);
          if (from < 0 || !category) return prev;
          const arr = prev.slice();
          const item = arr.splice(from, 1)[0];
          item.category = category;
          arr.push(item);
          return arr;
        });
      }, []);

      const renameCategory = useCallback((oldName, newName) => {
        const to = String(newName || '').trim().slice(0, 24);
        if (!to || to === oldName) { setCatDraft(null); return; }
        setCustomBlocks((prev) => prev.map((b) => ((b.category || '我的公式') === oldName ? { ...b, category: to } : b)));
        setPinnedCats((prev) => prev.map((k) => (k === 'custom:' + oldName ? 'custom:' + to : k)));
        setCollapsedCats((prev) => prev.map((k) => (k === 'custom:' + oldName ? 'custom:' + to : k)));
        setCatDraft(null);
        showToast('分类已重命名：' + to);
      }, [showToast]);

      const deleteCategory = useCallback((name) => {
        setCustomBlocks((prev) => prev.filter((b) => (b.category || '我的公式') !== name));
        setPinnedCats((prev) => prev.filter((k) => k !== 'custom:' + name));
        setCollapsedCats((prev) => prev.filter((k) => k !== 'custom:' + name));
        setCatDraft(null);
        showToast('分类已删除');
      }, [showToast]);

      const startReorder = useCallback((block, ev) => {
        ev.stopPropagation();
        const startY = ev.clientY;
        let moved = false;
        let over = null;
        const move = (e2) => {
          if (Math.abs(e2.clientY - startY) > 4) moved = true;
          if (!moved) return;
          let holder = null;
          let el = null;
          try {
            el = document.elementFromPoint(e2.clientX, e2.clientY);
            holder = el && el.closest ? el.closest('[data-cb-id]') : null;
          } catch (e) { /* ignore */ }
          const catEl = el && el.closest ? el.closest('[data-cat]') : null;
          if (catEl) {
            over = { type: 'cat', category: catEl.getAttribute('data-cat') };
            setReorderOver(over);
            return;
          }
          if (holder && holder.getAttribute('data-cb-id') !== block.id) {
            const r = holder.getBoundingClientRect();
            over = { type: 'item', id: holder.getAttribute('data-cb-id'), before: e2.clientY < r.top + r.height / 2 };
            setReorderOver(over);
          } else { over = null; setReorderOver(null); }
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          setReorderOver(null);
          if (!moved || !over) return;
          if (over.type === 'cat') moveCustomBlockToCategory(block.id, over.category);
          else moveCustomBlock(block.id, over.id, over.before);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      }, [moveCustomBlock, moveCustomBlockToCategory]);

      const openEditBlock = useCallback((block) => {
        setEditDraft({ id: block.id, name: block.name, category: block.category });
      }, []);

      const commitEditBlock = useCallback((name, category) => {
        if (!editDraft) return;
        setCustomBlocks((prev) => prev.map((b) => (b.id === editDraft.id ? {
          ...b,
          name: String(name || b.name).slice(0, 40),
          category: String(category || b.category || '我的公式').slice(0, 24),
        } : b)));
        setEditDraft(null);
        showToast('已更新整合块');
      }, [editDraft, showToast]);

      const toggleCollapsed = useCallback((key) => {
        setCollapsedCats((prev) => (prev.indexOf(key) >= 0 ? prev.filter((k) => k !== key) : [...prev, key].slice(0, 60)));
      }, []);

      const toggleSectionPin = useCallback(() => {
        const cats = Array.from(new Set(customBlocks.map((b) => b.category || '我的公式')));
        const keys = cats.map((c) => 'custom:' + c);
        setPinnedCats((prev) => {
          const allPinned = keys.length > 0 && keys.every((k) => prev.indexOf(k) >= 0);
          if (allPinned) return prev.filter((k) => keys.indexOf(k) < 0);
          return Array.from(new Set(keys.concat(prev)));
        });
      }, [customBlocks]);

      const insertTree = useCallback((tree) => {
        const node = reid(tree);
        mutate((prevRoot) => {
          const sel = selectedId ? findNode(prevRoot, selectedId) : null;
          const treeIsEq = node.k === 'op' && node.op === '=';
          const rootIsEmptyEq = prevRoot.k === 'op' && prevRoot.op === '=' && countPlaceholders(prevRoot) >= 2;
          if (treeIsEq && rootIsEmptyEq) return node;
          if (sel) return replaceNode(prevRoot, selectedId, node);
          const first = firstEmpty(prevRoot);
          if (first) return replaceNode(prevRoot, first, node);
          return node;
        }, { selectFirstEmpty: true });
        showToast('已插入模板，可继续拖拽修改');
      }, [mutate, selectedId, showToast]);

      const flashJelly = useCallback((id) => {
        if (!id) return;
        setJellyId(id);
        if (jellyTimer.current) clearTimeout(jellyTimer.current);
        jellyTimer.current = setTimeout(() => setJellyId(null), 520);
      }, []);

      const appendContinuation = useCallback((itemId) => {
        const node = buildAny(itemId);
        if (!node) return;
        mutate((prevRoot) => {
          const first = firstEmpty(node);
          if (first) return replaceNode(node, first, prevRoot);
          return OP('×', prevRoot, node);
        }, { selectFirstEmpty: true });
      }, [mutate, buildAny]);

      const dropItem = useCallback((itemId, targetId, opts) => {
        if (targetId === '__append__') { appendContinuation(itemId); return; }
        const node = buildAny(itemId);
        if (!node) return;
        let jelly = null;
        mutate((prevRoot) => {
          const target = findNode(prevRoot, targetId);
          if (!target) return prevRoot;
          if (target.k === 'ph') return replaceNode(prevRoot, targetId, node);
          if (isAtomNode(target) && isAtomNode(node)) {
            const args = (opts && opts.side === 'left') ? [node, target] : [target, node];
            const seq = SEQ(args);
            jelly = seq.id;
            return replaceNode(prevRoot, targetId, seq);
          }
          if (target.k === 'seq') {
            const args = (opts && opts.side === 'left') ? [node, ...target.args] : [...target.args, node];
            jelly = target.id;
            return replaceNode(prevRoot, targetId, { ...target, args });
          }
          jelly = node.id;
          return replaceNode(prevRoot, targetId, node);
        }, { selectFirstEmpty: true });
        if (jelly) flashJelly(jelly);
      }, [mutate, appendContinuation, flashJelly, buildAny]);

      

      const startMagneticDrag = useCallback((itemId, item, ev) => {
        ev.preventDefault();
        const startX = ev.clientX;
        const startY = ev.clientY;
        let moved = false;
        let target = null;
        let targetSide = null;
        let snap = null;
        const findSlot = (x, y) => {
          const panel = document.querySelector('.fb-panel');
          if (!panel) return null;
          const slots = Array.from(panel.querySelectorAll('[data-slot-id]'));
          let best = null;
          let bestD = Infinity;
          slots.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width < 4 || r.height < 4) return;
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const d = Math.hypot(x - cx, y - cy);
            if (d < bestD) { bestD = d; best = { id: el.getAttribute('data-slot-id'), cx, cy }; }
          });
          return best && bestD <= 72 ? best : null;
        };
        const move = (e2) => {
          if (Math.abs(e2.clientX - startX) + Math.abs(e2.clientY - startY) > 4) moved = true;
          if (!moved) return;
          const nearest = findSlot(e2.clientX, e2.clientY);
          target = nearest ? nearest.id : null;
          targetSide = nearest ? (e2.clientX < nearest.cx ? 'left' : 'right') : null;
          const off = nearest ? 14 : 10;
          setDrag({ itemId, glyph: item.glyph, label: item.label, x: e2.clientX + off, y: e2.clientY + off, snap: !!nearest });
          setHoverId(nearest ? nearest.id : null);
        };
        const up = (e2) => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          setDrag(null);
          setHoverId(null);
          if (!moved) return;
          lastDragRef.current = Date.now();
          if (target) { dropItem(itemId, target, { side: targetSide }); return; }
          const panel = document.querySelector('.fb-panel');
          if (panel) {
            const r = panel.getBoundingClientRect();
            if (e2.clientX >= r.left && e2.clientX <= r.right && e2.clientY >= r.top && e2.clientY <= r.bottom) insert(itemId);
          }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      }, [dropItem, insert]);

      const updateSelected = useCallback((patch) => {
        if (!selectedId) return;
        updateProject((p) => withActiveRoot(p, (prevRoot) => {
          const target = findNode(prevRoot, selectedId);
          if (!target) return prevRoot;
          return replaceNode(prevRoot, selectedId, { ...target, ...patch });
        }));
      }, [selectedId, updateProject]);

      const startInlineEdit = useCallback((id, el) => {
        const node = findNode(root, id);
        if (!node) { showToast('请先点选当前公式行的块'); return; }
        const keyMap = { var: 'sym', const: 'sym', num: 'v', op: 'op', fn: 'name', call: 'name', sum: 'idx', int: 'variable', pd: 'x' };
        const key = keyMap[node.k];
        if (!key) { showToast('这个块没有文字可改；可在右侧属性/结构按钮里调整。'); return; }
        let rect = { left: 240, top: 200, width: 120, height: 30 };
        try { if (el && el.getBoundingClientRect) rect = el.getBoundingClientRect(); } catch (e) { /* keep default */ }
        setSelectedId(id);
        setInlineEdit({
          id, key, kind: node.k,
          value: String(node[key] === null || node[key] === undefined ? '' : node[key]),
          left: Math.max(8, rect.left - 2),
          top: Math.max(8, rect.top - 2),
          width: Math.max(64, Math.min(280, (rect.width || 80) + 26)),
        });
      }, [root, showToast]);

      const commitInline = useCallback((value, cancel) => {
        const edit = inlineEdit;
        setInlineEdit(null);
        if (!edit || cancel) return;
        const text = String(value === null || value === undefined ? '' : value).trim();
        if (!text) return;
        updateProject((p) => withActiveRoot(p, (prevRoot) => {
          const target = findNode(prevRoot, edit.id);
          if (!target) return prevRoot;
          return replaceNode(prevRoot, edit.id, { ...target, [edit.key]: text.slice(0, edit.kind === 'var' || edit.kind === 'const' ? 12 : 24) });
        }));
      }, [inlineEdit, updateProject]);

      const deleteSelected = useCallback(() => {
        if (!selectedId) return;
        let replacementId = null;
        mutate((prevRoot) => {
          const sel = findNode(prevRoot, selectedId);
          if (!sel) return prevRoot;
          const replacement = collapseDeleted(sel) || PH();
          replacementId = replacement.id;
          if (prevRoot.id === selectedId) return replacement;
          return replaceNode(prevRoot, selectedId, replacement);
        });
        setSelectedId(null);
        if (replacementId) flashJelly(replacementId);
      }, [mutate, selectedId, flashJelly]);

      const wrapSelected = useCallback((kind) => {
        if (!selectedId) return;
        mutate((prevRoot) => {
          const sel = findNode(prevRoot, selectedId);
          if (!sel) return prevRoot;
          let wrapper;
          if (kind === 'frac') wrapper = FRAC(sel, PH());
          else if (kind === 'sqrt') wrapper = SQRT(sel);
          else if (kind === 'sup') wrapper = SUP(sel, PH());
          else if (kind === 'sub') wrapper = SUB(sel, PH());
          else if (kind === 'paren') wrapper = PAREN(sel);
          else if (kind === 'neg') wrapper = NEG(sel);
          else return prevRoot;
          return prevRoot.id === selectedId ? wrapper : replaceNode(prevRoot, selectedId, wrapper);
        }, { selectFirstEmpty: true });
      }, [mutate, selectedId]);

      const undo = useCallback(() => {
        const hist = historyRef.current;
        if (!hist.undo.length) return;
        const prev = hist.undo.pop();
        hist.redo.push(cloneJSON(projectState));
        if (hist.redo.length > 100) hist.redo.shift();
        setProjectState(prev);
        setSelectedId(null);
        showToast('已撤销');
      }, [projectState, showToast]);

      const redo = useCallback(() => {
        const hist = historyRef.current;
        if (!hist.redo.length) return;
        const next = hist.redo.pop();
        hist.undo.push(cloneJSON(projectState));
        setProjectState(next);
        setSelectedId(null);
        showToast('已重做');
      }, [projectState, showToast]);

      const copy = useCallback(async (text) => {
        try {
          await navigator.clipboard.writeText(text);
          showToast('已复制到剪贴板');
        } catch (e) {
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); showToast('已复制到剪贴板'); } catch (e2) { showToast('复制失败，请手动选择'); }
          document.body.removeChild(ta);
        }
      }, [showToast]);

      const reset = useCallback(() => {
        mutate(() => OP('=', PH(), PH()));
        setSelectedId(null);
        showToast('已清空画布');
      }, [mutate, showToast]);

      /* ---- settings / zoom / favorites / import / export ---- */
      const updateSettings = useCallback((patch) => setSettings((prev) => ({ ...prev, ...patch })), []);
      const zoomBy = useCallback((dir) => {
        setZoom((z) => clamp(Number((z + dir * settings.zoomStep).toFixed(2)), 0.4, 2.5));
      }, [settings.zoomStep]);

      const canvasRef = useRef(null);
      useEffect(() => {
        const el = canvasRef.current;
        if (!el) return undefined;
        const onWheel = (e) => {
          if (!(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          setZoom((z) => clamp(Number((z + (e.deltaY < 0 ? settings.zoomStep : -settings.zoomStep)).toFixed(2)), 0.4, 2.5));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
      }, [open, settings.zoomStep]);

      const addFavorite = useCallback(() => {
        const item = {
          id: 'f' + Date.now(),
          name: (activeRow.name && activeRow.name !== '公式') ? activeRow.name : (latex ? latex.slice(0, 28) : '未命名公式'),
          latex,
          root: cloneJSON(root),
          at: Date.now(),
        };
        setFavorites((prev) => [item, ...prev].slice(0, 40));
        showToast('★ 已加入收藏夹');
      }, [activeRow.name, latex, root, showToast]);

      const loadFavorite = useCallback((fav) => {
        try {
          const parsed = reid(normalizeProject({ rows: [{ root: fav.root }] }).rows[0].root);
          mutate(() => parsed, { selectFirstEmpty: true });
          updateProject((p) => ({ ...p, rows: p.rows.map((r) => (r.id === p.activeId ? { ...r, name: fav.name || r.name } : r)) }));
          showToast('已载入收藏：' + (fav.name || '未命名'));
        } catch (e) { showToast('收藏数据损坏，无法载入'); }
      }, [mutate, updateProject, showToast]);

      const removeFavorite = useCallback((id) => {
        setFavorites((prev) => prev.filter((f) => f.id !== id));
      }, []);

      const exportData = useCallback(() => {
        const payload = {
          plugin: 'formula-blocks', version: 2, exportedAt: new Date().toISOString(),
          projects, activeId: projectState.activeId, favorites, customBlocks, pinnedCats, settings, done, xp,
        };
        try {
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'formula-blocks-' + String(doc.name || 'project').replace(/[\\/:*?"<>|]/g, '_') + '-' + new Date().toISOString().slice(0, 10) + '.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1500);
          showToast('已导出全部项目与设置');
        } catch (e) { showToast('导出失败：' + ((e && e.message) || e)); }
      }, [projects, projectState.activeId, favorites, customBlocks, pinnedCats, settings, done, xp, doc.name, showToast]);

      const importData = useCallback((file) => {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const data = JSON.parse(String(reader.result || '{}'));
              if (Array.isArray(data.projects) && data.projects.length) {
                setPendingImport({ data, fileName: file && file.name ? file.name : '导入文件' });
                return;
              }
              if (data.doc && data.doc.root && data.doc.root.k) {
                const p = normalizeProject({ name: data.doc.name, rows: [{ root: data.doc.root }] });
                if (p) setProjectState({ projects: [p], activeId: p.id });
              }
              if (Array.isArray(data.favorites)) setFavorites(data.favorites.filter((f) => f && f.root && isValidNode(f.root)));
              if (data.settings) setSettings(Object.assign({}, DEFAULT_SETTINGS, data.settings));
              if (data.done && typeof data.done === 'object') setDone(data.done);
              if (typeof data.xp === 'number' && isFinite(data.xp)) setXp(Math.max(0, data.xp));
              showToast('导入成功');
            } catch (e) { showToast('导入失败：JSON 格式或数据结构不对'); }
          };
          reader.onerror = () => showToast('读取文件失败');
          reader.readAsText(file);
        } catch (e) { showToast('导入失败：' + ((e && e.message) || e)); }
      }, [showToast]);

      const applyImport = useCallback((mode) => {
        const data = pendingImport && pendingImport.data;
        if (!data) return;
        const incoming = (data.projects || []).map(normalizeProject).filter(Boolean).slice(0, MAX_PROJECTS);
        if (!incoming.length) { showToast('导入文件没有有效项目'); setPendingImport(null); return; }
        let nextProjects;
        if (mode === 'replace') nextProjects = incoming;
        else {
          nextProjects = projects.slice();
          incoming.forEach((p) => {
            if (nextProjects.some((x) => x.id === p.id)) nextProjects.push({ ...p, id: safeId('p'), name: p.name + '（导入）' });
            else nextProjects.push(p);
          });
          nextProjects = nextProjects.slice(0, MAX_PROJECTS);
        }
        const activeId = nextProjects.some((p) => p.id === data.activeId) ? data.activeId : nextProjects[0].id;
        setProjectState({ projects: nextProjects, activeId });
        if (Array.isArray(data.favorites)) {
          setFavorites((prev) => {
            const map = new Map(prev.map((f) => [f.id, f]));
            data.favorites.forEach((f) => {
              if (f && f.root && isValidNode(f.root)) map.set(f.id || ('imp' + Math.random().toString(36).slice(2, 8)), f);
            });
            return Array.from(map.values()).slice(0, 80);
          });
        }
        if (data.settings) setSettings(Object.assign({}, DEFAULT_SETTINGS, data.settings));
        if (data.done && typeof data.done === 'object') setDone(data.done);
        if (typeof data.xp === 'number' && isFinite(data.xp)) setXp(Math.max(0, data.xp));
        if (Array.isArray(data.customBlocks)) {
          const valid = data.customBlocks.filter((b) => b && typeof b.id === 'string' && isValidNode(b.root));
          setCustomBlocks((prev) => {
            const map = new Map(prev.map((b) => [b.id, b]));
            valid.forEach((b) => map.set(b.id, {
              id: b.id,
              name: String(b.name || '我的块').slice(0, 40),
              category: String(b.category || '我的公式').slice(0, 24),
              root: b.root,
              createdAt: Number(b.createdAt) || Date.now(),
            }));
            return Array.from(map.values()).slice(0, 80);
          });
        }
        if (Array.isArray(data.pinnedCats)) setPinnedCats(data.pinnedCats.filter((x) => typeof x === 'string'));
        setPendingImport(null);
        setSelectedId(null);
        showToast(mode === 'merge' ? '已合并导入项目' : '已替换导入项目');
      }, [pendingImport, projects, showToast]);

      const openHistory = useCallback(async () => {
        setHistoryOpen(true);
        setHistoryLoading(true);
        setHistoryItems([]);
        try {
          const res = await apiGet('project/history?sessionId=' + encodeURIComponent(runtime.sessionId || ''));
          setHistoryItems(Array.isArray(res.entries) ? res.entries : []);
        } catch (e) {
          showToast('历史版本读取失败：' + ((e && e.message) || e));
        } finally { setHistoryLoading(false); }
      }, [showToast]);

      const restoreHistory = useCallback((entry) => {
        try {
          const state = entry && entry.state;
          const list = state && Array.isArray(state.projects) ? state.projects.map(normalizeProject).filter(Boolean) : [];
          if (!list.length) { showToast('这个历史版本没有有效项目'); return; }
          const activeId = list.some((p) => p.id === state.activeId) ? state.activeId : list[0].id;
          setProjectState({ projects: list, activeId });
          setSelectedId(null);
          setHistoryOpen(false);
          showToast('已恢复历史版本：' + (entry.savedAt || ''));
        } catch (e) { showToast('恢复失败：' + ((e && e.message) || e)); }
      }, [showToast]);

      const clearFavorites = useCallback(() => { setFavorites([]); showToast('收藏夹已清空'); }, [showToast]);
      const clearAll = useCallback(() => {
        if (!window.confirm('清空全部本地数据（所有项目、收藏、设置、关卡进度）？此操作不可恢复。')) return;
        const fresh = defaultProject();
        setProjectState({ projects: [fresh], activeId: fresh.id });
        try {
          writeLS(LS_PROJECTS, { projects: [fresh], activeId: fresh.id });
          writeLS(LS_FAV, []);
          writeLS(LS_SETTINGS, DEFAULT_SETTINGS);
          writeLS(LS_DONE, {});
          writeLS(LS_XP, 0);
        } catch (e) { /* ignore */ }
        setFavorites([]);
        setSettings(DEFAULT_SETTINGS);
        setDone({});
        setXp(0);
        setSelectedId(null);
        showToast('已清空本地数据');
      }, [showToast]);

      const saveWorkspace = useCallback(async (silent) => {
        try {
          setWsStatus({ state: 'saving', path: '', message: '' });
          const res = await apiPost('project/save', { sessionId: runtime.sessionId, state: projectState, favorites, customBlocks, pinnedCats });
          if (!res || !res.ok) throw new Error((res && res.message) || '保存失败');
          setWsStatus({ state: 'saved', path: res.path || '', message: '已写入工作区' });
          if (!silent) showToast('已保存到工作区：' + (res.path || ''));
        } catch (e) {
          setWsStatus({ state: 'error', path: '', message: String((e && e.message) || e) });
          if (!silent) showToast('保存到工作区失败：' + ((e && e.message) || e));
        }
      }, [projectState, favorites, customBlocks, pinnedCats, showToast]);

      const loadWorkspace = useCallback(async () => {
        try {
          const res = await apiGet('project/load?sessionId=' + encodeURIComponent(runtime.sessionId || ''));
          if (!res || !res.state || !Array.isArray(res.state.projects)) {
            showToast('工作区还没有保存过项目（先点“工作区保存”）');
            return;
          }
          const projects = res.state.projects.map(normalizeProject).filter(Boolean).slice(0, MAX_PROJECTS);
          if (!projects.length) { showToast('工作区文件结构无效'); return; }
          const activeId = projects.some((p) => p.id === res.state.activeId) ? res.state.activeId : projects[0].id;
          setProjectState({ projects, activeId });
          if (Array.isArray(res.favorites)) {
            setFavorites(res.favorites.filter((f) => f && f.root && isValidNode(f.root)));
          }
          if (Array.isArray(res.customBlocks)) {
            setCustomBlocks(res.customBlocks.filter((b) => b && typeof b.id === 'string' && isValidNode(b.root)));
          }
          if (Array.isArray(res.pinnedCats)) setPinnedCats(res.pinnedCats.filter((x) => typeof x === 'string'));
          setSelectedId(null);
          showToast('已从工作区载入：' + (res.path || ''));
        } catch (e) {
          showToast('从工作区载入失败：' + ((e && e.message) || e));
        }
      }, [showToast]);

      const wsFirstRef = useRef(true);
      useEffect(() => {
        if (wsFirstRef.current) { wsFirstRef.current = false; return undefined; }
        if (!runtime.sessionId) return undefined;
        const timer = setTimeout(() => { saveWorkspace(true); }, 1500);
        return () => clearTimeout(timer);
      }, [projectState, favorites, saveWorkspace]);

      const applyLatexImport = useCallback(() => {
        try {
          const parsed = parseLatexOrTex(latexText);
          setLatexError('');
          setLatexOpen(false);
          mutate(() => parsed, { selectFirstEmpty: true });
          showToast('已从 LaTeX 导入');
        } catch (e) {
          setLatexError(String((e && e.message) || e));
        }
      }, [latexText, mutate, showToast]);

      const openPyPreview = useCallback(() => {
        setPyText(pythonSnippet(root, doc.name));
        setPyError('');
        setPyOpen(true);
      }, [root, doc.name]);

      const applyPyImport = useCallback(() => {
        try {
          const parsed = parseMathInput(pyText, 'python');
          setPyError('');
          setPyOpen(false);
          mutate(() => parsed, { selectFirstEmpty: true });
          showToast('已从 Python 代码解析公式');
        } catch (e) {
          setPyError(String((e && e.message) || e));
        }
      }, [pyText, mutate, showToast]);

      const importLiterature = useCallback((cands) => {        const added = [];
        let failed = 0;
        cands.forEach((c, i) => {
          try {
            const parsed = parseLatexOrTex(c.latex);
            added.push({
              id: 'lit' + Date.now() + i,
              name: '文献公式 ' + (i + 1),
              latex: c.latex,
              root: cloneJSON(parsed),
              at: Date.now(),
            });
          } catch (e) { failed++; }
        });
        if (!added.length) { showToast('这些候选解析失败，可复制提示词交给 Agent 解析'); return; }
        setFavorites((prev) => [...added, ...prev].slice(0, 80));
        mutate(() => reid(added[0].root), { selectFirstEmpty: true });
        showToast('已导入 ' + added.length + ' 条到收藏夹' + (failed ? ('，' + failed + ' 条解析失败') : ''));
      }, [mutate, showToast]);

      const insertFromLibrary = useCallback((item) => {        try {
          const parsed = parseLatexOrTex(item.latex);
          mutate(() => parsed, { selectFirstEmpty: true });
          showToast('已插入：' + (item.title || item.id));
        } catch (e) {
          copy(item.latex || '');
          showToast('这条公式较复杂，已复制 LaTeX：可粘贴修改或交给 Agent 解析');
        }
      }, [mutate, copy, showToast]);

      const importImageLatex = useCallback((text) => {
        try {
          const parsed = parseLatexOrTex(String(text || ''));
          mutate(() => parsed, { selectFirstEmpty: true });
          showToast('已从识图 LaTeX 导入');
        } catch (e) {
          showToast('解析失败：' + ((e && e.message) || e));
        }
      }, [mutate, showToast]);

      const exportFormula = useCallback(async (format, rootNode) => {
        try {
          showToast('正在生成 ' + String(format).toUpperCase() + '…');
          const res = await apiPost('render', { latex: toLatex(rootNode || root), format, fontSize: 26 });
          if (!res || !res.ok) throw new Error((res && res.message) || '渲染失败');
          const a = document.createElement('a');
          a.href = 'data:' + res.mime + ';base64,' + res.data;
          a.download = 'formula-' + Date.now() + '.' + (format === 'jpeg' ? 'jpg' : format);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast('已导出 ' + String(format).toUpperCase());
        } catch (e) {
          showToast('导出失败：' + ((e && e.message) || e));
        }
      }, [root, showToast]);

      const insertMathLive = useCallback((text) => {
        const value = String(text || '').trim();
        if (!value) { showToast('MathLive 输入为空'); return; }
        try {
          const node = parseLatexOrTex(value);
          mutate(() => node, { selectFirstEmpty: true });
          setMathLiveOpen(false);
          showToast('已从 MathLive 插入');
        } catch (e) { showToast('插入失败：' + ((e && e.message) || e)); }
      }, [mutate, showToast]);

      /* ---- projects / rows / review ---- */
      const switchProject = useCallback((id) => {
        setProjectState((prev) => (prev.projects.some((p) => p.id === id) ? { ...prev, activeId: id } : prev));
        setSelectedId(null);
      }, []);

      const newProject = useCallback(() => {
        const p = defaultProject();
        setProjectState((prev) => ({ projects: [p, ...prev.projects].slice(0, MAX_PROJECTS), activeId: p.id }));
        setSelectedId(null);
        showToast('已新建项目：' + p.name);
      }, [showToast]);

      const renameProject = useCallback((name) => {
        updateProject((p) => ({ ...p, name: String(name || '').slice(0, 80) || '未命名项目', updatedAt: Date.now() }));
      }, [updateProject]);

      const deleteProject = useCallback(() => {
        if (projects.length <= 1) {
          if (window.confirm('至少保留一个项目。先新建项目？')) newProject();
          return;
        }
        if (!window.confirm('删除当前项目？项目内所有公式行都会删除。')) return;
        setProjectState((prev) => {
          if (prev.projects.length <= 1) return prev;
          const rest = prev.projects.filter((p) => p.id !== prev.activeId);
          return { projects: rest, activeId: rest[0].id };
        });
        setSelectedId(null);
      }, [projects.length, newProject, showToast]);

      const addRow = useCallback(() => {
        updateProject((p) => {
          if (p.rows.length >= MAX_ROWS) return p;
          const row = newRow('公式 ' + (p.rows.length + 1));
          return { ...p, rows: [...p.rows, row], activeId: row.id };
        });
        setSelectedId(null);
      }, [updateProject]);

      const duplicateRow = useCallback(() => {
        updateProject((p) => {
          const row = activeRowOf(p);
          if (!row || p.rows.length >= MAX_ROWS) return p;
          const copy = { id: safeId('r'), name: row.name + ' 副本', root: cloneJSON(row.root), checkedAt: null, agentReviewed: false, note: row.note };
          const idx = p.rows.findIndex((r) => r.id === row.id);
          const rows = p.rows.slice();
          rows.splice(idx + 1, 0, copy);
          return { ...p, rows, activeId: copy.id };
        });
        setSelectedId(null);
      }, [updateProject]);

      const deleteRow = useCallback(() => {
        if (doc.rows.length <= 1) {
          if (window.confirm('至少保留一行公式。先新建一行？')) addRow();
          return;
        }
        if (!window.confirm('删除当前公式行？')) return;
        updateProject((p) => {
          if (p.rows.length <= 1) return p;
          const rest = p.rows.filter((r) => r.id !== p.activeId);
          return { ...p, rows: rest, activeId: rest[0].id };
        });
        setSelectedId(null);
      }, [doc.rows.length, addRow, updateProject]);

      const selectRow = useCallback((id) => {
        updateProject((p) => (p.rows.some((r) => r.id === id) ? { ...p, activeId: id } : p));
        setSelectedId(null);
      }, [updateProject]);

      const renameRow = useCallback((id, name) => {
        updateProject((p) => ({ ...p, rows: p.rows.map((r) => (r.id === id ? { ...r, name: String(name || '').slice(0, 60) || '公式' } : r)) }));
      }, [updateProject]);

      const updateRowNote = useCallback((note) => {
        updateProject((p) => ({ ...p, rows: p.rows.map((r) => (r.id === p.activeId ? { ...r, note: String(note || '').slice(0, 2000) } : r)) }));
      }, [updateProject]);

      const applySafeFixes = useCallback((fixIds) => {
        const wantDims = fixIds.indexOf('dims') >= 0;
        const wantUnits = fixIds.indexOf('units') >= 0;
        if (!wantDims && !wantUnits) { showToast('先勾选要应用的修复项'); return; }
        let changed = 0;
        updateProject((p) => {
          const rows = p.rows.map((r) => {
            const nextRoot = mapTree(r.root, (node) => {
              const patch = {};
              if (wantDims && !node.dim) {
                const d = parseDim(SYM_DIM[node.sym]);
                if (d) { patch.dim = dimText(d); changed++; }
              }
              if (wantUnits && !node.unit && UNIT_BY_SYM[node.sym]) { patch.unit = UNIT_BY_SYM[node.sym]; changed++; }
              return Object.keys(patch).length ? patch : null;
            });
            return { ...r, root: nextRoot, checkedAt: Date.now() };
          });
          return { ...p, rows, updatedAt: Date.now() };
        });
        showToast(changed ? ('已应用 ' + changed + ' 处安全修复，请复核') : '没有可自动补全的项');
      }, [updateProject, showToast]);

      const markAgentChecked = useCallback((value) => {
        updateProject((p) => ({ ...p, rows: p.rows.map((r) => ({ ...r, agentReviewed: !!value })) }));
        showToast(value ? '已标记：Agent 已复核（绿灯）' : '已取消 Agent 复核标记');
      }, [updateProject, showToast]);

      const moveSubtree = useCallback((fromId, toId) => {
        if (!fromId || !toId || fromId === toId) return;
        mutate((prevRoot) => {
          const from = findNode(prevRoot, fromId);
          const to = findNode(prevRoot, toId);
          if (!from || !to) return prevRoot;
          if (findNode(from, toId)) return prevRoot;
          if (prevRoot.id === fromId) return prevRoot;
          const detached = replaceNode(prevRoot, fromId, PH());
          return replaceNode(detached, toId, from);
        });
      }, [mutate]);

      

      const applyKeyText = useCallback(() => {
        const text = String(keyText || '').trim();
        if (!text) return;
        try {
          const parsed = parseMathInput(text, 'python');
          mutate((prevRoot) => {
            const sel = selectedId ? findNode(prevRoot, selectedId) : null;
            if (sel) return replaceNode(prevRoot, selectedId, parsed);
            const first = firstEmpty(prevRoot);
            if (first) return replaceNode(prevRoot, first, parsed);
            return OP('×', prevRoot, parsed);
          }, { selectFirstEmpty: true });
          setKeyText('');
          showToast('已按键盘输入插入');
        } catch (e) {
          showToast('解析失败：' + ((e && e.message) || e) + '（支持 + - * / ^ ( ) 与字母数字）');
        }
      }, [keyText, selectedId, mutate, showToast]);

      const insertKeyChar = useCallback((ch) => {
        const isDigit = /[0-9.]/.test(ch);
        const isLetter = /^[A-Za-z\u0370-\u03ff\u0127]$/.test(ch);
        const sel = selectedId ? findNode(root, selectedId) : null;
        if (isDigit && sel && sel.k === 'num' && Date.now() - lastKeyRef.current < 1500) {
          updateSelected({ v: String(sel.v || '0') + ch });
          lastKeyRef.current = Date.now();
          return true;
        }
        const atom = isDigit ? NUM(ch) : (isLetter ? VAR(ch) : null);
        if (atom) {
          mutate((prevRoot) => {
            const s = selectedId ? findNode(prevRoot, selectedId) : null;
            if (s && s.k === 'ph') return replaceNode(prevRoot, selectedId, atom);
            if (s && (s.k === 'var' || s.k === 'num' || s.k === 'const')) return replaceNode(prevRoot, selectedId, OP('×', s, atom));
            const first = firstEmpty(prevRoot);
            if (first) return replaceNode(prevRoot, first, atom);
            return OP('×', prevRoot, atom);
          }, {});
          setSelectedId(atom.id);
          lastKeyRef.current = Date.now();
          return true;
        }
        const opChar = ch === '*' ? '×' : (ch === '/' ? '÷' : ch);
        if (['+', '-', '×', '÷', '='].indexOf(opChar) >= 0) {
          mutate((prevRoot) => {
            const s = selectedId ? findNode(prevRoot, selectedId) : null;
            if (s && s.k === 'ph') return replaceNode(prevRoot, selectedId, OP(opChar));
            const first = firstEmpty(prevRoot);
            if (first) return replaceNode(prevRoot, first, OP(opChar));
            return OP(opChar, prevRoot, PH());
          }, { selectFirstEmpty: true });
          return true;
        }
        if (ch === '^' || ch === '_') {
          mutate((prevRoot) => {
            const s = selectedId ? findNode(prevRoot, selectedId) : null;
            if (s) return replaceNode(prevRoot, s.id, ch === '^' ? SUP(s, PH()) : SUB(s, PH()));
            return ch === '^' ? SUP(prevRoot, PH()) : SUB(prevRoot, PH());
          }, { selectFirstEmpty: true });
          return true;
        }
        if (ch === '(' || ch === ')') {
          mutate((prevRoot) => {
            const s = selectedId ? findNode(prevRoot, selectedId) : null;
            if (s) return replaceNode(prevRoot, s.id, PAREN(s));
            return PAREN(prevRoot);
          }, { selectFirstEmpty: true });
          return true;
        }
        return false;
      }, [root, selectedId, mutate, updateSelected]);

      // panel dragging
      const onHeadPointerDown = (e) => {
        if (e.target && e.target.closest && e.target.closest('button')) return;
        dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
        setDragging(true);
        const move = (ev) => {
          const d = dragRef.current;
          if (!d) return;
          setPos((p) => ({
            ...p,
            x: clamp(d.ox + ev.clientX - d.sx, 4, window.innerWidth - 200),
            y: clamp(d.oy + ev.clientY - d.sy, 4, window.innerHeight - 80),
          }));
        };
        const up = () => {
          dragRef.current = null;
          setDragging(false);
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      };

      const onResizeDown = (dir) => (e) => {
        e.stopPropagation();
        e.preventDefault();
        const start = { sx: e.clientX, sy: e.clientY, x: pos.x, y: pos.y, w: pos.w, h: pos.h };
        const move = (ev) => {
          const dx = ev.clientX - start.sx;
          const dy = ev.clientY - start.sy;
          let x = start.x;
          let y = start.y;
          let w = start.w;
          let h = start.h;
          if (dir.indexOf('e') >= 0) w = start.w + dx;
          if (dir.indexOf('s') >= 0) h = start.h + dy;
          if (dir.indexOf('w') >= 0) { w = start.w - dx; x = start.x + dx; }
          if (dir.indexOf('n') >= 0) { h = start.h - dy; y = start.y + dy; }
          w = clamp(w, 720, window.innerWidth - 8);
          h = clamp(h, 480, window.innerHeight - 8);
          if (x + w > window.innerWidth - 4) x = window.innerWidth - w - 4;
          if (y + h > window.innerHeight - 4) y = window.innerHeight - h - 4;
          setPos({ x: Math.max(0, x), y: Math.max(0, y), w, h });
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      };

      // keyboard (only while open)
      useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
          const tag = (e.target && e.target.tagName) || '';
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey && String(e.key).toLowerCase() === 'z') { e.preventDefault(); undo(); }
          else if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'y') { e.preventDefault(); redo(); }
          else if (String(e.key) === 'Delete' || String(e.key) === 'Backspace') { if (selectedId) { e.preventDefault(); deleteSelected(); } }
          else if (String(e.key) === 'Escape') { setSelectedId(null); }
          else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(String(e.key)) >= 0) {
            e.preventDefault();
            const flat = [];
            (function walk(n) { if (!n) return; flat.push(n.id); childNodes(n).forEach(walk); })(root);
            if (!flat.length) return;
            const idx = flat.indexOf(selectedId);
            const dir = (String(e.key) === 'ArrowRight' || String(e.key) === 'ArrowDown') ? 1 : -1;
            const next = Math.max(0, Math.min(flat.length - 1, (idx < 0 ? 0 : idx) + dir));
            setSelectedId(flat[next]);
          }
          else if (!e.ctrlKey && !e.metaKey && !e.altKey && String(e.key).length === 1) {
            if (inlineEdit || settingsOpen || reviewOpen || latexOpen || pyOpen || pendingImport || historyOpen) return;
            if (insertKeyChar(String(e.key))) e.preventDefault();
          }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [open, undo, redo, selectedId, deleteSelected, insertKeyChar, inlineEdit, settingsOpen, reviewOpen, latexOpen, pyOpen, pendingImport, historyOpen, root]);

      if (!open) return null;

      const uiCtx = {
        selectedId, hoverId, lastDrop, jellyId, select: setSelectedId, setHover: setHoverId,
        dropItem,
      };
      const thumbUi = {
        selectedId: null, hoverId: null, lastDrop: null, jellyId: null, thumb: true,
        select() {}, setHover() {}, dropItem() {}, editNode: null,
      };
      const level = Math.floor(xp / 100) + 1;
      const xpInLevel = xp % 100;
      const filteredPalette = query
        ? PALETTE.map((g) => ({
          ...g,
          items: g.items.filter((it) => {
            const hay = (it.label + ' ' + it.id + ' ' + g.group).toLowerCase();
            return hay.indexOf(query.toLowerCase()) >= 0;
          }),
        })).filter((g) => g.items.length || g.group.toLowerCase().indexOf(query.toLowerCase()) >= 0)
        : PALETTE;
      const sortedPalette = sortByPinned(filteredPalette, pinnedCats, (g) => 'builtin:' + g.group);
      const customGroups = (() => {
        const map = new Map();
        customBlocks.forEach((b) => {
          const cat = b.category || '我的公式';
          if (!map.has(cat)) map.set(cat, []);
          map.get(cat).push(b);
        });
        let groups = Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
        if (query) {
          const q = query.toLowerCase();
          groups = groups
            .map((g) => ({
              cat: g.cat,
              items: g.items.filter((b) => {
                let latex = '';
                try { latex = toLatex(b.root); } catch (e) { latex = ''; }
                return (g.cat + ' ' + b.name + ' ' + latex).toLowerCase().indexOf(q) >= 0;
              }),
            }))
            .filter((g) => g.items.length || g.cat.toLowerCase().indexOf(q) >= 0);
        }
        return sortByPinned(groups, pinnedCats, (g) => 'custom:' + g.cat);
      })();

      return h('div', { className: 'fb-layer' }, h('div', {
        className: 'fb-panel',
        style: { left: pos.x, top: pos.y, width: pos.w, height: pos.h, '--fb-accent': settings.accent || '#4f8cff' },
        onPointerDown: (e) => e.stopPropagation(),
      }, [
        h('div', { key: 'head', className: 'fb-head' + (dragging ? ' fb-dragging' : ''), onPointerDown: onHeadPointerDown }, [
          h('div', { key: 't', className: 'fb-title' }, [h('span', { key: 'l', className: 'fb-logo' }, 'ƒ'), '公式积木']),
          h('div', { key: 's', className: 'fb-spacer' }),
          h('div', { key: 'xp', className: 'fb-xp', title: '经验值：拼出经典公式获得 XP' }, [
            'Lv.' + level,
            h('div', { key: 'b', className: 'fb-xpbar' }, h('div', { key: 'f', className: 'fb-xpfill', style: { width: xpInLevel + '%' } })),
            xp + ' XP',
          ]),
          h('div', { key: 'seg', className: 'fb-seg' }, [
            h('button', { key: 'tree', className: view === 'tree' ? 'fb-on' : '', onClick: () => setView('tree') }, '🧱 积木树'),
            h('button', { key: 'graph', className: view === 'graph' ? 'fb-on' : '', onClick: () => setView('graph') }, '🔗 节点图'),
          ]),
          h('button', {
            key: 'tutorial', className: 'fb-tutorial-btn' + (settings.seenTutorial ? '' : ' fb-pulse'),
            title: '新手教程：这个插件能做什么、怎么用',
            onClick: () => { setTutorialOpen(true); if (!settings.seenTutorial) updateSettings({ seenTutorial: true }); },
          }, '📖 教程'),
          h('button', { key: 'settings', className: 'fb-iconbtn', title: '设置与说明', onClick: () => setSettingsOpen(true) }, '⚙'),
          h('button', { key: 'close', className: 'fb-iconbtn', title: '关闭', onClick: () => setOpen(false) }, '✕'),
        ]),
        h('div', { key: 'body', className: 'fb-body' }, [
          h('div', { key: 'pal', className: 'fb-palette' }, [
            h('input', {
              key: 'search', className: 'fb-search', placeholder: '搜索块 / 自定义块名称或 LaTeX…', value: query,
              onChange: (e) => setQuery(e.target.value),
            }),
            h('div', { key: 'scroll', className: 'fb-pal-scroll' }, [
              h('div', { key: 'custom', className: 'fb-group' }, [
                h('div', { key: 'ct', className: 'fb-group-title fb-group-title-row', style: { color: '#fbbf24' } }, [
                  h('button', { key: 'c', className: 'fb-collapse', title: '折叠/展开我的整合块', onClick: () => toggleCollapsed('custom-section') }, collapsedCats.indexOf('custom-section') >= 0 ? '▸' : '▾'),
                  h('span', { key: 't', style: { flex: 1 } }, '我的整合块' + (customBlocks.length ? ' · ' + customBlocks.length : '')),
                  h('button', { key: 'p', className: 'fb-pin', title: '整组置顶/取消置顶所有自定义分类', onClick: (e) => { e.stopPropagation(); toggleSectionPin(); } }, '📌'),
                ]),
                collapsedCats.indexOf('custom-section') >= 0 ? null
                  : (customGroups.length === 0
                    ? h('div', { key: 'empty', className: 'fb-custom-empty' }, '选中块或整条公式 → 点上方“★ 存为我的块”')
                    : customGroups.map((g) => h('div', { key: 'cc-' + g.cat, className: 'fb-custom-cat' }, [
                      h('div', {
                        key: 'ch',
                        className: 'fb-group-title fb-group-title-row fb-cat-head'
                          + (reorderOver && reorderOver.type === 'cat' && reorderOver.category === g.cat ? ' fb-cat-drop' : ''),
                        style: { color: '#fbbf24' },
                        'data-cat': g.cat,
                      }, [
                        h('button', { key: 'c', className: 'fb-collapse', title: '折叠/展开分类', onClick: () => toggleCollapsed('custom:' + g.cat) }, collapsedCats.indexOf('custom:' + g.cat) >= 0 ? '▸' : '▾'),
                        h('span', { key: 't', style: { flex: 1 } }, g.cat + ' · ' + g.items.length),
                        h('button', {
                          key: 'r', className: 'fb-cat-btn', title: '重命名分类',
                          onClick: (e) => { e.stopPropagation(); setCatDraft({ name: g.cat, count: g.items.length }); },
                        }, '✎'),
                        h('button', {
                          key: 'd', className: 'fb-cat-btn fb-cat-del', title: '删除整组（含全部块）',
                          onClick: (e) => { e.stopPropagation(); setCatDraft({ name: g.cat, count: g.items.length, del: true }); },
                        }, '🗑'),
                        h('button', {
                          key: 'p',
                          className: 'fb-pin' + (pinnedCats.indexOf('custom:' + g.cat) >= 0 ? ' fb-pin-on' : ''),
                          title: pinnedCats.indexOf('custom:' + g.cat) >= 0 ? '取消置顶' : '置顶这个分类',
                          onClick: (e) => { e.stopPropagation(); togglePin('custom:' + g.cat); },
                        }, '📌'),
                      ]),
                      collapsedCats.indexOf('custom:' + g.cat) >= 0 ? null
                        : h('div', { key: 'g', className: 'fb-grid' }, g.items.map((b) => h('div', {
                          key: b.id,
                          className: 'fb-item fb-custom-item'
                            + (reorderOver && reorderOver.type === 'item' && reorderOver.id === b.id ? (reorderOver.before ? ' fb-reorder-before' : ' fb-reorder-after') : ''),
                          style: { '--fb-c': '#fbbf24' },
                          'data-cb-id': b.id,
                          onPointerDown: (e) => { if (e.button === 0 || e.button === undefined) startMagneticDrag('cb:' + b.id, { id: 'cb:' + b.id, label: b.name, glyph: '◈' }, e); },
                          onClick: () => { if (Date.now() - lastDragRef.current < 350) return; insert('cb:' + b.id); },
                          title: b.name + '（点击插入；按住拖到空位会磁吸）',
                        }, [
                          h('span', {
                            key: 'h', className: 'fb-item-handle', title: '拖动调整顺序',
                            onPointerDown: (e) => { e.stopPropagation(); startReorder(b, e); },
                            onClick: (e) => e.stopPropagation(),
                          }, '⠿'),
                          h('div', { key: 'g', className: 'fb-item-glyph fb-thumb' }, renderNode(b.root, thumbUi)),
                          h('div', { key: 'l', className: 'fb-item-label' }, b.name),
                          h('button', {
                            key: 'e', className: 'fb-item-edit', title: '改名/换分类',
                            onPointerDown: (e) => e.stopPropagation(),
                            onClick: (e) => { e.stopPropagation(); openEditBlock(b); },
                          }, '✎'),
                          h('button', {
                            key: 'x', className: 'fb-item-del', title: '删除这个整合块',
                            onPointerDown: (e) => e.stopPropagation(),
                            onClick: (e) => { e.stopPropagation(); deleteCustomBlock(b.id); },
                          }, '✕'),
                        ]))),
                    ]))),
              ]),
              ...sortedPalette.map((group) => h('div', { key: group.group, className: 'fb-group' }, [
                h('div', { key: 'gt', className: 'fb-group-title fb-group-title-row', style: { color: group.color } }, [
                  h('button', { key: 'c', className: 'fb-collapse', title: '折叠/展开分类', onClick: () => toggleCollapsed('builtin:' + group.group) }, collapsedCats.indexOf('builtin:' + group.group) >= 0 ? '▸' : '▾'),
                  h('span', { key: 't', style: { flex: 1 } }, group.group),
                  h('button', {
                    key: 'p',
                    className: 'fb-pin' + (pinnedCats.indexOf('builtin:' + group.group) >= 0 ? ' fb-pin-on' : ''),
                    title: pinnedCats.indexOf('builtin:' + group.group) >= 0 ? '取消置顶' : '置顶这个分类',
                    onClick: (e) => { e.stopPropagation(); togglePin('builtin:' + group.group); },
                  }, '📌'),
                ]),
                collapsedCats.indexOf('builtin:' + group.group) >= 0 ? null
                  : h('div', { key: 'g', className: 'fb-grid' }, group.items.map((item) => h('div', {
                    key: item.id,
                    className: 'fb-item',
                    style: { '--fb-c': group.color },
                    onPointerDown: (e) => { if (e.button === 0 || e.button === undefined) startMagneticDrag(item.id, item, e); },
                    onClick: () => { if (Date.now() - lastDragRef.current < 350) return; insert(item.id); },
                    title: item.label + '（点击插入；按住拖到空位会磁吸）',
                  }, [
                    h('div', { key: 'g', className: 'fb-item-glyph' }, item.glyph),
                    h('div', { key: 'l', className: 'fb-item-label' }, item.label),
                  ]))),
              ])),
            ]),
          ]),
          h('div', { key: 'center', className: 'fb-center' }, [
            h('div', { key: 'tb', className: 'fb-toolbar' }, [
              h('select', {
                key: 'proj', className: 'fb-projsel', value: doc.id, title: '切换项目',
                onChange: (e) => switchProject(e.target.value),
              }, projects.map((p) => h('option', { key: p.id, value: p.id }, p.name))),
              h('input', {
                key: 'pname', className: 'fb-projname', value: doc.name, title: '项目名称',
                onChange: (e) => renameProject(e.target.value),
              }),
              h('button', { key: 'newp', className: 'fb-toolbtn', onClick: newProject, title: '新建项目' }, '＋项目'),
              h('button', { key: 'impp', className: 'fb-toolbtn', onClick: () => importRef.current && importRef.current.click(), title: '导入项目 JSON' }, '导入'),
              h('button', { key: 'expp', className: 'fb-toolbtn', onClick: exportData, title: '导出全部项目 JSON' }, '导出'),
              h('button', { key: 'delp', className: 'fb-toolbtn', onClick: deleteProject, title: '删除当前项目（至少保留一个）', style: { color: '#f87171' } }, '删项目'),
              h('button', { key: 'wsload', className: 'fb-toolbtn', onClick: loadWorkspace, title: '从工作区 .formula/ 载入项目' }, '工作区载入'),
              h('button', { key: 'wssave', className: 'fb-toolbtn', onClick: () => saveWorkspace(false), title: '保存到工作区 .formula/' }, '工作区保存'),
              h('button', { key: 'hist', className: 'fb-toolbtn', onClick: openHistory, title: '查看/恢复工作区历史版本' }, '历史版本'),
              h('span', {
                key: 'wsstat', className: 'fb-hinttext',
                title: wsStatus.path || wsStatus.message || '',
              }, wsStatus.state === 'saved' ? '✓ 已同步' : (wsStatus.state === 'saving' ? '同步中…' : (wsStatus.state === 'error' ? '⚠ 未同步' : ''))),
              h('input', {
                key: 'impfile', ref: importRef, type: 'file', accept: '.json,application/json', style: { display: 'none' },
                onChange: (e) => { const f = e.target.files && e.target.files[0]; if (f) importData(f); e.target.value = ''; },
              }),
              h('button', { key: 'u', className: 'fb-toolbtn', onClick: undo, title: '撤销 Ctrl+Z' }, '↶ 撤销'),
              h('button', { key: 'r', className: 'fb-toolbtn', onClick: redo, title: '重做 Ctrl+Y' }, '↷ 重做'),
              h('button', { key: 'del', className: 'fb-toolbtn', onClick: deleteSelected, disabled: !selectedId, title: '删除选中块 Delete' }, '⌫ 删除'),
              h('button', { key: 'frac', className: 'fb-toolbtn', onClick: () => wrapSelected('frac'), disabled: !selectedId }, '包成 分式'),
              h('button', { key: 'sqrt', className: 'fb-toolbtn', onClick: () => wrapSelected('sqrt'), disabled: !selectedId }, '包成 根号'),
              h('button', { key: 'sup', className: 'fb-toolbtn', onClick: () => wrapSelected('sup'), disabled: !selectedId }, '加 幂'),
              h('button', { key: 'clr', className: 'fb-toolbtn', onClick: reset }, '清空'),
              h('button', { key: 'imp', className: 'fb-toolbtn', onClick: () => { setLatexText(''); setLatexError(''); setLatexOpen(true); }, title: '粘贴 LaTeX 并转成积木' }, '粘贴 LaTeX'),
              h('button', { key: 'py', className: 'fb-toolbtn', onClick: openPyPreview, title: '生成/导入 Python（SymPy）代码' }, 'Python'),
              h('div', { key: 'zoomctl', className: 'fb-zoomctl' }, [
                h('button', { key: 'm', onClick: () => zoomBy(-1), title: '缩小（Ctrl+滚轮）' }, '−'),
                h('span', { key: 'p' }, Math.round(zoom * 100) + '%'),
                h('button', { key: 'p2', onClick: () => zoomBy(1), title: '放大（Ctrl+滚轮）' }, '+'),
                h('button', { key: 'r', onClick: () => setZoom(1), title: '恢复 100%' }, '1:1'),
              ]),
              settings.showHints ? h('span', { key: 'hint', className: 'fb-hinttext' }, 'Ctrl + 滚轮缩放画布') : null,
              h('div', { key: 'sp', style: { flex: 1 } }),
              h('input', {
                key: 'rname', className: 'fb-search', style: { margin: 0, width: '140px' },
                value: activeRow.name, placeholder: '行名称',
                onChange: (e) => renameRow(activeRow.id, e.target.value),
                title: '当前公式行的名称',
              }),
              h('button', { key: 'copy', className: 'fb-toolbtn fb-primary', onClick: () => copy(latex) }, '复制 LaTeX'),
              h('button', { key: 'saveblock', className: 'fb-toolbtn', onClick: openSaveBlock, title: '把选中块或整条公式存为左侧“我的整合块”' }, '★ 存为我的块'),
              h('button', { key: 'mathlive', className: 'fb-toolbtn', onClick: () => setMathLiveOpen(true), title: '用 MathLive 所见即所得输入公式' }, 'MathLive 输入'),
              h('button', { key: 'katex', className: 'fb-toolbtn', onClick: () => setLatexPreviewOpen(true), title: '用 KaTeX 查看出版级排版预览' }, '排版预览'),
              view === 'graph' ? h('button', { key: 'layout', className: 'fb-toolbtn', onClick: () => setGraphReset((n) => n + 1), title: '恢复节点图的自动布局' }, '自动布局') : null,
            ]),
            h(StatusLamps, {
              key: 'status', checks: projectChecks, agentChecked,
              onReview: () => setReviewOpen(true),
              onMarkAgent: markAgentChecked,
            }),
            backendInfo.status !== 'unknown' && !warnDismissed && (!backendInfo.python || !backendInfo.sympy)
              ? h('div', { key: 'warnbar', className: 'fb-warnbar' }, [
                h('span', { key: 't', className: 'fb-warn-text' }, backendInfo.status === 'error'
                  ? ('后端不可用：' + (backendInfo.error || '无法连接本地 API') + '；其余功能仍可用。')
                  : (!backendInfo.python
                    ? '未检测到 Python：其余功能可用；安装 Python + SymPy 后自动绿灯。'
                    : '已检测到 Python，但缺少 SymPy：自动检查需要它（pip install sympy）。')),
                h('button', { key: 'r', className: 'fb-toolbtn', onClick: () => refreshBackend(true) }, '重新检测'),
                h('button', {
                  key: 'c', className: 'fb-toolbtn',
                  onClick: () => copy('winget install -e --id Python.Python.3.12\npython -m pip install sympy'),
                }, '复制安装命令'),
                h('button', { key: 'x', className: 'fb-iconbtn', onClick: () => setWarnDismissed(true) }, '✕'),
              ]) : null,
            h(RowStrip, {
              key: 'rowstrip', rows: doc.rows, activeId: doc.activeId,
              onSelect: selectRow, onAdd: addRow, onDup: duplicateRow, onDel: deleteRow,
            }),
            h('div', { key: 'cv', className: 'fb-canvas', ref: canvasRef }, [
              h('div', {
                key: 'zoombox', className: 'fb-zoomwrap',
                style: { zoom: zoom },
              }, [
                view === 'tree'
                  ? h('div', { key: 'sheet', className: 'fb-sheet' }, [
                    ...doc.rows.map((row, idx) => {
                      const active = row.id === doc.activeId;
                      const rowUi = {
                        selectedId: active ? selectedId : null,
                        hoverId: active ? hoverId : null,
                        lastDrop: active ? lastDrop : null,
                        jellyId: active ? jellyId : null,
                        select: (nid) => { if (!active) selectRow(row.id); setSelectedId(nid); },
                        setHover: setHoverId,
                        dropItem: (item, target) => { if (!active) selectRow(row.id); dropItem(item, target); },
                        editNode: active ? startInlineEdit : () => selectRow(row.id),
                      };
                      return h('div', {
                        key: row.id,
                        className: 'fb-sheet-row' + (active ? ' fb-sheet-active' : ''),
                        'data-row-id': row.id,
                        onClick: () => selectRow(row.id),
                      }, [
                        h('div', { key: 'n', className: 'fb-sheet-idx' }, idx + 1),
                        h('div', { key: 'f', className: 'fb-formula', style: { fontSize: (settings.mathSize || 27) * 0.82 + 'px' } }, renderNode(row.root, rowUi)),
                        active && countPlaceholders(row.root) === 0 ? h('div', {
                          key: 'cont', className: 'fb-cont', 'data-slot-id': '__append__',
                          title: '把左侧积木拖到这里继续拼装（追加为外层结构/乘法）',
                          onClick: (e) => {
                            e.stopPropagation();
                            showToast('把左侧积木拖到这里继续拼装（会作为外层结构或乘法追加）');
                          },
                        }, '＋ 继续拼装') : null,
                        h('div', { key: 'm', className: 'fb-sheet-name' }, row.name),
                      ]);
                    }),
                    h('button', { key: 'add', className: 'fb-sheet-add', onClick: (e) => { e.stopPropagation(); addRow(); } }, '＋ 添加一行公式'),
                  ])
                  : h(GraphView, { key: 'g', root, selectedId, onSelect: setSelectedId, onMoveNode: moveSubtree, resetKey: graphReset }),
              ]),
              h('div', { key: 'chips', className: 'fb-preview' }, [
                h('span', { key: 'c1', className: 'fb-chip' + (placeholderCount === 0 ? ' fb-ok' : ' fb-warn') }, placeholderCount === 0 ? '✓ 结构完整' : '○ 还有 ' + placeholderCount + ' 个空位'),
                h('span', { key: 'c2', className: 'fb-chip' }, '块数 ' + countNodes(root)),
                h('span', {
                  key: 'c3',
                  className: 'fb-chip' + (dimInfo.issues.length ? ' fb-warn' : (dimInfo.unknown.length ? '' : ' fb-ok')),
                  title: dimInfo.issues.length ? dimInfo.issues.join('\n') : (dimInfo.unknown.length ? '未标注量纲：' + dimInfo.unknown.join('、') : '量纲一致'),
                  style: { cursor: dimInfo.issues.length || dimInfo.unknown.length ? 'help' : 'default' },
                  onClick: () => {
                    if (dimInfo.issues.length) showToast('量纲：' + dimInfo.issues.map((x) => x.replace(/：/g, ':')).join('；'));
                    else if (dimInfo.unknown.length) showToast('未标注量纲：' + dimInfo.unknown.slice(0, 6).join('、') + (dimInfo.unknown.length > 6 ? '…' : ''));
                    else showToast('量纲检查通过：' + dimText(dimInfo.dim));
                  },
                }, dimInfo.issues.length ? '⚠ 量纲 ' + dimInfo.issues.length + ' 处' : (dimInfo.unknown.length ? '○ 量纲待标注 ' + dimInfo.unknown.length : '✓ 量纲一致')),
                settings.showHints ? h('span', { key: 'c4', className: 'fb-chip' }, view === 'tree' ? '拖块到空位 / 点左侧插入' : '点节点选中；拖动移动') : null,
              ]),
            ]),
            h('div', { key: 'keybar', className: 'fb-keybar' }, [
              h('span', { key: 'l', className: 'fb-keybar-label' }, '键盘'),
              h('input', {
                key: 'i', className: 'fb-keybar-input', value: keyText, spellCheck: false,
                placeholder: '直接键入公式（如 E = m*c^2），Enter 插入；也可在画布上直接按字母/数字键',
                onChange: (e) => setKeyText(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === 'Enter') { e.preventDefault(); applyKeyText(); }
                  e.stopPropagation();
                },
              }),
              h('button', { key: 'b', className: 'fb-toolbtn', onClick: applyKeyText }, '插入'),
              h('span', { key: 'h', className: 'fb-hinttext' }, '画布：字母=变量，数字=数值，+ - * / = ^ _ ( ) 自动成型'),
            ]),
            h(Inspector, {
              key: 'inspector', node: selectedNode, root, dimInfo, row: activeRow,
              updateSelected, updateRowNote, onRenameRow: renameRow, onDelete: deleteSelected, copy,
            }),            h('div', { key: 'lx', className: 'fb-latex' }, [
              h('code', { key: 'c' }, latex || '\\square'),
              h('button', { key: 'b', className: 'fb-toolbtn', onClick: () => copy('$$ ' + latex + ' $$') }, '复制 $$…$$'),
            ]),
            h(FavoritesBar, {
              key: 'fav', favorites, onAdd: addFavorite, onLoad: loadFavorite, onRemove: removeFavorite,
            }),
          ]),
          h('div', { key: 'props', className: 'fb-props' }, [
            h('div', { key: 'tabs', className: 'fb-tabs' }, [
              h('button', { key: 'p', className: 'fb-tab' + (tab === 'props' ? ' fb-on' : ''), onClick: () => setTab('props') }, '属性'),
              h('button', { key: 'q', className: 'fb-tab' + (tab === 'quests' ? ' fb-on' : ''), onClick: () => setTab('quests') }, '关卡 ' + Object.keys(done).length + '/' + QUESTS.length),
              h('button', { key: 'l', className: 'fb-tab' + (tab === 'literature' ? ' fb-on' : ''), onClick: () => setTab('literature') }, '文献'),
              h('button', { key: 'lib', className: 'fb-tab' + (tab === 'library' ? ' fb-on' : ''), onClick: () => setTab('library') }, '公式库'),
              h('button', { key: 'img', className: 'fb-tab' + (tab === 'image' ? ' fb-on' : ''), onClick: () => setTab('image') }, '识图'),
            ]),
            h('div', { key: 'ps', className: 'fb-prop-scroll' }, [
              tab === 'quests'
                ? h(QuestPanel, { key: 'q', done, xp, onInsert: (q) => insertTree(q.build()) })
                : (tab === 'literature'
                  ? h(LiteraturePanel, { key: 'l', copy, onImport: importLiterature, showToast })
                  : (tab === 'library'
                    ? h(LibraryPanel, { key: 'lib', onInsert: insertFromLibrary })
                    : (tab === 'image'
                      ? h(ImagePanel, { key: 'img', copy, onLatex: importImageLatex, showToast, settings })
                      : h(Properties, { key: 'p', node: selectedNode, doc, root, updateSelected, deleteSelected, wrapSelected, copy })))),
              h('div', { key: 'tpl', style: { marginTop: '12px' } }, [
                h('div', { key: 'h', className: 'fb-group-title' }, '模板（一键插入）'),
                ...TEMPLATES.map((t) => h('button', {
                  key: t.id, className: 'fb-toolbtn', style: { width: '100%', marginBottom: '6px', textAlign: 'left' },
                  onClick: () => insertTree(t.build()),
                }, t.label)),
              ]),
            ]),
          ]),
        ]),
        inlineEdit ? h(InlineEditor, {
          key: 'inline', edit: inlineEdit, onCommit: commitInline,
          onDelete: () => { setInlineEdit(null); deleteSelected(); },
        }) : null,
        drag ? h('div', {
          key: 'ghost',
          className: 'fb-ghost' + (drag.snap ? ' fb-ghost-snap' : ''),
          style: { left: drag.x + 'px', top: drag.y + 'px' },
        }, [
          h('span', { key: 'g', className: 'fb-ghost-glyph' }, drag.glyph || '＋'),
          h('span', { key: 'l', className: 'fb-ghost-label' }, (drag.label || '') + (drag.snap ? ' → 磁吸到空位' : '')),
        ]) : null,
        toast ? h('div', { key: 'toast', className: 'fb-toast' }, toast.msg) : null,
        burst ? h('div', { key: 'burst' + burst, className: 'fb-burst' },
          Array.from({ length: 14 }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / 14;
            const dist = 70 + (i % 5) * 18;
            return h('i', {
              key: i,
              style: {
                '--dx': Math.cos(angle) * dist + 'px',
                '--dy': Math.sin(angle) * dist + 'px',
                '--c': ['#8b5cf6', '#22d3ee', '#f472b6', '#fbbf24'][i % 4],
                animationDelay: (i % 4) * 40 + 'ms',
              },
            });
          })) : null,
        ...['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((dir) => h('div', {
          key: 'rz-' + dir, className: 'fb-rz fb-rz-' + dir, onPointerDown: onResizeDown(dir),
          title: '拖动边框调整窗口大小',
        })),
        latexOpen ? h('div', { key: 'latexmodal', className: 'fb-modal', onClick: () => setLatexOpen(false) }, h('div', {
          className: 'fb-modal-card', onClick: (e) => e.stopPropagation(),
        }, [
          h('div', { key: 'h', className: 'fb-modal-head' }, [
            h('div', { key: 't', className: 'fb-modal-title' }, '粘贴 LaTeX 导入'),
            h('button', { key: 'x', className: 'fb-iconbtn', onClick: () => setLatexOpen(false) }, '✕'),
          ]),
          h('div', { key: 'b', className: 'fb-modal-body' }, [
            h('div', { key: 'n', className: 'fb-set-note' }, '支持常见写法：\\frac{a}{b}、\\sqrt{x}、x^{2}、_{i}、\\cdot、\\pm、\\sin 等；解析结果会替换当前画布。'),
            h('textarea', {
              key: 'ta', className: 'fb-import-ta', value: latexText,
              placeholder: '例如：E = mc^2  或  \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
              onChange: (e) => { setLatexText(e.target.value); setLatexError(''); },
            }),
            latexError ? h('div', { key: 'err', className: 'fb-import-err' }, latexError) : null,
            h('div', { key: 'act', className: 'fb-set-btns' }, [
              h('button', { key: 'ok', className: 'fb-toolbtn fb-primary', onClick: applyLatexImport }, '解析并导入'),
              h('button', { key: 'c', className: 'fb-toolbtn', onClick: () => setLatexOpen(false) }, '取消'),
            ]),
          ]),
        ])) : null,
        pyOpen ? h('div', { key: 'pymodal', className: 'fb-modal', onClick: () => setPyOpen(false) }, h('div', {
          className: 'fb-modal-card', onClick: (e) => e.stopPropagation(),
        }, [
          h('div', { key: 'h', className: 'fb-modal-head' }, [
            h('div', { key: 't', className: 'fb-modal-title' }, 'Python（SymPy）预览 / 导入'),
            h('button', { key: 'x', className: 'fb-iconbtn', onClick: () => setPyOpen(false) }, '✕'),
          ]),
          h('div', { key: 'b', className: 'fb-modal-body' }, [
            h('div', { key: 'n', className: 'fb-set-note' }, '上面是由当前公式生成的 SymPy 代码，可编辑、复制；也可以粘贴自己的 Python 代码，解析成公式导回画布（解析失败会保留原文）。'),
            h('textarea', {
              key: 'ta', className: 'fb-import-ta', value: pyText,
              placeholder: '例如：E = m*c**2  或  F = m*a',
              onChange: (e) => { setPyText(e.target.value); setPyError(''); },
            }),
            pyError ? h('div', { key: 'err', className: 'fb-import-err' }, pyError) : null,
            h('div', { key: 'act', className: 'fb-set-btns' }, [
              h('button', { key: 'gen', className: 'fb-toolbtn', onClick: () => { setPyText(pythonSnippet(root, doc.name)); setPyError(''); } }, '重新生成代码'),
              h('button', { key: 'copy', className: 'fb-toolbtn', onClick: () => copy(pyText) }, '复制代码'),
              h('button', { key: 'imp', className: 'fb-toolbtn fb-primary', onClick: applyPyImport }, '从代码解析公式'),
              h('button', { key: 'ai', className: 'fb-toolbtn', onClick: () => copy('请解析下面这段 Python 代码，提取其中表达的公式（输出 LaTeX、变量含义与适用条件），并给出可验证的计算步骤：\n\n' + pyText) }, '复制“交给 Agent 解析”提示词'),
            ]),
          ]),
        ])) : null,
        reviewOpen ? h(ReviewModal, {
          key: 'review', project: doc, checks: projectChecks, checkState, agentChecked,
          onClose: () => setReviewOpen(false), onApply: applySafeFixes,
          onMarkAgent: markAgentChecked, copy,
        }) : null,
        blockDraft ? h(SaveBlockModal, {
          key: 'saveblock', draft: blockDraft,
          onClose: () => setBlockDraft(null),
          onSave: (name, category) => commitSaveBlock(name, category),
        }) : null,
        editDraft ? h(EditBlockModal, {
          key: 'editblock', draft: editDraft,
          onClose: () => setEditDraft(null),
          onSave: (name, category) => commitEditBlock(name, category),
        }) : null,
        catDraft ? h(CategoryModal, {
          key: 'catmodal', draft: catDraft,
          onClose: () => setCatDraft(null),
          onRename: (name) => renameCategory(catDraft.name, name),
          onDelete: () => {
            if (window.confirm('删除分类「' + catDraft.name + '」及其中 ' + catDraft.count + ' 个块？')) deleteCategory(catDraft.name);
          },
        }) : null,
        pendingImport ? h(ImportMergeModal, {
          key: 'importmerge', pending: pendingImport, currentCount: projects.length,
          onClose: () => setPendingImport(null),
          onMerge: () => applyImport('merge'),
          onReplace: () => applyImport('replace'),
        }) : null,
        historyOpen ? h(HistoryModal, {
          key: 'history', entries: historyItems, loading: historyLoading,
          onClose: () => setHistoryOpen(false), onRestore: restoreHistory,
        }) : null,
        tutorialOpen ? h(TutorialModal, { key: 'tutorial', onClose: () => setTutorialOpen(false) }) : null,
        latexPreviewOpen ? h(LatexPreviewModal, {
          key: 'latexpreview', project: doc, onClose: () => setLatexPreviewOpen(false), copy,
          onExport: exportFormula,
        }) : null,
        mathLiveOpen ? h(MathLiveModal, {
          key: 'mathlive', initialLatex: toLatex(root),
          onInsert: insertMathLive, onClose: () => setMathLiveOpen(false), copy,
        }) : null,
        settingsOpen ? h(SettingsPanel, {
          key: 'settings', settings, update: updateSettings, favorites,
          onClose: () => setSettingsOpen(false), copy,
          onExport: exportData, onImport: importData,
          onClearFav: clearFavorites, onClearAll: clearAll,
          latex, name: doc.name,
        }) : null,
      ]));
    }

    /* ------------------------------------------------------------------ *
     * 14. properties panel
     * ------------------------------------------------------------------ */
    function Field({ label, children }) {
      return h('div', { className: 'fb-field' }, [h('label', { key: 'l' }, label), children]);
    }

    function Properties({ node, doc, root, updateSelected, deleteSelected, wrapSelected, copy }) {
      if (!node) {
        return h('div', null, [
          h('div', { key: 'h', className: 'fb-hint' }, [
            h('div', { key: 'a', style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, '没有选中块'),
            h('div', { key: 'b' }, '点击画布中的块或空位查看/编辑属性；也可以拖左侧的块到空位。'),
          ]),
          h('div', { key: 'meta', className: 'fb-mini' }, '公式名称：' + (doc.name || '未命名')),
          h('div', { key: 'count', className: 'fb-mini' }, 'LaTeX 长度：' + toLatex(root).length + ' 字符'),
        ]);
      }
      const kind = KIND_LABEL[node.k] || node.k;
      const rows = [];
      rows.push(h('div', { key: 'kind', className: 'fb-kv' }, [h('span', { key: 'a' }, '块类型'), h('span', { key: 'b' }, kind)]));
      rows.push(h('div', { key: 'delrow', className: 'fb-delrow' }, [
        h('span', { key: 'hint', className: 'fb-mini' }, '已选中' + kind + '块'),
        h('button', {
          key: 'del', className: 'fb-delbtn', onClick: deleteSelected,
          title: '删除此块（也可按 Delete / Backspace）',
        }, '🗑 删除此块'),
      ]));

      if (node.k === 'var') {
        rows.push(h(Field, { key: 'sym', label: '符号（显示名，如 x、ω、m₁）' }, h('input', {
          value: node.sym, onChange: (e) => updateSelected({ sym: e.target.value }),
        })));
        rows.push(h(Field, { key: 'name', label: '物理量名称' }, h('input', {
          value: node.name || '', placeholder: '质量 / 速度 / 电场强度…', onChange: (e) => updateSelected({ name: e.target.value }),
        })));
        rows.push(h(Field, { key: 'unit', label: '单位（SI）' }, h('input', {
          value: node.unit || '', placeholder: 'kg / m·s⁻¹ / N', onChange: (e) => updateSelected({ unit: e.target.value }),
        })));
        rows.push(h(Field, { key: 'dim', label: '量纲（如 M L T^-2）' }, h('input', {
          value: node.dim || '', placeholder: 'M L T^-2', onChange: (e) => updateSelected({ dim: e.target.value }),
        })));
        rows.push(h(Field, { key: 'domain', label: '值域 / 定义域' }, h('input', {
          value: node.domain || '', placeholder: 'x > 0 / x ∈ ℝ', onChange: (e) => updateSelected({ domain: e.target.value }),
        })));
        rows.push(h(Field, { key: 'type', label: '数据形式' }, h('select', {
          value: node.type || 'scalar', onChange: (e) => updateSelected({ type: e.target.value }),
        }, [
          h('option', { key: 's', value: 'scalar' }, '标量（连续）'),
          h('option', { key: 'v', value: 'vector' }, '向量'),
          h('option', { key: 'm', value: 'matrix' }, '矩阵'),
          h('option', { key: 'r', value: 'random' }, '随机变量'),
          h('option', { key: 'f', value: 'function' }, '函数'),
          h('option', { key: 'd', value: 'discrete' }, '离散值'),
        ])));
        rows.push(h(Field, { key: 'value', label: '数值（可选，用于代入）' }, h('input', {
          value: node.value || '', placeholder: '1.0', onChange: (e) => updateSelected({ value: e.target.value }),
        })));
        rows.push(h(Field, { key: 'meaning', label: '物理含义 / 备注' }, h('textarea', {
          value: node.meaning || '', placeholder: '这个量在你的公式里代表什么？', onChange: (e) => updateSelected({ meaning: e.target.value }),
        })));
        rows.push(h('div', { key: 'unitpreview', className: 'fb-hint' }, '单位 + 量纲会在后续版本用于即时校验；现在先作为你的语义笔记保存。'));
      } else if (node.k === 'num') {
        rows.push(h(Field, { key: 'v', label: '数值' }, h('input', {
          value: node.v, onChange: (e) => updateSelected({ v: e.target.value }),
        })));
      } else if (node.k === 'const') {
        rows.push(h(Field, { key: 'sym', label: '符号' }, h('input', {
          value: node.sym, onChange: (e) => updateSelected({ sym: e.target.value }),
        })));
        rows.push(h(Field, { key: 'key', label: '内置常量（切换会替换数值/单位）' }, h('select', {
          value: node.key || '',
          onChange: (e) => {
            const k = e.target.value;
            const c = CONSTS[k];
            if (c) updateSelected({ key: k, sym: c.sym, name: c.name, value: c.value, unit: c.unit });
          },
        }, Object.keys(CONSTS).map((k) => h('option', { key: k, value: k }, k + ' · ' + CONSTS[k].name)))));
        rows.push(h('div', { key: 'val', className: 'fb-kv' }, [h('span', { key: 'a' }, '数值'), h('span', { key: 'b' }, node.value)]));
        rows.push(h('div', { key: 'unit', className: 'fb-kv' }, [h('span', { key: 'a' }, '单位/来源'), h('span', { key: 'b' }, node.unit || '—')]));
        rows.push(h('div', { key: 'note', className: 'fb-hint' }, '常量来自内置常量表（CODATA 2022 常用值）。'));
      } else if (node.k === 'fn' || node.k === 'call') {
        rows.push(h(Field, { key: 'name', label: node.k === 'fn' ? '函数名' : '被调用函数名' }, h('input', {
          value: node.name, onChange: (e) => updateSelected({ name: e.target.value }),
        })));
      } else if (node.k === 'sum') {
        rows.push(h(Field, { key: 'idx', label: '求和指标' }, h('input', {
          value: node.idx, onChange: (e) => updateSelected({ idx: e.target.value }),
        })));
      } else if (node.k === 'int') {
        rows.push(h(Field, { key: 'var', label: '积分变量' }, h('input', {
          value: node.variable, onChange: (e) => updateSelected({ variable: e.target.value }),
        })));
      } else if (node.k === 'pd') {
        rows.push(h(Field, { key: 'x', label: '偏导变量' }, h('input', {
          value: node.x, onChange: (e) => updateSelected({ x: e.target.value }),
        })));
      } else if (node.k === 'op') {
        const OPS = ['+', '-', '×', '÷', '=', '±', '≠', '≤', '≥'];
        rows.push(h(Field, { key: 'op', label: '算符' }, h('select', {
          value: node.op, onChange: (e) => updateSelected({ op: e.target.value }),
        }, OPS.map((o) => h('option', { key: o, value: o }, o)))));
      }

      rows.push(h('div', { key: 'acts', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' } }, [
        h('button', { key: 'frac', className: 'fb-toolbtn', onClick: () => wrapSelected('frac') }, '包成分式'),
        h('button', { key: 'sqrt', className: 'fb-toolbtn', onClick: () => wrapSelected('sqrt') }, '包成根号'),
        h('button', { key: 'sup', className: 'fb-toolbtn', onClick: () => wrapSelected('sup') }, '加幂'),
        h('button', { key: 'sub', className: 'fb-toolbtn', onClick: () => wrapSelected('sub') }, '加下标'),
        h('button', { key: 'paren', className: 'fb-toolbtn', onClick: () => wrapSelected('paren') }, '加括号'),
        h('button', { key: 'neg', className: 'fb-toolbtn', onClick: () => wrapSelected('neg') }, '取负'),
      ]));
      rows.push(h('div', { key: 'acts2', style: { display: 'flex', gap: '6px', marginTop: '8px' } }, [
        h('button', { key: 'copy', className: 'fb-toolbtn', onClick: () => copy('$' + toLatex(node) + '$') }, '复制本块 LaTeX'),
      ]));
      return h('div', null, rows);
    }

    /* ------------------------------------------------------------------ *
     * 15. overlay / launch buttons
     * ------------------------------------------------------------------ */
    function FormulaOverlay() {
      return h(React.Fragment, null,
        h('style', { key: 'fb-css' }, CSS),
        h(PluginErrorBoundary, { key: 'guard' }, h(FormulaPanel, { key: 'fb-panel' })),
      );
    }

    class PluginErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { err: null };
      }
      static getDerivedStateFromError(err) { return { err }; }
      componentDidCatch(err, info) {
        try { console.error('[formula-blocks] render failed', err, info); } catch (e) { /* ignore */ }
      }
      render() {
        if (this.state.err) {
          return h('div', { className: 'fb-crash' }, '公式积木遇到错误：'
            + ((this.state.err && this.state.err.message) || String(this.state.err))
            + '。数据仍在本地，刷新页面即可恢复；如反复出现请把这条信息发给我。');
        }
        return this.props.children;
      }
    }

    function LauncherButton(props) {
      const open = useOpen();
      const sid = props && props.sessionId;
      useEffect(() => { if (sid) runtime.sessionId = sid; }, [sid]);
      return h('button', {
        className: 'fb-launch',
        title: '公式积木（Ctrl+Shift+F）',
        onClick: () => setOpen(!open),
        style: { display: 'inline-flex' },
      }, '🧩');
    }

    /* ------------------------------------------------------------------ *
     * 16. plugin entry
     * ------------------------------------------------------------------ */
    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay', id: 'formula-blocks-panel', order: 60,
        }, FormulaOverlay));
        ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
          name: 'conversation.input.left', id: 'formula-blocks-launcher', order: 30,
        }, LauncherButton));

        try {
          ctx.effect(() => {
            const onKey = (e) => {
              if ((e.ctrlKey || e.metaKey) && e.shiftKey && String(e.key).toLowerCase() === 'f') {
                e.preventDefault();
                setOpen(!ui.open);
              }
            };
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
          });
        } catch (e) { /* no effect service */ }
      },
    };
  },
});
