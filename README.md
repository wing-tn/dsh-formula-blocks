# Formula Blocks · 公式积木

> Build, verify and reuse mathematics as visual blocks inside DeepSeek Harness.
> 在 DeepSeek Harness 里像搭积木一样拼公式、做检查、沉淀自己的公式资产。

**Formula Blocks is a visual workspace where mathematics clicks together like LEGO**: build equations by dragging blocks, typing, or importing a screenshot, then verify them with dimension checks and a local Python/SymPy backend. 29 block types, 59 curated formulas, projects with version history, and reusable custom blocks make formula writing intuitive and dependable — for physics, math, engineering, and teaching.

**公式积木 Formula Blocks 把数学公式做成可拼装的可视化工作台**：拖拽、键盘输入或粘贴截图都能生成可编辑的公式树；29 种积木、59 条经典公式、量纲检查与本地 Python/SymPy 验证、项目与版本管理、可复用的“我的整合块”，让写公式像搭乐高一样直观，又像专业计算环境一样可靠——适合物理、数学、工程与教学。

---

## ✨ Features / 功能

| | |
|---|---|
| 🧱 **Block tree / 积木树** | Drag blocks into slots, click to insert, double-click to edit; delete collapses operators and structures instead of leaving holes. |
| 🕸 **Node graph / 节点图** | The same expression as a node graph; move subtrees by dragging. |
| ⌨️ **Keyboard / 键盘** | Type a whole expression in the bottom bar, or type directly on the canvas (`a`, `2`, `+ - * / = ^ _ ( )`). |
| 🗂 **Projects / 项目** | Multiple formula rows per project; auto-save to `.formula/`, JSON import/export, version history, merge or replace on import. |
| 🧩 **My Blocks / 我的整合块** | Save any subtree or whole formula into the left-top library; rename, recategorize, drag to reorder or move across categories, pin/collapse groups, mini formula thumbnails. |
| 📚 **Library & scan / 公式库与识图** | 59 curated formulas one click away; paste a screenshot for multimodal Agent recognition (Mathpix / pix2tex optional). |
| 🚦 **Verification / 验证** | Red/yellow/green lamps: dimension consistency + local Python/SymPy execution; green means the generated code ran. |
| 🎮 **Quests / 关卡** | Six classic-formula quests with XP, favorites, undo/redo. |

## 🚀 Install / 安装

### From the DSH plugin market

The DSH plugin index is rebuilt from npm, so once the package is published it becomes installable without any manual PR:

```bash
dsh plugin add dsh-formula-blocks
```

Then restart / reload the Web GUI and click the **🧩** button at the left of the composer (or press `Ctrl+Shift+F`).

### From this repository

```bash
git clone https://github.com/wing-tn/dsh-formula-blocks
cd dsh-formula-blocks
dsh plugin add .
```

### Requirements

- DeepSeek Harness Web GUI (desktop profile).
- Optional: Python 3.10+ with `sympy` for automatic green-light verification (`python -m pip install sympy`).
- Optional: `MATHPIX_APP_ID` / `MATHPIX_APP_KEY` env vars, or `pip install pix2tex`, for one-click OCR.

## 📖 Tutorial / 教程

Open the panel and click the prominent **📖 教程 / Tutorial** button in the header. It includes a bilingual one-page tour, an 8-card feature map, a 5-minute walkthrough, shortcuts, and privacy notes.

## 🔒 Privacy / 隐私

Local-first. Projects, favorites, custom blocks and history live in `localStorage` and in `<workspace>/.formula/` (`formula-blocks-projects.json`, `formula-blocks-favorites.json`, `formula-blocks-custom-blocks.json`, `formula-blocks-history.jsonl`). Python/SymPy checks run locally. Screenshots are saved to a temporary folder; the plugin never uploads them to a third party.

## 🛠 Development / 开发

The plugin is a two-half Cordis bundle:

- `index.js` — host half: `/toolcheck` command and local HTTP API (`health`, `check`, `library`, `project/save|load|history`, `ocr`, `image`), Python detection, workspace persistence.
- `client.js` — client half: the whole editor UI (plain JS, no build step).
- `data/formulas.seed.json` — curated seed formulas.
- `locale/*.json`, `icon.svg`, `cordis.patch.yml`.

```bash
node --check index.js
node --check client.js
```

## 📄 License

MIT (see `LICENSE`). Please confirm before publishing if you prefer another license.

## 🙏 Acknowledgements

Built for DeepSeek Harness (Cordis plugin architecture).
