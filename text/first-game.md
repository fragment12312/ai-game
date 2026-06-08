╔══════════════════════════════════════════════════════════════╗
║          TCREI 工程化提示词：网页点击游戏                   ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│  T — TASK（任务定义）                                       │
└─────────────────────────────────────────────────────────────┘

**Persona（角色）**：
你是一名拥有 15 年经验的资深前端游戏开发工程师，精通 Canvas API、
requestAnimationFrame 游戏循环、碰撞检测算法，以及 UI/UX 动效设计。

**核心任务**：
编写一个完整的、可直接在浏览器中运行的单文件 HTML 网页点击游戏。

**首要目标**：
- **流畅性优先**：游戏必须稳定跑满 60fps，任何情况下不掉帧是第一优先
- **动画正确即可**：动画流程逻辑正确、不混乱即可，无需追求花哨的缓动曲线

**输出格式**：
- 单个 `.html` 文件，文件编码 UTF-8（无 BOM）
- 所有 CSS 和 JavaScript 必须内联（inline）
- 代码必须有清晰的中文注释，按模块分区（游戏配置 / 渲染 / 逻辑 / UI）
- 使用 HTML5 Canvas 作为游戏主画布
- 代码必须能直接在浏览器双击打开即玩，无需任何构建工具或服务器

**Anti-goals（明确禁止）**：
- 禁止使用 WebGL / Three.js 等 3D 框架
- 禁止使用 CSS @keyframes 动画 —— 所有动画必须在 Canvas 内用 JS 实现
- 禁止 `<script src="...">` 或 `type="module"` 引用外部文件
- 禁止使用 npm 包、CDN、import/export 语句
- 禁止引入任何第三方动画库（GSAP、anime.js 等）

┌─────────────────────────────────────────────────────────────┐
│  C — CONTEXT（上下文与约束）                                │
└─────────────────────────────────────────────────────────────┘

**游戏核心规则**：
1. 不规则多边形图形从画布顶端随机位置持续掉落到底端
2. 用户通过鼠标点击（或触屏 tap）掉落的图形来得分
3. 每点击中一个图形 → +1 分
4. 每累计获得 100 分，游戏难度自动提升一个等级
5. 图形掉落到底部未被点击 → 不扣分，但图形消失
6. 游戏无终点，分数越高越好

**图形要求**：
- "不规则图形"定义为：随机顶点数（4~8 个顶点）的凸/凹多边形
- 每个图形的颜色随机且鲜艳（饱和度 ≥ 60%，便于在背景上辨识）
- 图形带有微弱阴影或发光效果，增强视觉层次
- 图形以随机角速度自转，增加点击难度

**难度递增机制（每 100 分触发）**：
| 难度等级 | 掉落速度倍率 | 同时存在最大图形数 | 图形平均尺寸 | 生成间隔(ms) | 特殊效果 |
|----------|-------------|-------------------|-------------|-------------|-----|
| Lv1(0)   | 1.0x        | 3                 | 100%        | 800         | 无 |
| Lv2(100) | 1.3x        | 4                 | 90%         | 700         | 40% 概率出现左右漂移（速度 ±30px/s） |
| Lv3(200) | 1.6x        | 5                 | 80%         | 600         | 漂移概率 70%，幅度 ±60px/s |
| Lv4(300) | 2.0x        | 6                 | 70%         | 500         | 30% 的图形掉落速度随机 ±40% 波动 |
| Lv5(400) | 2.5x        | 8                 | 60%         | 400         | 全部图形掉落速度随机 ±50% 波动 |
| Lv6+(500)| 2.8x        | 10 (封顶)         | 55%         | 350         | 漂移+变速叠加，速度上限 3.5x |

> **线性外推规则**：Lv6 起，每 100 分速度 +0.3x、生成间隔 -50ms，其余参数封顶。速度最终上限 4.0x，生成间隔下限 250ms。尺寸 100% 基准 = Lv1 时图形顶点半径均值 45px。

**UI 要求**：
- 画布上方固定显示：当前分数（大字）+ 当前难度等级 + 距下一级还需多少分
- 点击命中时：在点击位置弹出 "+1" 浮动文字动画（0.5s 淡出上飘消失）
- 难度提升时：屏幕中央短暂显示 "LEVEL UP!" 大字动画（1s 后消失）
- 整体设计风格：暗色背景 + 霓虹灯赛博朋克风格（cyberpunk neon aesthetic）
- 移动端响应式：画布自适应窗口大小，触摸事件正常运行

**技术约束**：
- 纯原生 JavaScript（不依赖任何第三方库或框架）
- 使用 `requestAnimationFrame` 实现 60fps 游戏循环
- 使用 delta-time 控制游戏速度，确保不同刷新率设备体验一致
  - **关键**：delta-time 必须做 clamp，`dt = Math.min(rawDt, 50)`（毫秒），防止标签页切换回来后 dt 尖刺导致图形瞬移到底部
- 碰撞检测使用**射线法（Ray Casting）** —— 从点击点向右发出一条水平射线，统计与多边形各边的交点数：奇数次交点在内部，偶数次在外部
  - **不推荐 `isPointInPath()`**：该方法需要对每个图形做 `ctx.save/rotate/restore`，大量图形时性能开销远高于射线法
- 图形对象池复用，避免频繁 GC 导致卡顿
- 移动端触摸区域补偿：在点击点 ±10px 范围内做碰撞检测（fat finger 容差），提升触屏命中体验

┌─────────────────────────────────────────────────────────────┐
│  R — REFERENCES（参考范例）                                 │
└─────────────────────────────────────────────────────────────┘

**代码结构参考（模块划分）**：

```javascript
// ========== 1. 游戏配置 ==========
const CONFIG = {
  CANVAS_BG: '#0a0a1a',
  BASE_FALL_SPEED: 120,      // 像素/秒
  SPAWN_INTERVAL: 800,       // 毫秒
  MAX_SHAPES: 3,
  // ...
};

// ========== 2. 对象池 ==========
class ShapePool {
  constructor(maxSize) { this.pool = []; this.maxSize = maxSize; }
  acquire(level)    { /* 从池中取出一个图形，重置属性；池空则 new */ }
  release(shape)    { /* 回收到池（池未满时）；超过 maxSize 则丢弃给 GC */ }
}
// ========== 3. 图形类 ==========
class IrregularShape {
  constructor(level) { /* 随机生成顶点，计算包围盒 */ }
  reset(level)      { /* 对象池复用时重置属性 */ }
  update(dt)        { /* 下落 + 自转 + 漂移 */ }
  draw(ctx)         { /* Canvas 绘制 + 阴影 */ }
  hitTest(x, y)     { /* 调用射线法工具函数 */ }
}

// ========== 3. 粒子特效类 ==========
class FloatingText { /* "+1" 飘字动画 */ }
class LevelUpEffect { /* 升级全屏特效 */ }

// ========== 4. 游戏主循环 ==========
class Game {
  constructor()   { /* 初始化 Canvas、事件绑定 */ }
  start()         { /* 启动游戏循环 */ }
  update(dt)      { /* 更新所有对象 */ }
  render()        { /* 绘制所有对象 + UI */ }
  spawnShape()    { /* 对象池获取/创建图形 */ }
  increaseDifficulty() { /* 难度升级逻辑 */ }
}

// ========== 5. 事件处理 ==========
canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', handleTouch);
window.addEventListener('resize', handleResize);

// ========== 6. 启动 ==========
const game = new Game();
game.start();
```

**图形生成伪代码参考**：
```javascript
function generateIrregularPolygon(cx, cy, avgRadius, vertices) {
  const points = [];
  for (let i = 0; i < vertices; i++) {
    const angle = (i / vertices) * Math.PI * 2;
    // 为每个顶点添加随机扰动，制造不规则感
    const r = avgRadius * (0.5 + Math.random() * 0.8);
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r
    });
  }
  return points;
}
```

**射线法碰撞检测伪代码参考（旋转后多边形）**：
```javascript
function isPointInPolygon(px, py, vertices, shapeAngle) {
  // 1. 先对点击坐标做反向旋转，转到多边形的局部坐标系
  //    算出多边形中心 (cx, cy)，将 (px, py) 绕中心旋转 -shapeAngle
  const cos = Math.cos(-shapeAngle), sin = Math.sin(-shapeAngle);
  const dx = px - cx, dy = py - cy;
  const localX = dx * cos - dy * sin + cx;
  const localY = dx * sin + dy * cos + cy;

  // 2. 在局部坐标系中做标准射线法
  let inside = false;
  const n = vertices.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    // 射线从 (localX, localY) 向右水平射出
    if ((yi > localY) !== (yj > localY)) {
      const intersectX = xj + ((localY - yj) / (yi - yj)) * (xi - xj);
      if (localX < intersectX) inside = !inside;
    }
  }
  return inside;
}
```

**delta-time 主循环模板**：
```javascript
let lastTime = 0;
function gameLoop(timestamp) {
  let dt = timestamp - lastTime;
  lastTime = timestamp;
  // 关键：clamp 防止标签页切换或后台运行后的大 dt 尖刺
  dt = Math.min(dt, 50); // 上限 50ms，对应最低 20fps 逻辑更新
  // 可选：下限防止除零 (dt > 0)
  if (dt <= 0) dt = 16.67;

  game.update(dt / 1000); // dt 传秒，方便速度计算
  game.render();
  requestAnimationFrame(gameLoop);
}
```

**对象池核心逻辑伪代码**：
```javascript
class ShapePool {
  constructor() { this.available = []; }
  acquire(level) {
    let shape;
    if (this.available.length > 0) {
      shape = this.available.pop();
      shape.reset(level);  // 复用：重置顶点、位置、颜色等
    } else {
      shape = new IrregularShape(level);  // 新建
    }
    return shape;
  }
  release(shape) {
    // 池最大容量 15（Lv6+ 封顶 10 个 + 缓冲），超出则丢弃
    if (this.available.length < 15) {
      this.available.push(shape);
    }
  }
}

**UI 布局参考**：
```
┌──────────────────────────────────┐
│   🏆 分数: 247    ⚡ Lv.3       │  ← 固定 HUD 顶栏
│   📈 距下一级: 53 分            │
│                                  │
│        ⬠  ← 掉落中的不规则图形   │
│                                  │
│     ✦  ← 自转 + 左右漂移        │
│                                  │
│   ⬡                             │
│                                  │
└──────────────────────────────────┘
```

┌─────────────────────────────────────────────────────────────┐
│  E — EVALUATE（自我评估清单）                               │
└─────────────────────────────────────────────────────────────┘

在输出代码后，你必须逐项自检以下标准，并将自检结果以注释形式附在代码末尾：

**功能完整性（必须全部 ✅）**：
□ [ ] 不规则多边形从顶部落下至底部
□ [ ] 点击图形能准确检测命中（含旋转后的多边形）
□ [ ] 命中后分数 +1 且图形消失
□ [ ] 每 100 分触发难度升级
□ [ ] 难度升级后掉落速度/数量/尺寸有明显变化
□ [ ] "+1" 浮动文字动画正常播放
□ [ ] "LEVEL UP!" 升级动画正常播放
□ [ ] 移动端触摸事件可正常使用
□ [ ] 窗口缩放后画布自适应

**代码质量**：
□ [ ] 无第三方依赖，无 `<script src>` 无 import/export
□ [ ] 使用 delta-time 且做了 clamp（上限 ≤50ms）
□ [ ] 图形对象池已实现（池上限 15，release 时判断上限）
□ [ ] 代码模块分区清晰，中文注释完整
□ [ ] 碰撞检测使用射线法而非 isPointInPath

**视觉风格**：
□ [ ] 背景色 #0a0a1a（深色赛博朋克基底）
□ [ ] 图形使用 neon 色板（色相均匀分布在色环上，s≥60%, l≥50%）
□ [ ] 阴影发光：`shadowBlur ≥ 10` + 多层不同透明度 shadowColor

**性能**（以下用 Chrome DevTools Performance 面板录制验证）：
□ [ ] 稳定 60fps：连续录制 30 秒，无连续 3 帧以上低于 55fps
□ [ ] 同时存在 10 个图形时无超过 16ms 的单帧耗时
□ [ ] 对象池运行时无明显 GC 尖刺（JS heap 锯齿波幅 ≤ 2MB）

┌─────────────────────────────────────────────────────────────┐
│  I — ITERATE（迭代优化指令）                                │
└─────────────────────────────────────────────────────────────┘

**输出后执行以下迭代步骤**：

1. **第一轮自查（功能完整性）**：对照上述 Evaluate 功能类清单逐项检查，标记为 ✅ 或 ❌
2. **修复问题**：对每个 ❌ 项，定位代码中对应部分并修正
3. **第二轮自查（代码质量）**：重新检查第一轮标记为 ❌ 的项 + Evaluate 代码质量类清单，确保全部变 ✅
4. **第三轮自查（性能验证）**：检查性能类清单 + 修复任何可能导致掉帧的问题（主要是对象创建/GC、不必要的属性计算）
5. **边界情况验证**：特别检查以下场景 ——
   - 同时点击两个重叠图形 → 只应命中上层图形（z-order 从上到下遍历，命中即停）
   - 快速连续点击同一图形 → 第一次命中后图形已消失（已回收对象池），不应重复计分
   - 浏览器标签页切到后台 5 秒后切回 → dt 被 clamp 在 50ms，图形不会瞬移到底部
   - `devicePixelRatio > 1` 高分屏（如 Retina 2x）→ canvas 坐标转换正确，点击位置不偏移
   - 最小窗口尺寸（320px 宽）→ 游戏仍可正常游玩，HUD 不溢出
   - 窗口 resize → canvas 尺寸平滑过渡，已存在图形不会因坐标系突变而位置错乱
   - 触摸事件 → 调用 `e.preventDefault()` 防止页面在 canvas 上滑动/缩放
   - 难度升至 Lv.10+ → 参数按外推规则稳定，游戏可玩（极难但不崩溃）
6. **输出格式校验**：确认最终 `.html` 文件中 ——
   - `<script>` 标签无 `src` 属性、无 `type="module"`
   - 无 `import` / `export` 语句
   - 无 `<link>` 外部 CSS 引用
7. **最终润色**：确保 canvas 背景为 #0a0a1a，霓虹发光使用 `shadowBlur` + 多层 `shadowColor` 实现辉光层次；动画逻辑正确即可，不追求复杂缓动曲线

**输出最终版本时，代码末尾附上最终自检结果表（所有项必须 ✅）**。
