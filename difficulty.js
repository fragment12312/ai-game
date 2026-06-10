// ==============================
// 难度系统模块 (difficulty.js)
// 数据驱动的难度曲线 —— 改一个等级只需编辑 DIFFICULTY_TABLE 的一行。
// 5 个访问器函数各自返回该行的对应字段。
// 依赖：无（仅依赖 level 参数，不依赖 CONFIG）
// ==============================

// ---- 难度数据表（Lv1 ~ Lv5）----
// Lv6+ 由 extrapolateRow() 公式外推，遵循 TCREI 规格：
//   速度每级 +0.3x（上限 4.0x）、尺寸封顶 0.55、数量封顶 10、
//   生成间隔 -50ms（下限 250ms）、漂移/变速全开。
const DIFFICULTY_TABLE = {
  1: { speed: 1.2, size: 1.2, max: 3, spawn: 800, driftProb: 0,   driftAmp: 0,  varSpdProb: 0,   varSpdRange: 0   },
  2: { speed: 1.0, size: 1.0, max: 4, spawn: 700, driftProb: 0.4, driftAmp: 30, varSpdProb: 0,   varSpdRange: 0   },
  3: { speed: 1.3, size: 0.9, max: 5, spawn: 600, driftProb: 0.7, driftAmp: 60, varSpdProb: 0,   varSpdRange: 0   },
  4: { speed: 1.6, size: 0.8, max: 6, spawn: 500, driftProb: 0.7, driftAmp: 60, varSpdProb: 0.3, varSpdRange: 0.4 },
  5: { speed: 2.0, size: 0.7, max: 7, spawn: 400, driftProb: 1.0, driftAmp: 80, varSpdProb: 1.0, varSpdRange: 0.5 },
};

// Lv6+ 线性外推规则
function extrapolateRow(level) {
  return {
    speed:   Math.min(3.5 + (level - 6) * 0.3, 4.0),
    size:    0.55,
    max:     Math.min(3 + (level - 1), 10),
    spawn:   Math.max(350 - (level - 6) * 50, 250),
    driftProb: 1.0,  driftAmp: 80,
    varSpdProb: 1.0, varSpdRange: 0.5,
  };
}

function getRow(level) {
  if (level <= 5) return DIFFICULTY_TABLE[level];
  return extrapolateRow(level);
}

// ---- 5 个瘦访问器（保持与原接口一致）----

function getSpeedScale(level) {
  return getRow(level).speed;
}

function getSizeScale(level) {
  return getRow(level).size;
}

function getMaxShapes(level) {
  return getRow(level).max;
}

function getSpawnInterval(level) {
  return getRow(level).spawn;
}

function getDifficultyParams(level) {
  const r = getRow(level);
  return {
    driftProbability: r.driftProb,
    driftAmplitude: r.driftAmp,
    varSpeedProbability: r.varSpdProb,
    varSpeedRange: r.varSpdRange,
  };
}
