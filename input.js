// ==============================
// 输入处理模块 (input.js)
// 包含：碰撞检测（射线法）、容差采样、命中处理、事件绑定
// 依赖：renderer.js（FloatingText, LevelUpEffect）
//       debug-effects.js（generateBladeEffect, generateSparkEffect）
//       CONFIG 全局对象
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
