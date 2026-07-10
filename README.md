# 🎵 Everyday Music

**每天三张专辑，发现音乐史上的今天。**

一个纯静态音乐发现网站。每天推荐三张发行于当日（同月同日不同年）的优质专辑，带你穿越音乐史的长河。

---

## ✨ 特色

- 📅 **每日三张** — 精选三张在历史上今天发行的专辑
- 🇨🇳 **华语专区** — 每天恰好一张华语专辑，不多不少
- 🌐 **中英双语** — 一键切换中文/English
- 🏷️ **语种 + 品类标签** — 不设「经典/冷门」分级，平等呈现
- 🎧 **不提供播放** — 规避版权问题，附流媒体链接供自行收听
- 📖 **深度内容** — 专辑简介、幕后趣事、历史影响
- 🌙 **黑胶唱片店风格** — 深色主题，响应式设计

---

## 🚀 快速开始

### 本地运行

```bash
# 安装依赖（仅数据生成脚本需要）
npm install @anthropic-ai/sdk

# 启动本地服务器
npx serve .

# 浏览器打开 http://localhost:3000
```

### 生成完整专辑数据

```bash
# 设置 API Key
export ANTHROPIC_API_KEY=your-key-here

# 生成 366 天的完整数据
node scripts/generate-data.js

# 检查数据覆盖情况
node scripts/supplement.js
```

---

## 📁 项目结构

```
EveryDay Music/
├── index.html              # 主页面
├── css/
│   └── style.css           # 样式表（深色主题、响应式）
├── js/
│   ├── app.js              # 主逻辑：日期检测、选取、渲染
│   ├── i18n.js             # 中英双语切换
│   └── utils.js            # 工具函数
├── data/
│   └── albums.json         # 专辑数据库（当前为样本数据）
├── scripts/
│   ├── generate-data.js    # AI 批量生成专辑数据
│   └── supplement.js       # 数据覆盖分析 & 补充
└── assets/
    ├── favicon.svg
    └── placeholder-cover.svg
```

---

## 🌍 部署

### GitHub Pages

1. Push 代码到 GitHub 仓库
2. Settings → Pages → Source: `main` 分支
3. 网站即部署到 `https://<username>.github.io/<repo>/`

### Vercel / Netlify

直接导入 GitHub 仓库，自动检测静态站点并部署。

---

## 📝 数据说明

- `data/albums.json` 当前包含**样本数据**（8个日期、24张专辑）
- 运行 `node scripts/generate-data.js` 可生成完整的 366 天数据
- 数据由 AI 辅助整理，可能存在疏漏，欢迎反馈纠错

### 专辑数据格式

```json
{
  "id": "unique-id",
  "name": "Album Name",
  "nameZh": "专辑中文名",
  "artist": "Artist",
  "artistZh": "艺术家中文名",
  "releaseDate": "MM-DD",
  "year": 1990,
  "coverImage": "https://...",
  "genres": ["Rock", "Alternative"],
  "language": "chinese",
  "languageZh": "华语",
  "descriptionZh": "...",
  "descriptionEn": "...",
  "storiesZh": "...",
  "storiesEn": "...",
  "historicalImpactZh": "...",
  "historicalImpactEn": "...",
  "links": {
    "wikipedia": "https://...",
    "spotify": "https://...",
    "douban": "https://..."
  }
}
```

---

## 🛠️ 技术栈

- 纯静态 (HTML + CSS + vanilla JavaScript)
- 零框架依赖
- 可部署到任何静态托管服务

---

## 📄 License

MIT
