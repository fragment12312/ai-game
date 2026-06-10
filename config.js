// ==============================
// 游戏配置模块 (config.js)
// 所有可调参数集中于此。发布时将 DEBUG_CLICK_VISUAL 改为 false。
// ==============================
const CONFIG = {
  CANVAS_BG: '#0a0a1a',
  BASE_FALL_SPEED: 120,       // 像素/秒 (Lv1)
  SPAWN_INTERVAL: 800,        // 毫秒 (Lv1)
  MAX_SHAPES: 3,              // Lv1 同时存在最大图形数
  AVG_RADIUS: 45,             // Lv1 图形顶点半径均值（像素）
  MIN_VERTICES: 4,
  MAX_VERTICES: 8,
  SHAPE_COLORS: [
    '#ff3366', '#ff6633', '#ffcc00', '#33ff66',
    '#33ccff', '#cc33ff', '#ff3399', '#66ff33',
    '#ff9900', '#00ffcc', '#ff66cc', '#9933ff'
  ],
  GLOW_SHADOW_BLUR: 12,
  FLOAT_TEXT_DURATION: 0.5,   // 秒
  LEVEL_UP_DURATION: 1.0,     // 秒
  DELTA_TIME_CLAMP: 50,       // ms 上限
  MOUSE_TOLERANCE: 5,         // px，鼠标点击基础容差
  TOUCH_TOLERANCE: 10,        // px，移动端 fat finger 容差
  LEVEL_TOLERANCE_BOOST: 2,   // Lv4+ 每级额外容差（px），补偿图形缩小
  HIT_AREA_SCALE: 1.2,        // 判定区扩大倍率（1.0=原始判定，1.2=扩大20%）
  POOL_MAX: 15,               // 对象池最大容量
  RED_LINE_PCT: 0.10,         // 红线距底部 10%
  GAME_OVER_DURATION: 1.0,    // 秒
  BOOST_FALL_MULTIPLIER: 2.0,   // 清屏加速：下落速度倍率
  BOOST_DRIFT_MULTIPLIER: 1.5,  // 清屏加速：漂移倍率（Lv3+）
  BOOST_VAR_SPEED_MULTIPLIER: 1.5, // 清屏加速：变速因子倍率（Lv3+）
  BOOST_COOLDOWN: 2.0,          // 清屏加速冷却时间（秒），Lv3+
  BOOST_COOLDOWN_LOW: 0.5,      // 清屏加速冷却时间（秒），Lv1-2
  EMPTY_SCREEN_MAX: 1.5,        // 空屏兜底最大时间（秒）
  MAX_BACKUP_SPAWN: 8,          // 兜底暴兵数量上限
  // ---- 调试开关 ----
  // 将 DEBUG_CLICK_VISUAL 改为 false 可关闭所有点击可视化。
  // 发布时如需彻底删除调试代码，搜索 "[DEBUG_VISUAL]" 即可定位到：
  //   config.js       : 调试配置项
  //   game.js         : debugEffects 初始化 + 老化逻辑
  //   debug-effects.js: 特效生成函数（可整文件删除）
  //   input.js        : processHit() 中的效果生成调用
  //   renderer.js     : drawBlade() / drawSparks() / renderGame() 遍历
  DEBUG_CLICK_VISUAL: true,     // 点击可视化总开关（发布时改为 false）
  DEBUG_HIT_DURATION: 0.5,      // 命中利刃消失时间（秒），先慢后快
  DEBUG_MISS_DURATION: 0.5,     // 未命中烟花消失时间（秒），闪烁式
  DEBUG_MISS_SPREAD: 8,         // 烟花粒子扩散半径（像素）
};
