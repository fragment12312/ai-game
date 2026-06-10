// ==============================
// 图形领域模块 (shape.js)
// 包含：对象池、不规则图形类、图形工具函数
// 依赖：CONFIG 全局对象、难度函数（getSizeScale, getSpeedScale, getDifficultyParams）
//       这些函数在 index.html 的内联 <script> 中定义，本文件需在其后加载
// ==============================

// ---- 图形工具函数 ----

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateIrregularPolygon(cx, cy, avgRadius, vertices) {
  const points = [];
  for (let i = 0; i < vertices; i++) {
    const angle = (i / vertices) * Math.PI * 2;
    const r = avgRadius * (0.5 + Math.random() * 0.8);
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r
    });
  }
  return points;
}

function computeBounds(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    radius: Math.max(maxX - minX, maxY - minY) / 2
  };
}

// ---- 对象池 ----

class ShapePool {
  constructor() {
    this.available = [];
  }

  acquire(level) {
    let shape;
    if (this.available.length > 0) {
      shape = this.available.pop();
      shape.reset(level);
    } else {
      shape = new IrregularShape(level);
    }
    return shape;
  }

  release(shape) {
    if (this.available.length < CONFIG.POOL_MAX) {
      this.available.push(shape);
    }
  }
}

// ---- 不规则图形类 ----

class IrregularShape {
  constructor(level) {
    this.reset(level);
  }

  // 对象池复用时重置属性
  reset(level) {
    const minW = 320;
    const w = Math.max(minW, window.innerWidth);
    const avgRadius = CONFIG.AVG_RADIUS * getSizeScale(level);
    this.vertices = randomInt(CONFIG.MIN_VERTICES, CONFIG.MAX_VERTICES);
    this.points = generateIrregularPolygon(0, 0, avgRadius, this.vertices);
    // 随机起始位置（不超出画布边界）
    const margin = avgRadius + 20;
    this.x = margin + Math.random() * (w - margin * 2);
    this.y = -avgRadius - Math.random() * 100;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 4; // 弧度/秒
    this.color = CONFIG.SHAPE_COLORS[randomInt(0, CONFIG.SHAPE_COLORS.length - 1)];
    this.fallSpeed = CONFIG.BASE_FALL_SPEED * getSpeedScale(level);
    // 漂移参数
    const diff = getDifficultyParams(level);
    this.hasDrift = Math.random() < diff.driftProbability;
    this.driftSpeed = this.hasDrift
      ? (Math.random() - 0.5) * 2 * diff.driftAmplitude
      : 0;
    this.hasVariableSpeed = Math.random() < diff.varSpeedProbability;
    this.varSpeedFactor = this.hasVariableSpeed
      ? 1 + (Math.random() - 0.5) * 2 * diff.varSpeedRange
      : 1;
    // 包围盒中心
    this.bounds = computeBounds(this.points);
    this.cx = this.bounds.cx;
    this.cy = this.bounds.cy;
    this._hitPoints = null;       // 清除判定区缓存（input.js 下次调用时重算）
    this._hitPointsScale = null;
    this.alive = true;
  }

  update(dt) {
    const effectiveSpeed = this.fallSpeed * (this.hasVariableSpeed ? this.varSpeedFactor : 1);
    this.y += effectiveSpeed * dt;
    this.x += this.driftSpeed * dt;
    this.rotation += this.rotationSpeed * dt;
  }

  // 获取当前旋转后的世界坐标顶点
  getWorldVertices() {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    return this.points.map(p => ({
      x: this.x + (p.x - this.cx) * cos - (p.y - this.cy) * sin,
      y: this.y + (p.x - this.cx) * sin + (p.y - this.cy) * cos
    }));
  }

  draw(ctx) {
    const verts = this.getWorldVertices();
    ctx.save();
    // 多层辉光
    ctx.shadowColor = this.color;
    ctx.shadowBlur = CONFIG.GLOW_SHADOW_BLUR;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();
    ctx.fill();
    // 第二层辉光
    ctx.shadowBlur = CONFIG.GLOW_SHADOW_BLUR * 1.8;
    ctx.shadowColor = this.color;
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.restore();
  }

  // 判断图形是否完全离开画布底部
  isOutOfBounds(canvasHeight) {
    const verts = this.getWorldVertices();
    let maxY = -Infinity;
    for (const v of verts) {
      if (v.y > maxY) maxY = v.y;
    }
    return maxY < -50 || this.y - this.bounds.radius > canvasHeight + 50;
  }
}
