# 🗺️ 北京找房/通勤决策地图 (Beijing Commute & Renting Decision Map)

一个基于 高德地图 API 的重度定制化单页应用。专为在北京找房、规划通勤的上班族设计。
通过结合全景地铁图数据提取、Dijkstra 最短路径算法，以及灵活的行政区/环线空间过滤，帮助你直观地可视化出“在指定时间内，我可以去哪里租房”。

## ✨ 核心功能 (Features)

- 🚇 **等时通勤圈分析 (Isochrone Commute Search)**
  - 根据输入的工作地点（起点）和预期通勤时间，通过内置算法逆推并高亮显示所有满足条件的地铁站。
  - **外围倾向算法**: 剔除过近可直接骑行的范围，优先向远离城市中心（天安门）的外围辐射，智能推荐性价比更高的居住外扩区。
  
- 📍 **多点路线并发对比 (Multi-Destination Routing)**
  - 可以同时导入多个备选房源位置，一键并发计算所有房源到公司的最优方案（支持地铁、公交、驾车、骑行、步行）。

- 🚫 **灵活的空间排除 (Geo-fencing & Filters)**
  - **行政区/环线拦截**: 一键屏蔽不想去的区域（比如“排除朝阳区”或“排除六环外”）。
  - 在底层路由引擎或通勤圈判定时，自动略过或者置灰该区域。

- 🎨 **沉浸式视觉 (Aura Design)**
  - 极简无边框设计，采用全屏地图作为底板。
  - 配合极客风暗色毛玻璃 (Dark Glassmorphism)、弹簧物理动画 (Motion) 打造丝滑流畅的交互与空间层次感。

- 📂 **纯前端轻量架构 (Local State & File Sync)**
  - 完全不需要配置和维护后端，看房坐标和配置信息可以随时导出为 JSON 本地文件备份，或从文件一键还原地图现场。

## 🛠️ 技术栈 (Tech Stack)

- **核心框架**: React 18 + TypeScript + Vite
- **地图服务**: 高德地图 Web JS API 2.0
- **UI & 样式**: Tailwind CSS
- **动画引擎**: `motion/react` + Spring Physics
- **组件图标**: Lucide React
- **基础状态**: 完全基于 Client-side React Hooks 进行复杂业务流转。

## 🚀 快速启动 (Getting Started)

### 1. 准备环境
确保安装了 [Node.js](https://nodejs.org/) (推荐 v18+)。

### 2. 克隆与安装依赖
```bash
git clone https://github.com/your-username/beijing-commute-map.git
cd beijing-commute-map
npm install
```

### 3. 配置高德地图 Key
请前往 [高德开放平台](https://console.amap.com/dev/key/app) 申请 Web端(JS API) 的 Key 与安全密钥 (Security Code)。
在项目根目录创建 `.env` 文件：
```env
VITE_AMAP_KEY=你的高德地图Key
VITE_AMAP_SECURITY_CODE=你的高德安全密钥
```

### 4. 运行与构建
```bash
# 启动本地开发服务
npm run dev

# 构建生产版本
npm run build
```

## 🏗️ 核心代码结构 (Architecture)

秉着低耦合防膨胀的原则，所有独立算法均沉淀至专属分类：

- `src/components/NavigationApp.tsx`: 页面编排总容器，组装所有控制菜单和图层。
- `src/hooks/useCommuteSearch.ts`: 通勤圈核心 Hook，控制数据流并渲染地图覆盖物。
- `src/hooks/useRouteCalculation.ts`: 负责并行的路线方案测算机制。
- `src/utils/commuteAlgo.ts`: 原生基于高德原始路网构建的 Dijkstra 节点最短时空计算引擎。
- `src/hooks/useMapOverlays.ts`: 专门管理起终点坐标系、折线串、绘制控制。

## 📄 开源协议 (License)

[MIT License](./LICENSE)
