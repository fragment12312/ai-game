// ==============================
// 输入处理模块 (input.js)
// 包含：碰撞检测（射线法）、容差采样、命中处理、事件绑定
// 依赖：renderer.js（FloatingText, LevelUpEffect）
//       CONFIG 全局对象（在 index.html 中定义）
// ==============================

// ---- 判定区顶点缓存 ----
// 将多边形顶点沿形心外扩 scale 倍（仅判定用，不影响绘制）。
// 结果缓存在 shape._hitPoints 上，scale 变化时自动重算。
function getHitPoints(shape) {
  const scale = CONFIG.HIT_AREA_SCALE;
  if (shape._hitPoints && shape._hitPointsScale === scale) {
    return shape._hitPoints;
  }
  if (scale === 1.0) {
    shape._hitPoints = shape.points;
  } else {
    shape._hitPoints = shape.points.map(p => ({
      x: shape.cx + (p.x - shape.cx) * scale,
      y: shape.cy + (p.y - shape.cy) * scale
    }));
  }
  shape._hitPointsScale = scale;
  return shape._hitPoints;
}

// ---- 射线法碰撞检测 ----
// 先将点击点反向旋转到图形的局部坐标系，再做水平射线法。
// 使用扩大后的判定顶点（getHitPoints），视觉图形不变。
function isPointInPolygon(px, py, shape) {
  const cos = Math.cos(-shape.rotation);
  const sin = Math.sin(-shape.rotation);
  const dx = px - shape.x;
  const dy = py - shape.y;
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  const pts = getHitPoints(shape);
  const n = pts.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    if ((yi > localY) !== (yj > localY)) {
      const intersectX = xj + ((localY - yj) / (yi - yj)) * (xi - xj);
      if (localX < intersectX) inside = !inside;
    }
  }
  return inside;
}

// ---- 容差版命中检测 ----
// 在点击点 ±tolerance 范围内做 3×3 网格采样（9 点，含对角线）
function hitTestWithTolerance(px, py, shape, tolerance) {
  if (tolerance <= 0) {
    return isPointInPolygon(px, py, shape);
  }
  const t = tolerance;
  const offsets = [
    {x:0,y:0},
    {x:t,y:0}, {x:-t,y:0}, {x:0,y:t}, {x:0,y:-t},
    {x:t,y:t}, {x:t,y:-t}, {x:-t,y:t}, {x:-t,y:-t}
  ];
  for (const off of offsets) {
    if (isPointInPolygon(px + off.x, py + off.y, shape)) return true;
  }
  return false;
}

// ---- 等级容差补偿 ----
function getLevelToleranceBoost(level) {
  if (level < 4) return 0;
  return (level - 3) * CONFIG.LEVEL_TOLERANCE_BOOST;
}

// ---- 获取 canvas 相对坐标 ----
function getCanvasPos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

// ==========================================
// [DEBUG_VISUAL] 利刃效果生成（命中时调用）
// ==========================================

// 线段交点计算（用于射线-边求交）
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

// 将局部坐标点（相对于 shape.cx/cy）变换到世界坐标
function toWorldSpace(localX, localY, shape) {
  const cos = Math.cos(shape.rotation);
  const sin = Math.sin(shape.rotation);
  return {
    x: shape.x + (localX - shape.cx) * cos - (localY - shape.cy) * sin,
    y: shape.y + (localX - shape.cx) * sin + (localY - shape.cy) * cos
  };
}

// 在 1.2x 判定区边界上找出口点：从形心沿 oppositeAngle 发射线，交于哪条边
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

// 生成双刃剑形利刃路径（平行剑身 + 细齿）
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

// 生成利刃调试效果（命中时调用，shape 还在场上）
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

// ==========================================
// [DEBUG_VISUAL] 烟花效果生成（未命中时调用）
// ==========================================

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

// ---- 命中处理 ----
// 从上层到下层遍历，命中第一个即停
function processHit(game, x, y, tolerance) {
  if (game.gameOver || game.paused) return;
  for (let i = game.shapes.length - 1; i >= 0; i--) {
    const shape = game.shapes[i];
    if (hitTestWithTolerance(x, y, shape, tolerance)) {
      // [DEBUG_VISUAL] 命中：生成银白利刃效果
      if (CONFIG.DEBUG_CLICK_VISUAL) {
        game.debugEffects.push(generateBladeEffect(shape));
      }
      // 命中！
      game.score += 10;
      game.floatingTexts.push(new FloatingText(x, y, shape.color));
      game.shapes.splice(i, 1);
      game.pool.release(shape);
      // 清屏加速
      if (game.shapes.length === 0 && game.boostCooldownRemaining <= 0) {
        game.boostNextSpawn = true;
      }
      // 每 100 分升级
      if (game.score % 100 === 0) {
        game.level++;
        game.levelUpEffect = new LevelUpEffect();
      }
      return;
    }
  }
  // [DEBUG_VISUAL] 未命中：生成烟花爆炸效果
  if (CONFIG.DEBUG_CLICK_VISUAL) {
    game.debugEffects.push(generateSparkEffect(x, y));
  }
}

// ---- 鼠标点击处理 ----
function handleClick(game, e) {
  const pos = getCanvasPos(game.canvas, e);
  const tolerance = CONFIG.MOUSE_TOLERANCE + getLevelToleranceBoost(game.level);
  processHit(game, pos.x, pos.y, tolerance);
}

// ---- 触摸处理 ----
function handleTouch(game, e) {
  e.preventDefault();
  if (e.touches.length > 0) {
    const pos = getCanvasPos(game.canvas, e.touches[0]);
    const tolerance = CONFIG.TOUCH_TOLERANCE + getLevelToleranceBoost(game.level);
    processHit(game, pos.x, pos.y, tolerance);
  }
}

// ---- 绑定所有输入事件 ----
function bindInputEvents(game) {
  game.canvas.addEventListener('click', (e) => handleClick(game, e));
  game.canvas.addEventListener('touchstart', (e) => handleTouch(game, e), { passive: false });

  window.addEventListener('resize', () => game.handleResize());

  document.getElementById('pauseBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (game.paused) {
      game.resume();
    } else {
      game.pause();
    }
  });

  document.getElementById('resumeBtn').addEventListener('click', (e) => {
    game.resume();
  });
}
