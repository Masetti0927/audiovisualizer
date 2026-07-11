# audiovisualizer

基于 [WaelYasmina](https://github.com/WaelYasmina) 的 [YouTube 教程](https://youtu.be/qDIF2z_VtHs) 大幅重构和功能扩展的 3D 音频可视化器。

## 功能特性

### 音频源
- 内置 MP3 播放（播放/暂停控制）
- 系统音频捕获（通过 `getDisplayMedia`）
- 系统音频播放开关（默认关闭，避免回声）

### 几何体控制
- 细分级别 (1-50)
- 线框模式（线条 + 顶点圆点）
- 点云模式（仅圆点，可调大小）
- 缩放控制 (0.5-3)

### 音频分析
- 灵敏度控制 (1-10)
- 平滑度控制 (0-0.95)
- 噪声速度控制 (1-5)

### 视觉效果
- Bloom 后处理（阈值、强度、半径）
- 颜色选择器（Hex + RGB 滑动条）

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/Masetti0927/audiovisualizer.git

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打开浏览器访问
# http://localhost:1234
```

## 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

## 致谢

- 原始教程：[WaelYasmina/audiovisualizer](https://github.com/WaelYasmina/audiovisualizer)
- YouTube：https://youtu.be/qDIF2z_VtHs

## 许可证

[MIT](LICENSE)
