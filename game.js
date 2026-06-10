// ==============================
// 游戏主类模块 (game.js)
// 只负责：初始化、游戏循环、更新逻辑
// 依赖：shape.js（ShapePool, IrregularShape）
//       renderer.js（FloatingText, LevelUpEffect, GameOverEffect, renderGame）
//       input.js（bindInputEvents）
//       CONFIG 全局对象 + 难度函数（在 index.html 中定义）
// ==============================

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.pool = new ShapePool();
    this.score = 0;
    this.level = 1;
    this.shapes = [];
    this.floatingTexts = [];
    this.levelUpEffect = null;
    this.gameOverEffect = null;
    this.spawnTimer = 0;
    this.gameOver = false;
    this.deadLineY = 0;
    this.deadLineTimer = 0;
    this.running = false;
    this.paused = false;
    this.boostNextSpawn = false;
    this.boostCooldownRemaining = 0;
    this.emptyScreenTimer = 0;
    this.debugEffects = [];            // 调试：点击效果记录

    this.handleResize();
    bindInputEvents(this);  // 输入事件由 input.js 绑定
  }

  // ---- Canvas 自适应 ----
  handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const minW = 320;
    const rawW = window.innerWidth;
    const rawH = window.innerHeight;
    const w = Math.max(minW, rawW);
    const h = Math.max(240, rawH);

    // 保持上一个宽度以修正图形位置
    const prevWidth = this.width || w;
    const prevHeight = this.height || h;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
    // 红线位置：距底部 10%
    this.deadLineY = h * (1 - CONFIG.RED_LINE_PCT);

    // resize 后修正所有图形的 x 坐标，防止越界
    if (this.shapes) {
      for (const shape of this.shapes) {
        const margin = CONFIG.AVG_RADIUS + 20;
        shape.x = Math.max(margin, Math.min(shape.x, w - margin));
        shape.y = Math.min(shape.y, h + 100);
      }
    }
  }

  // ---- 游戏结束 ----
  endGame() {
    this.gameOver = true;
    this.gameOverEffect = new GameOverEffect();
    // 存最高分到 localStorage
    const prev = parseInt(localStorage.getItem('clicker_high_score') || '0');
    if (this.score > prev) {
      localStorage.setItem('clicker_high_score', this.score);
      localStorage.setItem('clicker_high_level', this.level);
    }
  }

  // ---- 图形生成 ----
  spawnShape() {
    if (this.shapes.length >= getMaxShapes(this.level)) return;
    const shape = this.pool.acquire(this.level);
    // 清屏加速：下一个生成的图形加速下落
    if (this.boostNextSpawn) {
      shape.fallSpeed *= CONFIG.BOOST_FALL_MULTIPLIER;
      if (this.level >= 3) {
        shape.driftSpeed *= CONFIG.BOOST_DRIFT_MULTIPLIER;
        shape.varSpeedFactor *= CONFIG.BOOST_VAR_SPEED_MULTIPLIER;
      }
      this.boostNextSpawn = false;
      this.boostCooldownRemaining = this.level >= 3 ? CONFIG.BOOST_COOLDOWN : CONFIG.BOOST_COOLDOWN_LOW;
    }
    this.shapes.push(shape);
  }

  // ---- 游戏循环 ----
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    // 初始预生成一个图形，方便测试
    this.spawnShape();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  gameLoop(timestamp) {
    if (!this.running) return;

    // delta-time 计算 + clamp
    let dt = timestamp - this.lastTime;
    this.lastTime = timestamp;
    if (dt <= 0) dt = 16.67;
    dt = Math.min(dt, CONFIG.DELTA_TIME_CLAMP);
    const dtSec = dt / 1000;

    // 暂停时只渲染，不更新
    if (this.paused) {
      renderGame(this);
      requestAnimationFrame((t) => this.gameLoop(t));
      return;
    }

    // 游戏结束后只更新特效 + 渲染，不再更新图形/生成
    if (this.gameOver) {
      this.updateGameOver(dtSec);
      renderGame(this);
      requestAnimationFrame((t) => this.gameLoop(t));
      return;
    }

    this.update(dtSec);
    renderGame(this);

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  // ---- 暂停/继续 ----
  pause() {
    this.paused = true;
    document.getElementById('pauseOverlay').style.display = 'flex';
    document.getElementById('pauseBtn').innerHTML = '<i class="bi bi-play-fill" style="font-size: 18px;"></i>';
  }

  resume() {
    this.paused = false;
    document.getElementById('pauseOverlay').style.display = 'none';
    document.getElementById('pauseBtn').innerHTML = '<i class="bi bi-pause-fill" style="font-size: 18px;"></i>';
  }

  // 游戏结束后的特效计时，完成后跳转
  updateGameOver(dt) {
    if (this.gameOverEffect) {
      this.gameOverEffect.update(dt);
      if (!this.gameOverEffect.alive) {
        window.location.href = 'score.html?score=' + this.score + '&level=' + this.level;
      }
    }
  }

  update(dt) {
    // 按间隔生成图形
    this.spawnTimer += dt * 1000;
    const interval = getSpawnInterval(this.level);
    if (this.spawnTimer >= interval) {
      this.spawnTimer -= interval;
      this.spawnShape();
    }

    // 更新所有图形
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      shape.update(dt);
      // 红线触碰判定（包围盒底部 ≥ 红线 Y）
      if (shape.y + shape.bounds.radius >= this.deadLineY && !this.gameOver) {
        this.endGame();
        return;
      }
      // 超出画布底部则回收
      if (shape.isOutOfBounds(this.height)) {
        this.shapes.splice(i, 1);
        this.pool.release(shape);
      }
    }

    // 更新浮动文字
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.update(dt);
      if (!ft.alive) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 更新 LEVEL UP 特效
    if (this.levelUpEffect) {
      this.levelUpEffect.update(dt);
      if (!this.levelUpEffect.alive) {
        this.levelUpEffect = null;
      }
    }

    // 调试效果老化（仅在调试模式开启时执行，关闭时零开销）
    if (CONFIG.DEBUG_CLICK_VISUAL && this.debugEffects.length > 0) {
      for (let i = this.debugEffects.length - 1; i >= 0; i--) {
        this.debugEffects[i].age += dt;
        const maxAge = this.debugEffects[i].type === "blade" ? CONFIG.DEBUG_HIT_DURATION : CONFIG.DEBUG_MISS_DURATION;
        if (this.debugEffects[i].age >= maxAge) {
          this.debugEffects.splice(i, 1);
        }
      }
    }

    // 清屏加速冷却倒计时
    if (this.boostCooldownRemaining > 0) {
      this.boostCooldownRemaining -= dt;
      if (this.boostCooldownRemaining < 0) this.boostCooldownRemaining = 0;
    }

    // 空屏检测：屏幕无图形时计时，超过上限强制暴兵
    if (this.shapes.length === 0) {
      this.emptyScreenTimer += dt;
      if (this.emptyScreenTimer >= CONFIG.EMPTY_SCREEN_MAX) {
        const count = Math.min(this.level * 2, getMaxShapes(this.level), CONFIG.MAX_BACKUP_SPAWN);
        for (let i = 0; i < count; i++) {
          this.spawnShape();
        }
        this.emptyScreenTimer = 0;
      }
    } else {
      this.emptyScreenTimer = 0;
    }

    // 更新红线颜色计时器（1秒周期）
    this.deadLineTimer += dt;
    if (this.deadLineTimer >= 1.0) {
      this.deadLineTimer -= 1.0;
    }
  }
}
