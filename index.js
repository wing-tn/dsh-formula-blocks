/**
 * Host half of the formula-blocks bundle.
 *
 * 1) Human command: /toolcheck — scan common research/writing tools.
 * 2) Local HTTP API for the Client half (same-origin, loopback Web GUI):
 *      GET  /formula-blocks/api/health   → { ok, python, sympy, tools }
 *      POST /formula-blocks/api/check    → run generated Python through a local
 *                                          interpreter and report feasibility
 *      GET  /formula-blocks/api/library  → seed formula library (JSON)
 *
 * The API only listens on the existing local web server (loopback) and requires
 * the custom header x-formula-blocks: 1, so a random web page cannot call it
 * without a CORS preflight. It never installs anything.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const COMMON = {
  python: [
    'python.exe', 'python3.exe', 'py.exe',
    'C:\\Python313\\python.exe', 'C:\\Python312\\python.exe',
    '%LOCALAPPDATA%\\Programs\\Python\\Python313\\python.exe',
    '%LOCALAPPDATA%\\Programs\\Python\\Python312\\python.exe',
  ],
  vscode: [
    'code.cmd', 'code.exe',
    '%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe',
    'C:\\Program Files\\Microsoft VS Code\\Code.exe',
  ],
  matlab: ['matlab.exe', 'C:\\Program Files\\MATLAB\\R2026b\\bin\\matlab.exe'],
  comsol: ['comsol.exe', 'C:\\Program Files\\COMSOL\\COMSOL62\\bin\\win64\\comsol.exe'],
  latex: ['pdflatex.exe', 'xelatex.exe', 'lualatex.exe', 'C:\\texlive\\2026\\bin\\windows\\pdflatex.exe'],
  office: ['WINWORD.EXE', 'POWERPNT.EXE', 'EXCEL.EXE'],
  wps: ['wps.exe', 'wpp.exe', '%LOCALAPPDATA%\\Kingsoft\\WPS Office\\ksolaunch.exe'],
};

const LABELS = {
  python: 'Python', vscode: 'VS Code / Visual Studio', matlab: 'MATLAB',
  comsol: 'COMSOL Multiphysics', latex: 'LaTeX（TeX Live / MiKTeX）',
  office: 'Microsoft Office', wps: 'WPS Office',
};

function expandPath(p) {
  if (!p) return p;
  return p.replace(/%([^%]+)%/g, (_, name) => process.env[name] || '');
}

function scanTools() {
  const dirs = String(process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const found = {};
  for (const [tool, names] of Object.entries(COMMON)) {
    for (const raw of names) {
      const candidate = expandPath(raw);
      let ok = false;
      try {
        if (candidate.includes('\\') || candidate.includes('/')) ok = fs.existsSync(candidate);
        else {
          for (const dir of dirs) {
            if (fs.existsSync(path.join(dir, candidate))) { ok = true; break; }
          }
        }
      } catch (e) { ok = false; }
      if (ok) {
        if (!found[tool]) found[tool] = [];
        if (found[tool].length < 2) found[tool].push(candidate);
      }
    }
  }
  return found;
}

function toolcheckText() {
  const found = scanTools();
  const lines = ['本机科研/写作工具检测结果（只检查 PATH 与常见安装目录，不运行程序）：', ''];
  for (const [tool, label] of Object.entries(LABELS)) {
    const hits = found[tool];
    lines.push(hits && hits.length ? ('- ✅ ' + label + '：' + hits.join('；')) : ('- ❌ ' + label + '：未检测到'));
  }
  lines.push('', '说明：未检测到不等于没装（可能装在非默认目录）。检测后可让 Agent 帮你搭建项目或写论文。');
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * Python feasibility check
 * ------------------------------------------------------------------ */
const PY_CHECK_SCRIPT = [
  'import sys, json',
  'payload = json.load(sys.stdin)',
  'items = payload.get("items") or []',
  'has_sympy = False',
  'try:',
  '    import sympy  # noqa: F401',
  '    has_sympy = True',
  'except Exception:',
  '    has_sympy = False',
  'results = []',
  'for item in items:',
  '    code = str(item.get("code") or "")',
  '    label = str(item.get("label") or item.get("id") or "")',
  '    try:',
  '        compile(code, "<formula:" + label + ">", "exec")',
  '        if has_sympy:',
  '            ns = {}',
  '            exec(compile(code, "<formula:" + label + ">", "exec"), ns)',
  '            if "expr" not in ns:',
  '                raise ValueError("code produced no expr")',
  '        results.append({"id": item.get("id"), "label": label, "ok": True, "error": None})',
  '    except Exception as exc:',
  '        results.append({"id": item.get("id"), "label": label, "ok": False, "error": str(exc)[:400]})',
  'ok = bool(results) and all(r["ok"] for r in results)',
  'print(json.dumps({"ok": ok, "sympy": has_sympy, "results": results}, ensure_ascii=False))',
].join('\n');

function runPython(args, stdin, timeoutMs) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(args[0], args.slice(1), { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ ok: false, error: 'spawn_failed: ' + String(e && e.message ? e.message : e) });
      return;
    }
    let out = '';
    let err = '';
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch (e) { /* ignore */ }
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, error: 'timeout', stdout: out, stderr: err }), timeoutMs || 20000);
    child.stdout.on('data', (d) => { out += String(d); if (out.length > 2_000_000) out = out.slice(-2_000_000); });
    child.stderr.on('data', (d) => { err += String(d); if (err.length > 200_000) err = err.slice(-200_000); });
    child.on('error', (e) => { clearTimeout(timer); finish({ ok: false, error: 'spawn_error: ' + String(e && e.message ? e.message : e) }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      finish({ ok: code === 0, code, stdout: out, stderr: err });
    });
    try {
      if (stdin) child.stdin.write(stdin);
      child.stdin.end();
    } catch (e) { /* handled by close/error */ }
  });
}

let pythonCache; // { command: string[] | null, sympy: boolean, checkedAt: number }

function discoverPythonPaths() {
  const out = [];
  const roots = [];
  if (process.env.LOCALAPPDATA) roots.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'Python'));
  if (process.env.ProgramFiles) roots.push(process.env.ProgramFiles);
  if (process.env['ProgramFiles(x86)']) roots.push(process.env['ProgramFiles(x86)']);
  for (const root of roots) {
    try {
      for (const name of fs.readdirSync(root)) {
        if (!/^Python\d+/i.test(name)) continue;
        const exe = path.join(root, name, 'python.exe');
        try { if (fs.existsSync(exe)) out.push(exe); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore missing roots */ }
  }
  return out;
}

async function detectPython(force) {
  if (!force && pythonCache && Date.now() - pythonCache.checkedAt < 15000) return pythonCache;
  const candidates = discoverPythonPaths().map((exe) => [exe]);
  candidates.push(['py', '-3'], ['python'], ['python3']);
  for (const base of candidates) {
    const probe = await runPython(base.concat(['-c', 'import sys,json;print(json.dumps({"ok":True,"v":sys.version.split()[0]}))']), '', 8000);
    if (probe.ok && String(probe.stdout || '').indexOf('"ok": true') >= 0) {
      const sym = await runPython(base.concat(['-c', 'import importlib.util as u;print("1" if u.find_spec("sympy") else "0")']), '', 8000);
      const sympy = sym.ok && String(sym.stdout || '').trim() === '1';
      pythonCache = { command: base, sympy, checkedAt: Date.now() };
      return pythonCache;
    }
  }
  pythonCache = { command: null, sympy: false, checkedAt: Date.now() };
  return pythonCache;
}

async function checkFormulas(items) {
  const py = await detectPython(false);
  if (!py.command) {
    return {
      ok: false, backend: 'unavailable', sympy: false,
      message: '未检测到可用的 Python。请安装 Python 并在设置页按引导配置；也可以把公式交给 Agent 复核。',
      results: [],
    };
  }
  const payload = JSON.stringify({ items });
  const run = await runPython(py.command.concat(['-c', PY_CHECK_SCRIPT]), payload, 30000);
  if (!run.ok || !run.stdout) {
    return {
      ok: false, backend: 'python', sympy: py.sympy,
      message: 'Python 检查失败：' + String(run.error || run.stderr || '无输出').slice(0, 800),
      results: [],
    };
  }
  try {
    const parsed = JSON.parse(String(run.stdout).trim().split(/\r?\n/).pop() || '{}');
    return Object.assign({ backend: 'python', sympy: !!parsed.sympy }, parsed);
  } catch (e) {
    return { ok: false, backend: 'python', sympy: py.sympy, message: '检查结果不是合法 JSON', results: [] };
  }
}

/* ------------------------------------------------------------------ *
 * HTTP API
 * ------------------------------------------------------------------ */
function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(text);
}

const ASSET_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

function registerAssetRoute(webServer) {
  try {
    const base = fileURLToPath(new URL('./assets/', import.meta.url));
    return webServer.register({
      kind: 'prefix', path: '/formula-blocks/assets',
      async handler(req, res) {
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
        let rel;
        try { rel = decodeURIComponent(String(req.url || '').split('?')[0].replace('/formula-blocks/assets/', '')); } catch (e) { res.writeHead(400); res.end(); return; }
        const file = path.resolve(base, rel);
        const root = path.resolve(base);
        if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        const ext = path.extname(file).toLowerCase();
        if (!ASSET_TYPES[ext]) { res.writeHead(403); res.end(); return; }
        fs.readFile(file, (err, data) => {
          if (err) { res.writeHead(404); res.end(); return; }
          res.writeHead(200, {
            'content-type': ASSET_TYPES[ext],
            'cache-control': 'public, max-age=86400',
            'x-content-type-options': 'nosniff',
          });
          res.end(req.method === 'HEAD' ? undefined : data);
        });
      },
    });
  } catch (e) { return () => {}; }
}


function readBody(req, limitBytes) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) { resolve(null); try { req.destroy(); } catch (e) { /* ignore */ } return; }
      chunks.push(chunk);
    });
    req.on('end', () => { try { resolve(Buffer.concat(chunks).toString('utf8')); } catch (e) { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

function guard(req) {
  return req.headers['x-formula-blocks'] === '1' && req.method !== 'OPTIONS';
}

function libraryPath() {
  try { return fileURLToPath(new URL('./data/formulas.seed.json', import.meta.url)); } catch (e) { return null; }
}

function resolveWorkspaceDir(ctx, sessionId) {
  try {
    if (!sessionId || !ctx || !ctx.sessions) return null;
    const session = ctx.sessions.get(sessionId);
    const cwd = session && session.header && session.header.cwd;
    return typeof cwd === 'string' && path.isAbsolute(cwd) ? cwd : null;
  } catch (e) { return null; }
}

function projectFilePath(dir) {
  const folder = path.join(dir, '.formula');
  fs.mkdirSync(folder, { recursive: true });
  return path.join(folder, 'formula-blocks-projects.json');
}

function workspacePaths(dir) {
  const folder = path.join(dir, '.formula');
  fs.mkdirSync(folder, { recursive: true });
  return {
    folder,
    projects: path.join(folder, 'formula-blocks-projects.json'),
    favorites: path.join(folder, 'formula-blocks-favorites.json'),
    history: path.join(folder, 'formula-blocks-history.jsonl'),
  };
}

function appendHistory(dir, state) {
  try {
    const paths = workspacePaths(dir);
    const entry = {
      savedAt: new Date().toISOString(),
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      state,
    };
    const old = fs.existsSync(paths.history) ? fs.readFileSync(paths.history, 'utf8').split('\n').filter(Boolean) : [];
    old.push(JSON.stringify(entry));
    fs.writeFileSync(paths.history, old.slice(-50).join('\n') + '\n', 'utf8');
  } catch (e) { /* history is best-effort */ }
}

function readHistory(dir, limit) {
  try {
    const paths = workspacePaths(dir);
    if (!fs.existsSync(paths.history)) return [];
    const lines = fs.readFileSync(paths.history, 'utf8').split('\n').filter(Boolean).slice(-Math.max(1, limit || 20));
    return lines.map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean).reverse();
  } catch (e) { return []; }
}

function saveImageBuffer(buf, mime) {
  const ext = mime.indexOf('jpeg') >= 0 ? '.jpg' : (mime.indexOf('webp') >= 0 ? '.webp' : '.png');
  const dir = path.join(os.tmpdir(), 'formula-blocks-images');
  fs.mkdirSync(dir, { recursive: true });
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
  const file = path.join(dir, hash + ext);
  if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
  return file;
}

async function runOcr(body, py) {
  const env = process.env;
  const mpId = body.mathpixId || env.MATHPIX_APP_ID;
  const mpKey = body.mathpixKey || env.MATHPIX_APP_KEY;
  if (mpId && mpKey) {
    try {
      const src = body.dataUrl || (body.data ? ('data:' + (body.mime || 'image/png') + ';base64,' + body.data) : null);
      if (!src) return { ok: false, backend: 'mathpix', message: '缺少图片数据' };
      const res = await fetch('https://api.mathpix.com/v3/text', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          app_id: mpId,
          app_key: mpKey,
        },
        body: JSON.stringify({ src, formats: ['latex_styled'], data_options: { include_latex: true } }),
        signal: AbortSignal.timeout(30000),
      });
      const json = await res.json().catch(() => null);
      const latex = json && (json.latex_styled || json.text);
      if (latex) return { ok: true, backend: 'mathpix', latex };
      return { ok: false, backend: 'mathpix', message: (json && (json.error || json.error_info && json.error_info.message)) || 'Mathpix 未返回公式' };
    } catch (e) {
      return { ok: false, backend: 'mathpix', message: 'Mathpix 请求失败：' + String((e && e.message) || e) };
    }
  }
  const info = py || await detectPython(false);
  if (!info.command) {
    return { ok: false, backend: 'none', message: '未检测到 Python/OCR 后端：可安装 Python + pix2tex，或设置 MATHPIX_APP_ID / MATHPIX_APP_KEY。' };
  }
  const probe = await runPython(info.command.concat(['-c', 'import importlib.util as u;print(1 if u.find_spec("pix2tex") else 0)']), '', 8000);
  if (!(probe.ok && String(probe.stdout || '').trim() === '1')) {
    return { ok: false, backend: 'none', message: '未安装 pix2tex。可选：python -m pip install pix2tex 或设置 Mathpix 环境变量。' };
  }
  let imagePath = body.path;
  if (!imagePath && body.data) {
    try { imagePath = saveImageBuffer(Buffer.from(String(body.data), 'base64'), String(body.mime || 'image/png')); } catch (e) { imagePath = null; }
  }
  if (!imagePath) return { ok: false, backend: 'pix2tex', message: '缺少可读取的图片路径' };
  const script = [
    'import sys',
    'from PIL import Image',
    'from pix2tex.cli import LatexOCR',
    'print(LatexOCR()(Image.open(sys.argv[1])))',
  ].join('\n');
  const run = await runPython(info.command.concat(['-c', script, imagePath]), '', 180000);
  if (run.ok && String(run.stdout || '').trim()) {
    const lines = String(run.stdout).trim().split(/\r?\n/);
    return { ok: true, backend: 'pix2tex', latex: lines[lines.length - 1] };
  }
  return { ok: false, backend: 'pix2tex', message: String(run.stderr || run.error || 'pix2tex 识别失败').slice(0, 800) };
}

function registerApi(webServer, ctx) {
  const dispose = [];
  dispose.push(registerAssetRoute(webServer));
  try {
    dispose.push(webServer.register({
      kind: 'exact', path: '/formula-blocks/api/health',
      async handler(req, res) {
        if (!guard(req)) { sendJson(res, 403, { ok: false }); return; }
        const force = String(req.url || '').indexOf('force=1') >= 0;
        const py = await detectPython(force);
        let mathics = false;
        if (py.command) {
          try {
            const probe = await runPython(py.command.concat(['-c', 'import importlib.util as u;print(1 if u.find_spec("mathics") else 0)']), '', 8000);
            mathics = probe.ok && String(probe.stdout || '').trim() === '1';
          } catch (e) { mathics = false; }
        }
        sendJson(res, 200, {
          ok: true,
          python: py.command
            ? { available: true, sympy: py.sympy, mathics, command: py.command.join(' ') }
            : { available: false, sympy: false, mathics: false, command: null },
          tools: scanTools(),
        });
      },
    }));
    dispose.push(webServer.register({
      kind: 'exact', path: '/formula-blocks/api/check',
      async handler(req, res) {
        if (!guard(req) || req.method !== 'POST') { sendJson(res, 403, { ok: false }); return; }
        const raw = await readBody(req, 2_000_000);
        if (!raw) { sendJson(res, 400, { ok: false, message: 'body too large or unreadable' }); return; }
        let body;
        try { body = JSON.parse(raw); } catch (e) { sendJson(res, 400, { ok: false, message: 'invalid JSON' }); return; }
        const items = Array.isArray(body && body.items) ? body.items.slice(0, 40) : [];
        if (!items.length) { sendJson(res, 400, { ok: false, message: 'no items' }); return; }
        const result = await checkFormulas(items);
        sendJson(res, 200, result);
      },
    }));
    dispose.push(webServer.register({
      kind: 'exact', path: '/formula-blocks/api/image',
      async handler(req, res) {
        if (!guard(req) || req.method !== 'POST') { sendJson(res, 403, { ok: false }); return; }
        const raw = await readBody(req, 12_000_000);
        if (!raw) { sendJson(res, 400, { ok: false, message: 'image too large (max 12MB body)' }); return; }
        let body;
        try { body = JSON.parse(raw); } catch (e) { sendJson(res, 400, { ok: false, message: 'invalid JSON' }); return; }
        let buf;
        try { buf = Buffer.from(String(body.data || ''), 'base64'); } catch (e) { buf = null; }
        if (!buf || !buf.length) { sendJson(res, 400, { ok: false, message: 'empty image' }); return; }
        if (buf.length > 8_000_000) { sendJson(res, 400, { ok: false, message: 'image too large (max 8MB)' }); return; }
        const mime = String(body.mime || 'image/png');
        const ext = mime.indexOf('jpeg') >= 0 ? '.jpg' : (mime.indexOf('webp') >= 0 ? '.webp' : '.png');
        try {
          const dir = path.join(os.tmpdir(), 'formula-blocks-images');
          fs.mkdirSync(dir, { recursive: true });
          const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
          const file = path.join(dir, hash + ext);
          if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
          sendJson(res, 200, { ok: true, path: file, name: hash + ext, bytes: buf.length });
        } catch (e) {
          sendJson(res, 500, { ok: false, message: 'cannot save image: ' + String((e && e.message) || e) });
        }
      },
    }));
    dispose.push(webServer.register({
      kind: 'exact', path: '/formula-blocks/api/project/save',
      async handler(req, res) {
        if (!guard(req) || req.method !== 'POST') { sendJson(res, 403, { ok: false }); return; }
        const raw = await readBody(req, 6_000_000);
        if (!raw) { sendJson(res, 400, { ok: false, message: 'project too large' }); return; }
        let body;
        try { body = JSON.parse(raw); } catch (e) { sendJson(res, 400, { ok: false, message: 'invalid JSON' }); return; }
        if (!body || !body.state || !Array.isArray(body.state.projects)) {
          sendJson(res, 400, { ok: false, message: 'invalid project state' }); return;
        }
        const dir = resolveWorkspaceDir(ctx, body.sessionId) || os.homedir();
        try {
          const paths = workspacePaths(dir);
          const payload = JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), state: body.state });
          const tmp = paths.projects + '.tmp';
          fs.writeFileSync(tmp, payload, 'utf8');
          fs.renameSync(tmp, paths.projects);
          if (Array.isArray(body.favorites)) {
            try {
              fs.writeFileSync(paths.favorites, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), favorites: body.favorites }, null, 2), 'utf8');
            } catch (e) { /* favorites are best-effort */ }
          }
          if (Array.isArray(body.customBlocks)) {
            try {
              fs.writeFileSync(path.join(paths.folder, 'formula-blocks-custom-blocks.json'),
                JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), customBlocks: body.customBlocks }, null, 2), 'utf8');
            } catch (e) { /* custom blocks are best-effort */ }
          }
          if (Array.isArray(body.pinnedCats)) {
            try {
              fs.writeFileSync(path.join(paths.folder, 'formula-blocks-pins.json'),
                JSON.stringify({ version: 1, pinnedCats: body.pinnedCats }, null, 2), 'utf8');
            } catch (e) { /* pins are best-effort */ }
          }
          appendHistory(dir, body.state);
          sendJson(res, 200, { ok: true, path: paths.projects, favoritesPath: paths.favorites, bytes: Buffer.byteLength(payload) });
        } catch (e) {
          sendJson(res, 500, { ok: false, message: 'cannot write project: ' + String((e && e.message) || e) });
        }
      },
    }));
    dispose.push(webServer.register({
      kind: 'exact', path: '/formula-blocks/api/project/load',
      async handler(req, res) {
        if (!guard(req)) { sendJson(res, 403, { ok: false }); return; }
        let sessionId = null;
        try {
          const url = new URL(String(req.url || '/'), 'http://localhost');
          sessionId = url.searchParams.get('sessionId');
        } catch (e) { /* ignore */ }
        const dir = resolveWorkspaceDir(ctx, sessionId) || os.homedir();
        try {
          const paths = workspacePaths(dir);
          let state = null;
          let favorites = [];
          let customBlocks = [];
          let pinnedCats = [];
          if (fs.existsSync(paths.projects)) {
            const parsed = JSON.parse(fs.readFileSync(paths.projects, 'utf8'));
            state = parsed && parsed.state ? parsed.state : null;
          }
          if (fs.existsSync(paths.favorites)) {
            const parsed = JSON.parse(fs.readFileSync(paths.favorites, 'utf8'));
            favorites = parsed && Array.isArray(parsed.favorites) ? parsed.favorites : [];
          }
          const customFile = path.join(paths.folder, 'formula-blocks-custom-blocks.json');
          if (fs.existsSync(customFile)) {
            const parsed = JSON.parse(fs.readFileSync(customFile, 'utf8'));
            customBlocks = parsed && Array.isArray(parsed.customBlocks) ? parsed.customBlocks : [];
          }
          const pinsFile = path.join(paths.folder, 'formula-blocks-pins.json');
          if (fs.existsSync(pinsFile)) {
            const parsed = JSON.parse(fs.readFileSync(pinsFile, 'utf8'));
            pinnedCats = parsed && Array.isArray(parsed.pinnedCats) ? parsed.pinnedCats : [];
          }
          sendJson(res, 200, { ok: true, state, favorites, customBlocks, pinnedCats, path: paths.projects, favoritesPath: paths.favorites });
        } catch (e) {
          sendJson(res, 500, { ok: false, message: 'cannot read project: ' + String((e && e.message) || e) });
        }
      },
    }));
    dispose.push(webServer.register({
      kind: 'exact', path: '/formula-blocks/api/project/history',
      async handler(req, res) {
        if (!guard(req)) { sendJson(res, 403, { ok: false }); return; }
        let sessionId = null;
        let limit = 20;
        try {
          const url = new URL(String(req.url || '/'), 'http://localhost');
          sessionId = url.searchParams.get('sessionId');
          const n = Number(url.searchParams.get('limit') || '20');
          if (isFinite(n) && n > 0) limit = Math.min(50, Math.floor(n));
        } catch (e) { /* ignore */ }
        const dir = resolveWorkspaceDir(ctx, sessionId) || os.homedir();
        sendJson(res, 200, { ok: true, entries: readHistory(dir, limit), dir });
      },
    }));
    dispose.push(webServer.register({
      kind: 'exact', path: '/formula-blocks/api/ocr',
      async handler(req, res) {
        if (!guard(req) || req.method !== 'POST') { sendJson(res, 403, { ok: false }); return; }
        const raw = await readBody(req, 12_000_000);
        if (!raw) { sendJson(res, 400, { ok: false, message: 'image too large' }); return; }
        let body;
        try { body = JSON.parse(raw); } catch (e) { sendJson(res, 400, { ok: false, message: 'invalid JSON' }); return; }
        const result = await runOcr(body, await detectPython(false));
        sendJson(res, 200, result);
      },
    }));
    dispose.push(webServer.register({
      kind: 'exact', path: '/formula-blocks/api/library',
      async handler(req, res) {
        if (!guard(req)) { sendJson(res, 403, { ok: false }); return; }
        try {
          const file = libraryPath();
          const text = file ? fs.readFileSync(file, 'utf8') : '{"formulas":[]}';
          const data = JSON.parse(text);
          sendJson(res, 200, data);
        } catch (e) {
          sendJson(res, 500, { ok: false, message: 'library unavailable' });
        }
      },
    }));
  } catch (e) {
    try { webServer.ctx && webServer.ctx.logger && webServer.ctx.logger.warn(e); } catch (e2) { /* ignore */ }
  }
  return () => { dispose.forEach((d) => { try { d(); } catch (e) { /* ignore */ } }); };
}

/* ------------------------------------------------------------------ *
 * Plugin entry
 * ------------------------------------------------------------------ */
export function apply(ctx) {
  const registerCommand = (c) => {
    try {
      c.commands.register({
        name: 'toolcheck',
        description: '检测本机是否安装 Python / VS Code / MATLAB / COMSOL / LaTeX / Office / WPS',
        handler: () => ({ kind: 'success', text: toolcheckText() }),
      });
    } catch (e) { /* command surface unavailable */ }
  };

  try {
    if (ctx.inject) {
      ctx.inject(['commands'], (c) => registerCommand(c));
      ctx.inject(['webServer'], (c) => {
        try { c.effect(() => registerApi(c.webServer, c)); } catch (e) { registerApi(c.webServer, c); }
      });
    } else {
      if (ctx.commands) registerCommand(ctx);
      if (ctx.webServer) registerApi(ctx.webServer);
    }
  } catch (e) { /* keep the client half usable */ }
}
