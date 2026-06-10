// ==============================
// 调试视觉特效模块 (debug-effects.js)
// [DEBUG_VISUAL] 命中 = 银白利刃，未命中 = 烟花火星。
// 依赖：input.js（getHitPoints）、CONFIG 全局对象、shape.js（IrregularShape）
// 发布时可通过删除本文件的 <script> 标签一键移除所有调试特效。
// ==============================

// ---- 线段交点计算（射线-边求交）----
function lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }
  return null;
}

// ---- 局部坐标 → 世界坐标 ----
function toWorldSpace(localX, localY, shape) {
  const cos = Math.cos(shape.rotation);
  const sin = Math.sin(shape.rotation);
  return {
    x: shape.x + (localX - shape.cx) * cos - (localY - shape.cy) * sin,
    y: shape.y + (localX - shape.cx) * sin + (localY - shape.cy) * cos
  };
}

// ---- 判定区对面出口点查找 ----
function findOppositeExit(cx, cy, oppAngle, pts) {
  const farX = cx + Math.cos(oppAngle) * 10000;
  const farY = cy + Math.sin(oppAngle) * 10000;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const hit = lineIntersection(cx, cy, farX, farY, a.x, a.y, b.x, b.y);
    if (hit) return hit;
  }
  // 回退：取对面顶点
  return pts[0];
}

// ---- 双刃剑形路径生成（平行剑身 + 细齿）----
function generateBladePath(entryW, exitW) {
  const dx = exitW.x - entryW.x;
  const dy = exitW.y - entryW.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) {
    return { leftEdge: [entryW, entryW], rightEdge: [exitW, exitW] };
  }
  const perpX = -dy / len;
  const perpY = dx / len;
  const segs = 14 + Math.floor(Math.random() * 5); // 14~18 段
  const leftEdge = [];
  const rightEdge = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const cx = entryW.x + dx * t;
    const cy = entryW.y + dy * t;

    // 平行剑身：中间 60% 宽度恒定，两端各 20% 收尖
    let taper;
    if (t < 0.2) taper = t / 0.2;
    else if (t > 0.8) taper = (1 - t) / 0.2;
    else taper = 1;

    // 细剑：半宽 2~4px，带微小锯齿抖动
    const halfWidth = (2 + Math.random() * 2) * taper;
    const jitter = (Math.random() - 0.5) * 1.0; // ±0.5px
    const leftOff = halfWidth + jitter;
    const rightOff = halfWidth - jitter;

    leftEdge.push({
      x: cx - perpX * leftOff,
      y: cy - perpY * leftOff
    });
    rightEdge.push({
      x: cx + perpX * rightOff,
      y: cy + perpY * rightOff
    });
  }

  return { leftEdge, rightEdge };
}

// ---- 利刃效果（命中时）----
function generateBladeEffect(shape) {
  const pts = getHitPoints(shape);   // 1.2x 判定区顶点（局部坐标）
  const cx = shape.cx, cy = shape.cy;
  const n = pts.length;

  // 1. 在 1.2x 判定区边界上随机选一条边，插值得入口点
  const edgeIdx = Math.floor(Math.random() * n);
  const t = Math.random();
  const p1 = pts[edgeIdx];
  const p2 = pts[(edgeIdx + 1) % n];
  const entryLocal120 = {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t
  };

  // 2. 外扩至 1.32x（1.2 × 1.1）
  const entryLocal = {
    x: cx + (entryLocal120.x - cx) * 1.1,
    y: cy + (entryLocal120.y - cy) * 1.1
  };

  // 3. 出口：从形心穿过入口的反方向，交 1.2x 判定区于另一点
  const angle = Math.atan2(entryLocal120.y - cy, entryLocal120.x - cx);
  const oppAngle = angle + Math.PI;
  const exitLocal120 = findOppositeExit(cx, cy, oppAngle, pts);

  // 4. 外扩至 1.32x
  const exitLocal = {
    x: cx + (exitLocal120.x - cx) * 1.1,
    y: cy + (exitLocal120.y - cy) * 1.1
  };

  // 5. 变换到世界坐标
  const entryW = toWorldSpace(entryLocal.x, entryLocal.y, shape);
  const exitW = toWorldSpace(exitLocal.x, exitLocal.y, shape);

  // 6. 生成锯齿路径
  const path = generateBladePath(entryW, exitW);

  return {
    type: 'blade',
    age: 0,
    entry: entryW,
    exit: exitW,
    path: path
  };
}

// ---- 烟花效果（未命中时）----

function sparkColor() {
  const r = Math.random();
  if (r < 0.3) return '#ff2200';  // 深红
  if (r < 0.55) return '#ff5500'; // 橙红
  if (r < 0.75) return '#ff8800'; // 橙色
  if (r < 0.9) return '#ffbb00';  // 金橙
  return '#ffdd00';               // 亮黄
}

function generateSparkEffect(x, y) {
  const count = 12 + Math.floor(Math.random() * 7); // 12~18
  const spread = CONFIG.DEBUG_MISS_SPREAD || 8;
  const sparks = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spread;
    sparks.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      radius: 0.6 + Math.random() * 1.0,        // 0.6~1.6 px
      color: sparkColor(),
      flickerPhase: Math.random() * Math.PI * 2, // 独立闪烁相位
      flickerSpeed: 8 + Math.random() * 10       // 闪烁频率 Hz
    });
  }
  return {
    type: 'spark',
    age: 0,
    sparks: sparks
  };
}
