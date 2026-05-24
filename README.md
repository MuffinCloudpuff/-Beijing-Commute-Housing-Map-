🗺️ 燕居指南 (Beijing Commute & Housing Map)
一个基于高德地图 API 的交互式通勤决策与找房辅助分析工具
在超一线城市找房时，地理位置、通勤时间、心理预期往往难以在传统租房 App 内直观调和。本项目旨在通过多点并行测算、地铁连通图算法以及自定义区域排除等功能，为您建立专属的租房地理决策中心。
✨ 核心功能 (Core Features)
🚇 混合通勤等时圈分析 (Commute Radius Analysis)
不同于简单的直线距离圈，工具内置了**“单车接驳 + 地铁直达”**的拓扑连通估算算法（自定义 Dijkstra 权重）。可自动计算并高亮指定时间范围内的合适地铁站点，更智能地寻找“圈外上车点”。
🎯 多目标坐标比选 (Multi-Destination Comparison)
不再受限于传统的“点对点”规划。支持录入所有意向房源，一并计算并根据耗时最优原则进行列表排序，通勤长短一目了然。
🛡️ 环线与行政区过滤 (Geofencing & Exclusions)
内置北京全部行政区多边形及环线（二至六环）区块。可通过一键勾选，在地图上直观遮罩并排除不符合预期的区域，防范通勤“纸面近、实则远”的问题。
💾 本地化数据留存 (Data Persistence)
意向房源信息不仅会在地图上打点，还支持一键导入 / 导出 JSON 配置文件。同时也预留了图片识别（OCR）极速录入的通道。
🛠 技术栈 (Tech Stack)
框架：React 18 + TypeScript + Vite
UI & 样式：Tailwind CSS + motion/react (Framer Motion)
地图服务：高德地图 JS API v2.0 + AMap UI 组件库
空间数据运算：Turf.js（可选地缘分析扩展） / 原生图算法
🎨 设计哲学 (Aura Design)
界面严格遵循 Aura Design 视觉流，彻底摒弃传统 GIS 系统的繁杂控件堆积。
采用悬浮玻璃态（Glassmorphism）、深度虚化（Backdrop Blur）、平滑的弹簧物理动效（Spring Physics），保证功能高密度的同时不失现代、轻盈与呼吸感。
