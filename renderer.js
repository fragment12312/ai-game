// ==============================
// 渲染模块 (renderer.js)
// 包含：特效类、分数格式化、背景/UI 绘制、渲染编排
// 依赖：CONFIG 全局对象（在 index.html 中定义）
// ==============================

// ---- 分数格式化 ----
function formatScore(score) {
  if (score >= 1000) {
    const kValue = score / 1000;
    if (kValue >= 100) {
      return Math.round(kValue) + 'k';
    } else if (kValue >= 10) {
      return kValue.toFixed(1) + 'k';
    } else {
      return kValue.toFixed(2) + 'k';
    }
  }
  return score.toString();
}

// ---- "+10" 浮动文字特效类 ----
class FloatingText {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.age = 0;
    this.duration = CONFIG.FLOAT_TEXT_DURATION;
    this.alive = true;
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.duration) {
      this.alive = false;
      return;
    }
    // 上飘
    this.y -= 60 * dt;
  }

  draw(ctx) {
    const progress = this.age / this.duration;
    const alpha = 1 - progress; // 线性淡出
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fillText('+10', this.x, this.y);
    ctx.restore();
  }
}

// ---- "LEVEL UP!" 升级特效类 ----
class LevelUpEffect {
  constructor() {
    this.age = 0;
    this.duration = CONFIG.LEVEL_UP_DURATION;
    this.alive = true;
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.duration) {
      this.alive = false;
    }
  }

  draw(ctx, canvasWidth, canvasHeight) {
    const progress = this.age / this.duration;
    // 缩放弹入效果
    const scale = 1 + (1 - Math.min(progress * 2, 1)) * 0.6;
    const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 56px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 30;
    ctx.fillText('LEVEL UP!', 0, 0);
    // 第二层辉光
    ctx.shadowBlur = 60;
    ctx.fillText('LEVEL UP!', 0, 0);
    ctx.restore();
  }
}

// ---- "GAME OVER" 结束特效类 ----
class GameOverEffect {
  constructor() {
    this.startTime = performance.now();
    this.age = 0;
    this.duration = CONFIG.GAME_OVER_DURATION; // 1.0 秒
    this.alive = true;
  }

  update() {
    // 用 performance.now() 追踪真实墙钟时间，避免 dt clamp
    // 导致低性能设备上效果被拉长（移动端 shadowBlur 极慢）
    const elapsed = (performance.now() - this.startTime) / 1000;
    this.age = elapsed;
    if (this.age >= this.duration) {
      this.alive = false;
    }
  }

  draw(ctx, canvasWidth, canvasHeight) {
    const progress = Math.min(1, this.age / this.duration);
    // 红色闪烁脉冲，在1秒内完成4次闪烁
    const pulse = Math.sin(progress * Math.PI * 8) * 0.3 + 0.7;
    const alpha = Math.min(1, pulse);
    ctx.save();
    // 全屏红色遮罩
    ctx.fillStyle = 'rgba(255, 0, 0, ' + (alpha * 0.25) + ')';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    // 文字 — 只用一层 shadowBlur 减少移动端 GPU 压力
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 64px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 30;
    ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2);
    ctx.restore();
  }
}

// ---- 赛博朋克网格背景 ----
function drawBackground(ctx, width, height) {
  ctx.fillStyle = CONFIG.CANVAS_BG;
  ctx.fillRect(0, 0, width, height);

  // 透视网格线（微微发光）
  const gridSize = 50;
  ctx.strokeStyle = 'rgba(51, 204, 255, 0.06)';
  ctx.lineWidth = 0.5;
  ctx.shadowColor = 'rgba(51, 204, 255, 0.15)';
  ctx.shadowBlur = 1;
  ctx.beginPath();
  // 垂直线
  for (let x = gridSize; x < width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  // 水平线
  for (let y = gridSize; y < height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ---- 底部红线绘制 ----
function drawDeadLine(ctx, width, deadLineY, deadLineTimer) {
  const y = deadLineY;
  // 计算颜色渐变（1秒周期，黑红交替）
  const cycle = Math.sin(deadLineTimer * Math.PI * 2);  // -1 到 1
  const intensity = (cycle + 1) / 2;  // 0 到 1
  const r = Math.floor(255 * intensity);
  const g = Math.floor(0 * intensity);
  const b = Math.floor(0 * intensity);
  const color = `rgb(${r}, ${g}, ${b})`;

  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.globalAlpha = 0.5 + intensity * 0.4;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  // 外层大辉光
  ctx.shadowBlur = 30;
  ctx.globalAlpha = 0.2 + intensity * 0.3;
  ctx.stroke();
  // 虚线节奏线
  ctx.shadowBlur = 8;
  ctx.globalAlpha = 0.1 + intensity * 0.2;
  ctx.setLineDash([20, 60]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ---- HUD 顶栏绘制 ----
function drawHUD(ctx, width, score, level) {
  const pointsToNext = 100 - (score % 100);
  const barHeight = 52;
  const padding = 16;

  // 半透明背景条
  ctx.fillStyle = 'rgba(5, 5, 30, 0.75)';
  ctx.fillRect(0, 0, width, barHeight);
  // 底部亮线
  ctx.strokeStyle = '#33ccff';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, barHeight);
  ctx.lineTo(width, barHeight);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 左侧：分数
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#33ccff';
  ctx.shadowBlur = 8;
  ctx.fillText(formatScore(score), 50, barHeight / 2 - 4);

  // 右侧：等级 + 距下一级
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffcc00';
  ctx.textAlign = 'right';
  const levelText = 'Lv.' + level;
  const nextText = '下一级: ' + pointsToNext + ' 分';
  ctx.fillText(levelText + '  |  ' + nextText, width - padding, barHeight / 2 - 4);
  ctx.shadowBlur = 0;
}

// ============================================
// [DEBUG_VISUAL] 利刃绘制（命中效果）
// 双刃剑形：纯白三层爆亮，自然收尖
// ============================================
function drawBlade(ctx, blade) {
  const progress = blade.age / CONFIG.DEBUG_HIT_DURATION;
  // 先慢后快（ease-in）：前60%保持全亮，后40%快速淡出
  let alpha;
  if (progress < 0.6) {
    alpha = 1.0;
  } else {
    alpha = 1 - (progress - 0.6) / 0.4;
  }
  if (alpha <= 0.01) return;

  const left = blade.path.leftEdge;
  const right = blade.path.rightEdge;

  // 构建刃体路径
  const bodyPath = new Path2D();
  bodyPath.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) {
    bodyPath.lineTo(left[i].x, left[i].y);
  }
  for (let i = right.length - 1; i >= 0; i--) {
    bodyPath.lineTo(right[i].x, right[i].y);
  }
  bodyPath.closePath();

  ctx.save();
  ctx.globalAlpha = alpha;

  // === 第 0 层：外层散射辉光（最底层、最大范围）===
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 80;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill(bodyPath);

  // === 第 1 层：中层光晕 ===
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill(bodyPath);

  // === 第 2 层：刃体核心（最亮）===
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#ffffff';
  ctx.fill(bodyPath);

  // 白热核心脊线（沿中轴）
  const midPoints = [];
  for (let i = 0; i < left.length; i++) {
    midPoints.push({
      x: (left[i].x + right[i].x) / 2,
      y: (left[i].y + right[i].y) / 2
    });
  }
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(midPoints[0].x, midPoints[0].y);
  for (let i = 1; i < midPoints.length; i++) {
    ctx.lineTo(midPoints[i].x, midPoints[i].y);
  }
  ctx.stroke();

  ctx.restore();
}

// ============================================
// [DEBUG_VISUAL] 烟花绘制（未命中效果）
// 暖色小火星，原地闪烁 + 最后0.15s统一淡出
// ============================================
function drawSparks(ctx, sparkEffect) {
  const progress = sparkEffect.age / CONFIG.DEBUG_MISS_DURATION;

  for (const spark of sparkEffect.sparks) {
    // 闪烁：sin 波模拟火星跳动
    const flicker = Math.sin(sparkEffect.age * spark.flickerSpeed + spark.flickerPhase) * 0.5 + 0.5;
    let alpha = flicker;

    // 最后30%时间统一淡出
    if (progress > 0.7) {
      alpha *= 1 - (progress - 0.7) / 0.3;
    }

    if (alpha <= 0.02) continue;

    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);

    // 微弱辉光
    ctx.shadowColor = spark.color;
    ctx.shadowBlur = 3;
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
    ctx.fill();

    // 第二层更弱的扩散辉光
    ctx.shadowBlur = 6;
    ctx.globalAlpha = Math.min(1, alpha * 0.4);
    ctx.fill();

    ctx.restore();
  }
}

// ---- 渲染编排（替代原 Game.render 方法）----
function renderGame(game) {
  const ctx = game.ctx;
  // 赛博朋克网格背景
  drawBackground(ctx, game.width, game.height);

  // 底部红色死亡线
  drawDeadLine(ctx, game.width, game.deadLineY, game.deadLineTimer);

  // 绘制所有图形（后面的在上面）
  for (const shape of game.shapes) {
    shape.draw(ctx);
  }

  // 绘制浮动文字
  for (const ft of game.floatingTexts) {
    ft.draw(ctx);
  }

  // 绘制 LEVEL UP 特效
  if (game.levelUpEffect) {
    game.levelUpEffect.draw(ctx, game.width, game.height);
  }

  // 绘制 GAME OVER 特效
  if (game.gameOverEffect) {
    game.gameOverEffect.draw(ctx, game.width, game.height);
  }

  // 绘制 HUD（在所有元素之上）
  drawHUD(ctx, game.width, game.score, game.level);

  // [DEBUG_VISUAL] 调试效果：命中=银白利刃，未命中=烟花爆炸
  if (CONFIG.DEBUG_CLICK_VISUAL && game.debugEffects && game.debugEffects.length > 0) {
    for (const effect of game.debugEffects) {
      if (effect.type === 'blade') {
        drawBlade(ctx, effect);
      } else {
        drawSparks(ctx, effect);
      }
    }
  }
}
