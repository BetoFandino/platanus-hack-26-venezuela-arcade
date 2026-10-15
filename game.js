// Platanus Hack 26 — Caracas Edition
// Asedio Orbital: vertical scrolling shoot-'em-up. Advance through squadrons, down bosses, survive.

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// The cabinet screen is landscape, so the shooter lane runs vertically
// through the middle of it, with HUD panels on either side.
const PF_LEFT = 240;
const PF_RIGHT = 560;
const PF_TOP = 54;
const PF_BOTTOM = 560;
const PF_CENTER_X = (PF_LEFT + PF_RIGHT) / 2;

const STORAGE_KEY = 'platanus-hack-26-libre-guacamaya-scores';
const MAX_HIGH_SCORES = 5;
const NAME_LENGTH = 3;
const START_LIVES = 3;
const START_MISSILES = 3;
const MAX_MISSILES = 5;
const MAX_PLAYER_BULLETS = 9;
const MAX_ENEMY_BULLETS = 16;
const MAX_SQUAD_ONSCREEN = 8;
const BOSS_WAVE_EVERY = 3;

const COLORS = {
  backdrop: 0x03040a,
  panel: 0x0c1226,
  panelBorder: 0x24305c,
  frame: 0x2a3a6b,
  star: 0xcfe36b,
  cloud: 0x2f6b3a,
  player: 0xe8392e,
  playerBlue: 0x2e6fe8,
  playerYellow: 0xffd23f,
  playerBullet: 0xe8d9a0,
  enemyBullet: 0x8a7a63,
  grunt: 0x4a4038,
  shooter: 0x3a3328,
  tank: 0x2e2820,
  zamuroHead: 0xb33a2e,
  explosion: 0xffc93d,
  pickup: 0x7ed957,
  supply: 0xffd23f,
  white: 0xf2f7ff,
  textDim: '#7d8ac2',
  textBright: '#f2f7ff',
  accent: '#ffd23f',
  accentNum: 0xffd23f,
  danger: '#e8392e',
};

const ENEMY_TYPES = {
  grunt: { texture: 'tex_grunt', hp: 1, points: 15, color: COLORS.grunt, radius: 11 },
  shooter: { texture: 'tex_shooter', hp: 2, points: 25, color: COLORS.shooter, radius: 13 },
  tank: { texture: 'tex_tank', hp: 3, points: 60, color: COLORS.tank, radius: 15 },
};

const THEME_ORDER = ['jungle', 'dunes', 'city'];

const THEMES = {
  jungle: {
    terrainTexture: 'tex_leaf',
    terrainScaleMin: 0.9,
    terrainScaleMax: 1.6,
    starTint: 0xffffff,
    starAlphaScale: 0.1,
  },
  dunes: {
    terrainTexture: 'tex_dune',
    terrainScaleMin: 0.9,
    terrainScaleMax: 1.5,
    starTint: 0xfff4d9,
    starAlphaScale: 0.12,
  },
  city: {
    terrainTexture: 'tex_cloud',
    terrainTint: 0x8a9ac0,
    terrainScaleMin: 1,
    terrainScaleMax: 1.8,
    starTint: 0xffe6a0,
    starAlphaScale: 1,
  },
  cityDayMenu: {
    terrainTexture: 'tex_cloud',
    terrainTint: 0xeaf2ff,
    terrainScaleMin: 1,
    terrainScaleMax: 1.8,
    starTint: 0xffffff,
    starAlphaScale: 0.1,
  },
};

const BOSS_CONFIG = {
  texture: 'tex_boss_plane',
  color: 0x6b7280,
  label: 'CAZADORES',
  defeatedLabel: 'CAZADORES DERROTADOS',
  attackPool: ['spread', 'aimed', 'spread', 'sweep'],
};

function getWaveTheme(wave) {
  const cycle = Math.ceil(wave / BOSS_WAVE_EVERY);
  return THEME_ORDER[(cycle - 1) % THEME_ORDER.length];
}

function applyTheme(scene, themeName) {
  if (scene.currentTheme === themeName) {
    return;
  }
  scene.currentTheme = themeName;
  const theme = THEMES[themeName];
  drawBackdrop(scene, themeName);
  for (const star of scene.stars) {
    star.setTint(theme.starTint);
    star.setAlpha(star.baseAlpha * theme.starAlphaScale);
  }
  for (const cloud of scene.terrain) {
    cloud.setTexture(theme.terrainTexture);
    if (theme.terrainTint) {
      cloud.setTint(theme.terrainTint);
    } else {
      cloud.clearTint();
    }
    cloud.setScale(Phaser.Math.FloatBetween(theme.terrainScaleMin, theme.terrainScaleMax));
  }
}

const LETTER_GRID = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', '.', '-'],
  ['DEL', 'END'],
];

// DO NOT replace existing keys — they match the physical arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d'],
  P1_1: ['u'],
  P1_2: ['i'],
  P1_3: ['o'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter'],
  START2: ['2'],
};

const KEYBOARD_TO_ARCADE = {};
for (const [arcadeCode, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) {
    KEYBOARD_TO_ARCADE[normalizeIncomingKey(key)] = arcadeCode;
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-root',
  backgroundColor: '#05060d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: {
    preload,
    create,
    update,
  },
};

new Phaser.Game(config);

function preload() {}

function create() {
  const scene = this;

  scene.state = {
    phase: 'loading',
    score: 0,
    wave: 1,
    waveType: 'squad',
    lives: START_LIVES,
    missiles: START_MISSILES,
    highScores: [],
    saveStatus: 'Cargando puntajes...',
    waveClearing: false,
    musicStarted: false,
    squad: null,
    supplyTimer: 9000,
    gameOverReadyAt: 0,
    menu: { cursor: 0, cooldown: 0, lastAxis: 0 },
    nameEntry: {
      qualifies: false,
      letters: [],
      row: 0,
      col: 0,
      moveCooldownUntil: 0,
      confirmCooldownUntil: 0,
      lastMoveVector: { x: 0, y: 0 },
    },
  };

  scene.boss = null;
  scene.supplyDrop = null;

  createNoiseBuffer(scene);
  createTextures(scene);
  createBackground(scene);
  createStarfield(scene);
  createTerrain(scene);
  applyTheme(scene, getWaveTheme(scene.state.wave));
  createPlayfieldFrame(scene);
  createHud(scene);
  createPlayer(scene);
  createEndGameUi(scene);
  createStartScreen(scene);
  createLeaderboardScreen(scene);
  createControlsScreen(scene);
  createPauseScreen(scene);
  createControls(scene);

  scene.bulletsPlayer = [];
  scene.bulletsEnemy = [];
  scene.enemies = [];
  scene.pickups = [];

  showStartScreen(scene);

  loadHighScores()
    .then((highScores) => {
      scene.state.highScores = highScores;
      scene.state.saveStatus = 'Marca tu puntaje al terminar la partida.';
      refreshLeaderboard(scene);
      refreshStartScreenLeaderboard(scene);
    })
    .catch(() => {
      scene.state.highScores = [];
      scene.state.saveStatus = 'Almacenamiento no disponible.';
      refreshLeaderboard(scene);
      refreshStartScreenLeaderboard(scene);
    });
}

function update(time, delta) {
  const scene = this;
  if (!scene.state) {
    return;
  }

  const phase = scene.state.phase;

  if (phase !== 'paused') {
    updateStarfield(scene, delta);
    updateTerrain(scene, delta);
  }

  if (phase === 'start') {
    handleStartMenu(scene, time);
    return;
  }

  if (phase === 'leaderboard') {
    if (consumeAnyPressedControl(scene, ['START1', 'P1_1', 'P1_2'])) {
      scene.leaderScreen.container.setVisible(false);
      showStartScreen(scene);
    }
    return;
  }

  if (phase === 'controls') {
    if (consumeAnyPressedControl(scene, ['START1', 'P1_1', 'P1_2'])) {
      scene.controlsScreen.container.setVisible(false);
      showStartScreen(scene);
    }
    return;
  }

  if (phase === 'playing') {
    updatePlayer(scene, time, delta);
    updateEnemies(scene, time, delta);
    updateSquadronSpawner(scene, time, delta);
    updateSupplyDrop(scene, time, delta);
    updateBullets(scene, delta);
    updatePickups(scene, delta);
    checkCollisions(scene, time);
    maybeFinishWave(scene, time);
    refreshHud(scene);
    if (scene.state.phase === 'playing' && consumeAnyPressedControl(scene, ['START1'])) {
      pauseGame(scene);
    }
    return;
  }

  if (phase === 'paused') {
    if (consumeAnyPressedControl(scene, ['START1'])) {
      resumeGame(scene);
    }
    return;
  }

  if (phase === 'gameover') {
    if (scene.state.nameEntry.qualifies) {
      handleNameEntry(scene, time);
    } else if (time >= scene.state.gameOverReadyAt && consumeAnyPressedControl(scene, ['START1', 'P1_1', 'P1_2'])) {
      returnToStart(scene);
    }
    return;
  }

  if (phase === 'saved') {
    if (time >= scene.state.gameOverReadyAt && consumeAnyPressedControl(scene, ['START1', 'P1_1', 'P1_2'])) {
      returnToStart(scene);
    }
  }
}

// ---------------------------------------------------------------------------
// Procedural textures & background
// ---------------------------------------------------------------------------

function createTextures(scene) {
  const g = scene.add.graphics();

  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('tex_dot', 8, 8);

  // Guacamaya: flat tricolor silhouette — red body with a small oval head,
  // beak and eye, mirrored wings (blue root, yellow band, four torn-feather
  // blue tips) and a three-feather tail with blue tips. Facing: up.
  // Note: fillEllipse takes width/height, not radii.
  g.clear();
  g.fillStyle(COLORS.player, 1);
  g.fillEllipse(28, 23, 13, 27);
  g.fillPoints([{ x: 25, y: 33 }, { x: 31, y: 33 }, { x: 29, y: 45 }, { x: 28, y: 49 }, { x: 27, y: 45 }], true);
  g.fillPoints([{ x: 21, y: 33 }, { x: 26, y: 34 }, { x: 23, y: 43 }, { x: 21, y: 41 }], true);
  g.fillPoints([{ x: 35, y: 33 }, { x: 30, y: 34 }, { x: 33, y: 43 }, { x: 35, y: 41 }], true);
  g.fillEllipse(28, 8, 10, 11);
  g.fillStyle(0xf4594a, 1);
  g.fillEllipse(25.5, 20, 3.6, 16);
  g.fillStyle(0x3a2a1f, 1);
  g.fillTriangle(25.5, 4, 30.5, 4, 28, 0);
  g.fillStyle(0x1a1a1a, 1);
  g.fillCircle(30.3, 7.5, 0.8);
  g.fillStyle(COLORS.playerBlue, 1);
  g.fillPoints([{ x: 27, y: 44 }, { x: 29, y: 44 }, { x: 28, y: 49 }], true);
  g.fillPoints([{ x: 21.5, y: 40 }, { x: 24, y: 41 }, { x: 22, y: 45 }], true);
  g.fillPoints([{ x: 34.5, y: 40 }, { x: 32, y: 41 }, { x: 34, y: 45 }], true);
  g.fillPoints([{ x: 22, y: 12 }, { x: 14, y: 11 }, { x: 14, y: 21 }, { x: 23, y: 21 }], true);
  g.fillPoints([{ x: 34, y: 12 }, { x: 42, y: 11 }, { x: 42, y: 21 }, { x: 33, y: 21 }], true);
  g.fillStyle(COLORS.playerYellow, 1);
  g.fillPoints([{ x: 14, y: 11 }, { x: 8, y: 11 }, { x: 9, y: 22 }, { x: 14, y: 21 }], true);
  g.fillPoints([{ x: 42, y: 11 }, { x: 48, y: 11 }, { x: 47, y: 22 }, { x: 42, y: 21 }], true);
  g.fillStyle(COLORS.playerBlue, 1);
  g.fillPoints([
    { x: 8, y: 11 }, { x: 1, y: 9 }, { x: 4, y: 13 }, { x: 0, y: 13 }, { x: 3, y: 16 },
    { x: 0, y: 18 }, { x: 3, y: 21 }, { x: 1, y: 24 }, { x: 6, y: 23 }, { x: 9, y: 22 },
  ], true);
  g.fillPoints([
    { x: 48, y: 11 }, { x: 55, y: 9 }, { x: 52, y: 13 }, { x: 56, y: 13 }, { x: 53, y: 16 },
    { x: 56, y: 18 }, { x: 53, y: 21 }, { x: 55, y: 24 }, { x: 50, y: 23 }, { x: 47, y: 22 },
  ], true);
  g.generateTexture('tex_ship', 56, 50);

  // Zamuro chico — dark body, pale "finger" wingtip feathers, bare pinkish
  // head and hooked beak. Default facing: down (dives beak-first).
  g.clear();
  g.fillStyle(COLORS.grunt, 1);
  g.fillPoints([{ x: 13, y: 4 }, { x: 17, y: 4 }, { x: 15, y: 0 }], true);
  g.fillEllipse(15, 10, 4, 6);
  g.fillPoints([{ x: 12, y: 7 }, { x: 5, y: 7 }, { x: 1, y: 6 }, { x: 3, y: 9 }, { x: 0, y: 11 }, { x: 4, y: 11 }, { x: 12, y: 11 }], true);
  g.fillPoints([{ x: 18, y: 7 }, { x: 25, y: 7 }, { x: 29, y: 6 }, { x: 27, y: 9 }, { x: 30, y: 11 }, { x: 26, y: 11 }, { x: 18, y: 11 }], true);
  g.fillStyle(0x8a7a6a, 1);
  g.fillPoints([{ x: 3, y: 9 }, { x: 1, y: 6 }, { x: 0, y: 11 }], true);
  g.fillPoints([{ x: 27, y: 9 }, { x: 29, y: 6 }, { x: 30, y: 11 }], true);
  g.fillStyle(COLORS.zamuroHead, 1);
  g.fillCircle(15, 15, 3);
  g.fillStyle(0x2a1f1a, 1);
  g.fillPoints([{ x: 13, y: 17 }, { x: 17, y: 17 }, { x: 15, y: 20 }], true);
  g.generateTexture('tex_grunt', 30, 21);

  // Zamuro mediano — broader wingspan.
  g.clear();
  g.fillStyle(COLORS.shooter, 1);
  g.fillPoints([{ x: 16, y: 5 }, { x: 21, y: 5 }, { x: 19, y: 0 }], true);
  g.fillEllipse(19, 13, 5, 8);
  g.fillPoints([{ x: 15, y: 9 }, { x: 6, y: 9 }, { x: 1, y: 8 }, { x: 4, y: 11 }, { x: 0, y: 14 }, { x: 5, y: 14 }, { x: 15, y: 14 }], true);
  g.fillPoints([{ x: 23, y: 9 }, { x: 31, y: 9 }, { x: 36, y: 8 }, { x: 34, y: 11 }, { x: 38, y: 14 }, { x: 33, y: 14 }, { x: 23, y: 14 }], true);
  g.fillStyle(0x8a7a6a, 1);
  g.fillPoints([{ x: 4, y: 11 }, { x: 1, y: 8 }, { x: 0, y: 14 }], true);
  g.fillPoints([{ x: 34, y: 11 }, { x: 36, y: 8 }, { x: 38, y: 14 }], true);
  g.fillStyle(0x56493c, 1);
  g.fillEllipse(19, 17, 6, 3);
  g.fillStyle(COLORS.zamuroHead, 1);
  g.fillCircle(19, 19, 4);
  g.fillStyle(0x2a1f1a, 1);
  g.fillPoints([{ x: 16, y: 21 }, { x: 21, y: 21 }, { x: 19, y: 25 }], true);
  g.generateTexture('tex_shooter', 38, 26);

  // Zamuro grande — bulky leader, widest wingspan.
  g.clear();
  g.fillStyle(COLORS.tank, 1);
  g.fillPoints([{ x: 21, y: 6 }, { x: 27, y: 6 }, { x: 24, y: 0 }], true);
  g.fillEllipse(24, 16, 6, 10);
  g.fillPoints([{ x: 19, y: 11 }, { x: 8, y: 11 }, { x: 2, y: 10 }, { x: 5, y: 14 }, { x: 0, y: 18 }, { x: 6, y: 18 }, { x: 19, y: 18 }], true);
  g.fillPoints([{ x: 29, y: 11 }, { x: 40, y: 11 }, { x: 46, y: 10 }, { x: 43, y: 14 }, { x: 48, y: 18 }, { x: 42, y: 18 }, { x: 29, y: 18 }], true);
  g.fillStyle(0x8a7a6a, 1);
  g.fillPoints([{ x: 5, y: 14 }, { x: 2, y: 10 }, { x: 0, y: 18 }], true);
  g.fillPoints([{ x: 43, y: 14 }, { x: 46, y: 10 }, { x: 48, y: 18 }], true);
  g.fillStyle(0x1a1510, 1);
  g.fillEllipse(24, 21, 8, 4);
  g.fillStyle(COLORS.zamuroHead, 1);
  g.fillCircle(24, 24, 5);
  g.fillStyle(0x2a1f1a, 1);
  g.fillPoints([{ x: 21, y: 27 }, { x: 27, y: 27 }, { x: 24, y: 32 }], true);
  g.generateTexture('tex_tank', 48, 32);

  // Boss: avion con cazadores — rounded camo fuselage, glass cockpit,
  // two helmeted hunters leaning out the side door, swept wings, a
  // tail fin and a front propeller with a gold spinner cone.
  g.clear();
  g.fillStyle(0x556b2f, 1);
  g.fillRoundedRect(50, 20, 20, 70, 8);
  g.fillStyle(0x87ceeb, 1);
  g.fillRoundedRect(53, 30, 14, 20, 4);
  g.fillStyle(0x2a2d1a, 1);
  g.fillRoundedRect(57, 52, 18, 21, 3);
  g.fillRoundedRect(72, 57, 16, 18, 3);
  g.fillStyle(0x228b22, 1);
  g.fillRect(60, 55, 12, 15);
  g.fillStyle(0x006400, 1);
  g.fillCircle(66, 55, 6);
  g.fillStyle(0x228b22, 1);
  g.fillRect(75, 60, 10, 12);
  g.fillStyle(0x006400, 1);
  g.fillCircle(80, 60, 5);
  g.fillStyle(0x556b2f, 1);
  g.fillRect(10, 45, 40, 20);
  g.fillRect(70, 45, 40, 20);
  g.fillStyle(0x8b4513, 1);
  g.fillTriangle(60, 88, 44, 118, 76, 118);
  g.fillStyle(0x333333, 1);
  g.fillRect(58, 5, 4, 20);
  g.fillRect(48, 12, 24, 4);
  g.fillStyle(0xffd700, 1);
  g.fillCircle(60, 15, 6);
  g.generateTexture('tex_boss_plane', 120, 120);

  // Semilla de girasol — player shot.
  g.clear();
  g.fillStyle(COLORS.playerBullet, 1);
  g.fillEllipse(3, 7, 5, 13);
  g.fillStyle(0x4a3621, 1);
  g.fillTriangle(0, 0, 6, 0, 3, 4);
  g.generateTexture('tex_seed', 6, 14);

  // Piedra — enemy shot.
  g.clear();
  g.fillStyle(COLORS.enemyBullet, 1);
  g.fillPoints([
    { x: 4, y: 0 }, { x: 9, y: 2 }, { x: 10, y: 7 }, { x: 6, y: 10 }, { x: 1, y: 8 }, { x: 0, y: 3 },
  ], true);
  g.generateTexture('tex_rock', 10, 10);

  // Supply icon — eighth note (recarga de chillido).
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(4, 12, 4, 3);
  g.fillRect(7, 2, 2, 10);
  g.fillTriangle(9, 2, 9, 7, 13, 5);
  g.generateTexture('tex_supply', 14, 16);

  // Jungle canopy clump — irregular cluster of overlapping leaf blobs.
  g.clear();
  g.fillStyle(0x234d2a, 1);
  g.fillCircle(10, 10, 9);
  g.fillCircle(2, 14, 7);
  g.fillCircle(18, 15, 8);
  g.fillCircle(9, 20, 7);
  g.fillStyle(0x3a7a44, 1);
  g.fillCircle(8, 7, 5);
  g.fillCircle(16, 12, 4);
  g.generateTexture('tex_leaf', 26, 28);

  // Cloud — soft cluster of overlapping puffs, tinted per time of day.
  g.clear();
  g.fillStyle(0xd6dce8, 1);
  g.fillCircle(10, 10, 9);
  g.fillCircle(2, 13, 7);
  g.fillCircle(19, 13, 7);
  g.fillCircle(9, 17, 7);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 7, 5);
  g.fillCircle(15, 11, 4);
  g.generateTexture('tex_cloud', 26, 24);

  // Dune ripple / rock cluster — scrolling desert terrain.
  g.clear();
  g.fillStyle(0xc99a5c, 1);
  g.fillEllipse(12, 16, 12, 6);
  g.fillEllipse(4, 18, 7, 4);
  g.fillEllipse(20, 18, 8, 4);
  g.fillStyle(0xa9743a, 1);
  g.fillEllipse(12, 12, 7, 4);
  g.generateTexture('tex_dune', 24, 20);

  // Frutas variadas — power-up pickup.
  g.clear();
  g.fillStyle(0x3f9d4a, 1);
  g.fillTriangle(6, 0, 10, 0, 8, 4);
  g.fillStyle(0xe8495a, 1);
  g.fillCircle(8, 10, 6);
  g.fillStyle(0xf2a8b0, 0.6);
  g.fillCircle(6, 8, 2);
  g.generateTexture('tex_fruit_a', 16, 17);

  g.clear();
  g.fillStyle(0x3f9d4a, 1);
  g.fillTriangle(6, 0, 10, 0, 8, 4);
  g.fillStyle(0xff9e3d, 1);
  g.fillCircle(8, 10, 6);
  g.fillStyle(0xffc98a, 0.6);
  g.fillCircle(6, 8, 2);
  g.generateTexture('tex_fruit_b', 16, 17);

  g.clear();
  g.fillStyle(0x3f9d4a, 1);
  g.fillTriangle(9, 0, 13, 0, 11, 4);
  g.fillStyle(0x8a4fd6, 1);
  g.fillCircle(6, 11, 4.5);
  g.fillCircle(14, 10, 4.5);
  g.fillCircle(10, 16, 4.5);
  g.generateTexture('tex_fruit_c', 20, 21);

  g.destroy();
}

function createNoiseBuffer(scene) {
  const ctx = scene.sound.context;
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  scene.noiseBuffer = buffer;
}

function createBackground(scene) {
  scene.bgGraphics = scene.add.graphics().setDepth(0);
}

function drawBackdrop(scene, themeName) {
  const g = scene.bgGraphics;
  const bandH = 100;
  g.clear();

  if (themeName === 'jungle') {
    const bands = [0x2a6bb8, 0x4a90d9, 0x6bb0e8, 0x9ad0ee, 0xc5e8d8, 0xe8f0d0];
    bands.forEach((color, i) => {
      g.fillStyle(color, 1);
      g.fillRect(0, i * bandH, GAME_WIDTH, bandH);
    });

    g.fillStyle(0xfff6d9, 0.9);
    g.fillCircle(630, 110, 32);

    g.fillStyle(0x6a9a92, 1);
    g.fillPoints([
      { x: 0, y: 430 }, { x: 90, y: 360 }, { x: 180, y: 410 }, { x: 260, y: 340 }, { x: 360, y: 400 },
      { x: 460, y: 350 }, { x: 560, y: 410 }, { x: 650, y: 355 }, { x: 740, y: 405 }, { x: 800, y: 380 },
      { x: 800, y: 460 }, { x: 0, y: 460 },
    ], true);

    g.fillStyle(0x8a7a5a, 1);
    g.fillPoints([{ x: 400, y: 330 }, { x: 356, y: 422 }, { x: 444, y: 422 }], true);
    g.fillStyle(0x6a5a3e, 1);
    g.fillRect(368, 400, 64, 22);
    g.fillRect(380, 378, 40, 22);
    g.fillRect(392, 356, 16, 22);

    g.fillStyle(0x15391c, 1);
    g.fillPoints([
      { x: 0, y: 600 }, { x: 0, y: 470 }, { x: 50, y: 500 }, { x: 90, y: 440 }, { x: 140, y: 490 },
      { x: 190, y: 430 }, { x: 240, y: 480 }, { x: 300, y: 440 }, { x: 350, y: 480 }, { x: 400, y: 450 },
      { x: 450, y: 480 }, { x: 500, y: 440 }, { x: 560, y: 490 }, { x: 610, y: 430 }, { x: 660, y: 480 },
      { x: 710, y: 440 }, { x: 760, y: 490 }, { x: 800, y: 460 }, { x: 800, y: 600 },
    ], true);
  } else if (themeName === 'dunes') {
    const bands = [0x3a7fc9, 0x6bb0e8, 0x9ad0ee, 0xd9e8cc, 0xf0d9a0, 0xf7c873];
    bands.forEach((color, i) => {
      g.fillStyle(color, 1);
      g.fillRect(0, i * bandH, GAME_WIDTH, bandH);
    });

    g.fillStyle(0xfff2cc, 0.85);
    g.fillCircle(220, 100, 34);

    g.fillStyle(0xd9b26a, 1);
    g.fillPoints([
      { x: 0, y: 380 }, { x: 100, y: 340 }, { x: 200, y: 370 }, { x: 320, y: 330 }, { x: 440, y: 365 },
      { x: 560, y: 325 }, { x: 680, y: 360 }, { x: 800, y: 335 }, { x: 800, y: 460 }, { x: 0, y: 460 },
    ], true);

    g.fillStyle(0xa9743a, 1);
    g.fillPoints([
      { x: 0, y: 600 }, { x: 0, y: 480 }, { x: 80, y: 450 }, { x: 180, y: 490 }, { x: 280, y: 440 },
      { x: 380, y: 480 }, { x: 450, y: 450 }, { x: 550, y: 490 }, { x: 650, y: 445 }, { x: 750, y: 485 },
      { x: 800, y: 460 }, { x: 800, y: 600 },
    ], true);

    g.fillStyle(0x5c3f24, 1);
    [120, 320, 520, 700].forEach((bx) => {
      g.fillCircle(bx, 520, 6);
      g.fillCircle(bx - 8, 524, 4);
      g.fillCircle(bx + 8, 524, 4);
    });
  } else if (themeName === 'city') {
    const bands = [0x0d0a1f, 0x15123a, 0x241b4a, 0x3a2550, 0x5a3350, 0x7a4550];
    bands.forEach((color, i) => {
      g.fillStyle(color, 1);
      g.fillRect(0, i * bandH, GAME_WIDTH, bandH);
    });

    g.fillStyle(0xffe6a0, 0.45);
    g.fillCircle(180, 100, 26);

    g.fillStyle(0x2a2a3e, 1);
    g.fillPoints([
      { x: 0, y: 430 }, { x: 90, y: 370 }, { x: 180, y: 415 }, { x: 260, y: 350 }, { x: 360, y: 405 },
      { x: 460, y: 355 }, { x: 560, y: 410 }, { x: 650, y: 360 }, { x: 740, y: 400 }, { x: 800, y: 385 },
      { x: 800, y: 460 }, { x: 0, y: 460 },
    ], true);

    g.fillStyle(0x15121f, 1);
    g.fillRect(388, 330, 24, 130);
    g.fillTriangle(380, 330, 420, 330, 400, 305);
    g.fillStyle(0xffe6a0, 1);
    g.fillCircle(400, 352, 7);

    g.fillStyle(0x12111c, 1);
    const buildingX = [20, 70, 120, 170, 230, 300, 460, 520, 580, 640, 700, 760];
    const buildingH = [90, 130, 70, 150, 100, 60, 70, 120, 90, 160, 100, 80];
    buildingX.forEach((bx, i) => {
      g.fillRect(bx, 600 - buildingH[i], 42, buildingH[i]);
    });
    g.fillStyle(0xffe6a0, 0.85);
    for (let i = 0; i < 22; i += 1) {
      g.fillRect(Phaser.Math.Between(20, 790), Phaser.Math.Between(470, 590), 4, 5);
    }
  } else {
    const bands = [0x2a6bb8, 0x4a90d9, 0x6bb0e8, 0x9ad0ee, 0xc5e8f2, 0xe8f5ff];
    bands.forEach((color, i) => {
      g.fillStyle(color, 1);
      g.fillRect(0, i * bandH, GAME_WIDTH, bandH);
    });

    g.fillStyle(0xfff6d9, 0.9);
    g.fillCircle(600, 100, 32);

    g.fillStyle(0x6a8aa2, 1);
    g.fillPoints([
      { x: 0, y: 430 }, { x: 90, y: 370 }, { x: 180, y: 415 }, { x: 260, y: 350 }, { x: 360, y: 405 },
      { x: 460, y: 355 }, { x: 560, y: 410 }, { x: 650, y: 360 }, { x: 740, y: 400 }, { x: 800, y: 385 },
      { x: 800, y: 460 }, { x: 0, y: 460 },
    ], true);

    g.fillStyle(0x242840, 1);
    g.fillRect(388, 330, 24, 130);
    g.fillTriangle(380, 330, 420, 330, 400, 305);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(400, 352, 7);

    g.fillStyle(0x1a1d2c, 1);
    const buildingX = [20, 70, 120, 170, 230, 300, 460, 520, 580, 640, 700, 760];
    const buildingH = [90, 130, 70, 150, 100, 60, 70, 120, 90, 160, 100, 80];
    buildingX.forEach((bx, i) => {
      g.fillRect(bx, 600 - buildingH[i], 42, buildingH[i]);
    });
    g.fillStyle(0xdceeff, 0.8);
    for (let i = 0; i < 22; i += 1) {
      g.fillRect(Phaser.Math.Between(20, 790), Phaser.Math.Between(470, 590), 4, 5);
    }
  }
}

function createStarfield(scene) {
  scene.stars = [];
  for (let i = 0; i < 70; i += 1) {
    const star = scene.add.sprite(
      Phaser.Math.Between(0, GAME_WIDTH),
      Phaser.Math.Between(0, GAME_HEIGHT),
      'tex_dot',
    );
    const depth = Phaser.Math.FloatBetween(0.3, 1);
    star.setScale(depth * 0.5);
    star.baseAlpha = depth * 0.8;
    star.setAlpha(star.baseAlpha);
    star.speed = 30 + depth * 90;
    star.setDepth(1);
    scene.stars.push(star);
  }
}

function updateStarfield(scene, delta) {
  const seconds = delta / 1000;
  for (const star of scene.stars) {
    star.y += star.speed * seconds;
    if (star.y > GAME_HEIGHT + 4) {
      star.y = -4;
      star.x = Phaser.Math.Between(0, GAME_WIDTH);
    }
  }
}

function createTerrain(scene) {
  scene.terrain = [];
  for (let i = 0; i < 12; i += 1) {
    const cloud = scene.add.sprite(
      Phaser.Math.Between(PF_LEFT + 20, PF_RIGHT - 20),
      Phaser.Math.Between(PF_TOP, PF_BOTTOM),
      'tex_dot',
    );
    cloud.setScale(Phaser.Math.FloatBetween(0.9, 1.6));
    cloud.setAlpha(Phaser.Math.FloatBetween(0.18, 0.34));
    cloud.speed = 40 + Math.random() * 50;
    cloud.setDepth(2);
    scene.terrain.push(cloud);
  }
}

function updateTerrain(scene, delta) {
  const seconds = delta / 1000;
  for (const cloud of scene.terrain) {
    cloud.y += cloud.speed * seconds;
    if (cloud.y > PF_BOTTOM + 40) {
      cloud.y = PF_TOP - 40;
      cloud.x = Phaser.Math.Between(PF_LEFT + 20, PF_RIGHT - 20);
    }
  }
}

function createPlayfieldFrame(scene) {
  scene.add
    .rectangle(PF_CENTER_X, (PF_TOP + PF_BOTTOM) / 2, PF_RIGHT - PF_LEFT, PF_BOTTOM - PF_TOP, 0x080c1c, 0.55)
    .setDepth(1)
    .setStrokeStyle(2, COLORS.panelBorder, 0.9);

  scene.add
    .rectangle(125, GAME_HEIGHT / 2, 220, PF_BOTTOM - PF_TOP, COLORS.panel, 0.6)
    .setDepth(1)
    .setStrokeStyle(2, COLORS.panelBorder, 0.7);

  scene.add
    .rectangle(GAME_WIDTH - 110, GAME_HEIGHT / 2, 190, PF_BOTTOM - PF_TOP, COLORS.panel, 0.6)
    .setDepth(1)
    .setStrokeStyle(2, COLORS.panelBorder, 0.7);
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

const TITLE_SEGMENTS = [
  { text: 'LIBRE ', color: COLORS.textBright },
  { text: 'GUA', color: COLORS.accent },
  { text: 'CAM', color: '#2e6fe8' },
  { text: 'AYA', color: '#e8392e' },
];

function createMultiColorText(scene, x, y, segments, fontSize, originY) {
  const container = scene.add.container(x, y);
  const texts = segments.map((seg) =>
    scene.add
      .text(0, 0, seg.text, { fontFamily: 'monospace', fontSize, color: seg.color, fontStyle: 'bold' })
      .setOrigin(0, originY === undefined ? 0.5 : originY),
  );
  const totalWidth = texts.reduce((sum, t) => sum + t.width, 0);
  let cursorX = -totalWidth / 2;
  texts.forEach((t) => {
    t.setX(cursorX);
    cursorX += t.width;
    container.add(t);
  });
  return container;
}

function createHud(scene) {
  scene.hud = {};

  scene.hud.title = createMultiColorText(scene, GAME_WIDTH / 2, 16, TITLE_SEGMENTS, '18px', 0).setDepth(15);

  scene.hud.scoreLabel = scene.add
    .text(30, 90, 'PUNTAJE', { fontFamily: 'monospace', fontSize: '13px', color: COLORS.textDim })
    .setDepth(15);
  scene.hud.scoreValue = scene.add
    .text(30, 108, '000000', { fontFamily: 'monospace', fontSize: '24px', color: COLORS.textBright, fontStyle: 'bold' })
    .setDepth(15);

  scene.hud.hiLabel = scene.add
    .text(30, 160, 'RECORD', { fontFamily: 'monospace', fontSize: '13px', color: COLORS.textDim })
    .setDepth(15);
  scene.hud.hiValue = scene.add
    .text(30, 178, '000000', { fontFamily: 'monospace', fontSize: '18px', color: '#ffe14d' })
    .setDepth(15);

  scene.hud.waveLabel = scene.add
    .text(30, 230, 'OLEADA', { fontFamily: 'monospace', fontSize: '13px', color: COLORS.textDim })
    .setDepth(15);
  scene.hud.waveValue = scene.add
    .text(30, 248, '1', { fontFamily: 'monospace', fontSize: '24px', color: COLORS.textBright, fontStyle: 'bold' })
    .setDepth(15);

  scene.hud.livesLabel = scene.add
    .text(GAME_WIDTH - 200, 90, 'VIDAS', { fontFamily: 'monospace', fontSize: '13px', color: COLORS.textDim })
    .setDepth(15);
  scene.hud.livesIcons = [];
  for (let i = 0; i < START_LIVES; i += 1) {
    const icon = scene.add.sprite(GAME_WIDTH - 200 + i * 20, 116, 'tex_ship').setScale(0.5).setDepth(15);
    scene.hud.livesIcons.push(icon);
  }

  scene.hud.missilesLabel = scene.add
    .text(GAME_WIDTH - 200, 160, 'CHILLIDO', { fontFamily: 'monospace', fontSize: '13px', color: COLORS.textDim })
    .setDepth(15);
  scene.hud.missilesValue = scene.add
    .text(GAME_WIDTH - 200, 178, 'III', { fontFamily: 'monospace', fontSize: '20px', color: '#ffd23f', fontStyle: 'bold' })
    .setDepth(15);

  scene.hud.powerLabel = scene.add
    .text(GAME_WIDTH - 200, 230, '', { fontFamily: 'monospace', fontSize: '13px', color: COLORS.pickup })
    .setDepth(15);

  scene.hud.bossBarBg = scene.add
    .rectangle(PF_CENTER_X, PF_TOP + 22, 280, 14, 0x0c1226, 0.9)
    .setStrokeStyle(2, COLORS.panelBorder, 0.9)
    .setDepth(15)
    .setVisible(false);
  scene.hud.bossBarFill = scene.add
    .rectangle(PF_CENTER_X - 138, PF_TOP + 22, 276, 9, 0xff5d73, 1)
    .setOrigin(0, 0.5)
    .setDepth(15)
    .setVisible(false);
  scene.hud.bossLabel = scene.add
    .text(PF_CENTER_X, PF_TOP + 7, 'JEFE', {
      fontFamily: 'monospace', fontSize: '11px', color: COLORS.textBright, fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(15)
    .setVisible(false);

  scene.hud.message = scene.add
    .text(PF_CENTER_X, PF_TOP + 60, '', {
      fontFamily: 'monospace', fontSize: '22px', color: COLORS.textBright, fontStyle: 'bold', align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(16)
    .setAlpha(0);
}

function refreshHud(scene) {
  const s = scene.state;
  scene.hud.scoreValue.setText(String(s.score).padStart(6, '0'));
  const hiScore = s.highScores.length ? s.highScores[0].score : 0;
  scene.hud.hiValue.setText(String(Math.max(hiScore, s.score)).padStart(6, '0'));
  scene.hud.waveValue.setText(String(s.wave));
  scene.hud.missilesValue.setText('I'.repeat(s.missiles) || '-');

  scene.hud.livesIcons.forEach((icon, i) => {
    icon.setVisible(i < s.lives);
  });

  if (scene.boss) {
    scene.hud.bossBarBg.setVisible(true);
    scene.hud.bossBarFill.setVisible(true);
    scene.hud.bossLabel.setVisible(true);
    scene.hud.bossBarFill.scaleX = Phaser.Math.Clamp(scene.boss.hp / scene.boss.maxHp, 0, 1);
  } else {
    scene.hud.bossBarBg.setVisible(false);
    scene.hud.bossBarFill.setVisible(false);
    scene.hud.bossLabel.setVisible(false);
  }
}

function showHudMessage(scene, message, color) {
  scene.hud.message.setText(message);
  scene.hud.message.setColor(color || COLORS.textBright);
  scene.hud.message.setAlpha(1);
  scene.hud.message.setScale(1.1);
  scene.tweens.add({
    targets: scene.hud.message,
    scale: 1,
    duration: 160,
    ease: 'Sine.easeOut',
  });
  scene.time.delayedCall(1100, () => {
    scene.tweens.add({ targets: scene.hud.message, alpha: 0, duration: 300 });
  });
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

function createPlayer(scene) {
  const sprite = scene.add.sprite(PF_CENTER_X, PF_BOTTOM - 40, 'tex_ship').setDepth(9);
  scene.player = {
    sprite,
    speed: 260,
    fireCooldown: 0,
    invulnUntil: 0,
    powerLevel: 0,
    powerUntil: 0,
    flashTimer: 0,
  };
}

function resetPlayer(scene) {
  const p = scene.player;
  p.sprite.setPosition(PF_CENTER_X, PF_BOTTOM - 40);
  p.sprite.setRotation(0);
  p.sprite.setVisible(true);
  p.sprite.setAlpha(1);
  p.fireCooldown = 0;
  p.invulnUntil = scene.time.now + 2000;
  p.powerLevel = 0;
  p.powerUntil = 0;
}

function updatePlayer(scene, time, delta) {
  const p = scene.player;
  const seconds = delta / 1000;
  let dx = 0;
  let dy = 0;
  if (isControlHeld(scene, 'P1_L')) dx -= 1;
  if (isControlHeld(scene, 'P1_R')) dx += 1;
  if (isControlHeld(scene, 'P1_U')) dy -= 1;
  if (isControlHeld(scene, 'P1_D')) dy += 1;

  p.sprite.x = Phaser.Math.Clamp(p.sprite.x + dx * p.speed * seconds, PF_LEFT + 18, PF_RIGHT - 18);
  p.sprite.y = Phaser.Math.Clamp(p.sprite.y + dy * p.speed * seconds, PF_TOP + 140, PF_BOTTOM - 20);
  p.sprite.rotation = Phaser.Math.Linear(p.sprite.rotation, dx * 0.3, Math.min(1, seconds * 10));

  if (isControlHeld(scene, 'P1_1')) {
    firePlayerBullet(scene, time);
  }

  if (consumeAnyPressedControl(scene, ['P1_2'])) {
    fireMissile(scene, time);
  }

  if (time < p.invulnUntil) {
    p.flashTimer -= delta;
    if (p.flashTimer <= 0) {
      p.flashTimer = 80;
      p.sprite.setVisible(!p.sprite.visible);
    }
  } else if (!p.sprite.visible) {
    p.sprite.setVisible(true);
  }

  if (p.powerUntil > time) {
    const remain = Math.ceil((p.powerUntil - time) / 1000);
    const label = p.powerLevel >= 2 ? '3X ABANICO' : '2X SEMILLAS';
    scene.hud.powerLabel.setText(`${label} ${remain}s`);
  } else {
    scene.hud.powerLabel.setText('');
  }
}

function firePlayerBullet(scene, time) {
  const p = scene.player;
  if (time < p.fireCooldown) {
    return;
  }
  if (scene.bulletsPlayer.length >= MAX_PLAYER_BULLETS) {
    return;
  }
  p.fireCooldown = time + 170;

  const spawn = (offsetX, vx) => {
    const bullet = scene.add.sprite(p.sprite.x + offsetX, p.sprite.y - 16, 'tex_seed').setDepth(8);
    bullet.vx = vx || 0;
    bullet.vy = -480;
    scene.bulletsPlayer.push(bullet);
  };

  const level = p.powerUntil > time ? p.powerLevel : 0;
  if (level >= 2) {
    spawn(0, 0);
    spawn(0, -150);
    spawn(0, 150);
  } else if (level === 1) {
    spawn(-8, 0);
    spawn(8, 0);
  } else {
    spawn(0, 0);
  }

  playSound(scene, 'shoot');
}

function fireMissile(scene, time) {
  const s = scene.state;
  if (s.missiles <= 0) {
    return;
  }
  s.missiles -= 1;

  for (const bullet of scene.bulletsEnemy) {
    bullet.destroy();
  }
  scene.bulletsEnemy = [];

  for (const enemy of scene.enemies.slice()) {
    if (enemy.mode === 'entering') continue;
    enemy.hp -= enemy.kind === 'boss' ? 6 : 2;
    spawnExplosion(scene, enemy.sprite.x, enemy.sprite.y, enemy.color, 4);
    if (enemy.hp <= 0) {
      killEnemy(scene, enemy, true);
    }
  }

  const flash = scene.add
    .rectangle(PF_CENTER_X, (PF_TOP + PF_BOTTOM) / 2, PF_RIGHT - PF_LEFT, PF_BOTTOM - PF_TOP, 0xffffff, 0.8)
    .setDepth(12);
  scene.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

  scene.player.invulnUntil = time + 1000;
  playSound(scene, 'missile');
}

function hitPlayer(scene, time) {
  const p = scene.player;
  if (time < p.invulnUntil) {
    return;
  }
  scene.state.lives -= 1;
  spawnExplosion(scene, p.sprite.x, p.sprite.y, COLORS.player, 10);
  playSound(scene, 'playerhit');

  if (scene.state.lives <= 0) {
    gameOver(scene);
    return;
  }

  resetPlayer(scene);
}

// ---------------------------------------------------------------------------
// Squadron waves
// ---------------------------------------------------------------------------

function startWave(scene) {
  scene.state.waveClearing = false;
  const isBoss = scene.state.wave % BOSS_WAVE_EVERY === 0;
  scene.state.waveType = isBoss ? 'boss' : 'squad';
  applyTheme(scene, getWaveTheme(scene.state.wave));

  if (isBoss) {
    spawnBoss(scene);
    showHudMessage(scene, `OLEADA ${scene.state.wave} — ${BOSS_CONFIG.label}`, COLORS.danger);
  } else {
    scene.state.squad = {
      quota: 10 + scene.state.wave * 3,
      spawned: 0,
      timer: 500,
      interval: Math.max(500, 1400 - scene.state.wave * 30),
    };
    showHudMessage(scene, `OLEADA ${scene.state.wave}`, COLORS.accent);
  }
  playSound(scene, 'wave');
}

function updateSquadronSpawner(scene, time, delta) {
  const squad = scene.state.squad;
  if (scene.state.waveType !== 'squad' || !squad || squad.spawned >= squad.quota) {
    return;
  }
  squad.timer -= delta;
  if (squad.timer <= 0) {
    const onscreen = scene.enemies.filter((e) => e.kind === 'squad').length;
    if (onscreen < MAX_SQUAD_ONSCREEN) {
      spawnSquadGroup(scene);
      squad.timer = squad.interval * Phaser.Math.FloatBetween(0.8, 1.2);
    } else {
      squad.timer = 250;
    }
  }
}

function spawnSquadGroup(scene) {
  const wave = scene.state.wave;
  const roll = Math.random();
  let spawned;
  if (roll < 0.3) {
    spawned = spawnDivePattern(scene, wave);
  } else if (roll < 0.55) {
    spawned = spawnVFormationPattern(scene, wave);
  } else if (roll < 0.8) {
    spawned = spawnZigzagPattern(scene, wave);
  } else {
    spawned = spawnSweepPattern(scene, wave);
  }
  scene.state.squad.spawned += spawned;
}

function makeSquadEnemy(scene, type, pattern, x, y, extra) {
  const cfg = ENEMY_TYPES[type];
  const sprite = scene.add.sprite(x, y, cfg.texture).setDepth(7);
  const enemy = Object.assign(
    {
      sprite,
      kind: 'squad',
      type,
      pattern,
      hp: cfg.hp,
      points: cfg.points,
      color: cfg.color,
      radius: cfg.radius,
      fireCooldown: Phaser.Math.Between(500, 1200),
    },
    extra,
  );
  scene.enemies.push(enemy);
  return enemy;
}

function spawnDivePattern(scene, wave) {
  const x = Phaser.Math.Between(PF_LEFT + 30, PF_RIGHT - 30);
  makeSquadEnemy(scene, 'grunt', 'dive', x, -30, {
    vy: 140 + wave * 6,
    baseFireCooldown: Phaser.Math.Between(1200, 2000),
  });
  return 1;
}

function spawnVFormationPattern(scene, wave) {
  const cx = Phaser.Math.Between(PF_LEFT + 60, PF_RIGHT - 60);
  const drift = Phaser.Math.Between(-20, 20);
  [-40, 0, 40].forEach((offset, i) => {
    makeSquadEnemy(scene, 'grunt', 'vformation', cx + offset, -30 - i * 16, {
      vy: 130 + wave * 5,
      vx: drift,
    });
  });
  return 3;
}

function spawnZigzagPattern(scene, wave) {
  [-1, 1].forEach((side) => {
    const baseX = Phaser.Math.Clamp(PF_CENTER_X + side * 70, PF_LEFT + 40, PF_RIGHT - 40);
    makeSquadEnemy(scene, 'shooter', 'zigzag', baseX, -30, {
      vy: 110 + wave * 5,
      baseX,
      freq: 1.4,
      amp: 55,
      phase: Math.random() * 10,
      baseFireCooldown: Phaser.Math.Between(1400, 2200),
    });
  });
  return 2;
}

function spawnSweepPattern(scene, wave) {
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? PF_LEFT - 20 : PF_RIGHT + 20;
  const vx = (fromLeft ? 1 : -1) * (90 + wave * 4);
  makeSquadEnemy(scene, 'tank', 'sweep', x, PF_TOP + 70, {
    vx,
    vy: 20,
    baseFireCooldown: Phaser.Math.Between(1000, 1600),
  });
  return 1;
}

function updateEnemies(scene, time, delta) {
  const seconds = delta / 1000;

  for (const enemy of scene.enemies) {
    if (enemy.kind === 'squad') {
      updateSquadEnemy(scene, enemy, time, delta, seconds);
    } else if (enemy.kind === 'boss') {
      updateBoss(scene, enemy, time, delta);
    }
  }

  scene.enemies = scene.enemies.filter((enemy) => {
    if (enemy.kind !== 'squad') {
      return true;
    }
    const outOfBounds =
      enemy.sprite.y > PF_BOTTOM + 50 || enemy.sprite.x < PF_LEFT - 70 || enemy.sprite.x > PF_RIGHT + 70;
    if (outOfBounds) {
      scene.tweens.killTweensOf(enemy.sprite);
      enemy.sprite.destroy();
      return false;
    }
    return true;
  });
}

function updateSquadEnemy(scene, enemy, time, delta, seconds) {
  let vx = enemy.vx || 0;
  const vy = enemy.vy;

  if (enemy.pattern === 'dive' || enemy.pattern === 'vformation') {
    enemy.sprite.y += vy * seconds;
    enemy.sprite.x += vx * seconds;
  } else if (enemy.pattern === 'zigzag') {
    enemy.sprite.y += vy * seconds;
    enemy.sprite.x = enemy.baseX + Math.sin(time / 1000 * enemy.freq + enemy.phase) * enemy.amp;
    vx = enemy.amp * enemy.freq * Math.cos(time / 1000 * enemy.freq + enemy.phase);
  } else if (enemy.pattern === 'sweep') {
    enemy.sprite.x += enemy.vx * seconds;
    enemy.sprite.y += enemy.vy * seconds;
    vx = enemy.vx;
  }

  enemy.sprite.rotation = Math.atan2(vy, vx) - Math.PI / 2;

  if (enemy.pattern === 'vformation') {
    return;
  }

  enemy.fireCooldown -= delta;
  if (enemy.fireCooldown <= 0) {
    enemy.fireCooldown = enemy.baseFireCooldown + Phaser.Math.Between(-200, 400);
    if (enemy.pattern === 'sweep') {
      enemyFireSpread(scene, enemy, time, 3, 28);
    } else {
      enemyFire(scene, enemy, time);
    }
  }
}

function enemyFire(scene, enemy, time) {
  if (scene.bulletsEnemy.length >= MAX_ENEMY_BULLETS) {
    return;
  }
  const player = scene.player.sprite;
  const dx = player.x - enemy.sprite.x;
  const dy = player.y - enemy.sprite.y;
  const dist = Math.max(Math.hypot(dx, dy), 1);
  const speed = 260;

  const bullet = scene.add.sprite(enemy.sprite.x, enemy.sprite.y, 'tex_rock').setDepth(6);
  bullet.vx = (dx / dist) * speed;
  bullet.vy = (dy / dist) * speed;
  scene.bulletsEnemy.push(bullet);
}

function enemyFireSpread(scene, enemy, time, count, totalAngleDeg) {
  if (scene.bulletsEnemy.length >= MAX_ENEMY_BULLETS) {
    return;
  }
  const player = scene.player.sprite;
  const baseAngle = Phaser.Math.Angle.Between(enemy.sprite.x, enemy.sprite.y, player.x, player.y);
  const spreadRad = Phaser.Math.DegToRad(totalAngleDeg);
  const speed = 220;

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    const angle = baseAngle + t * spreadRad;
    const bullet = scene.add.sprite(enemy.sprite.x, enemy.sprite.y, 'tex_rock').setDepth(6);
    bullet.vx = Math.cos(angle) * speed;
    bullet.vy = Math.sin(angle) * speed;
    scene.bulletsEnemy.push(bullet);
  }
}

function killEnemy(scene, enemy, awardPoints) {
  const index = scene.enemies.indexOf(enemy);
  if (index >= 0) {
    scene.enemies.splice(index, 1);
  }
  const x = enemy.sprite.x;
  const y = enemy.sprite.y;
  spawnExplosion(scene, x, y, enemy.color, enemy.kind === 'boss' ? 20 : 8);
  playSound(scene, 'explosion');
  scene.tweens.killTweensOf(enemy.sprite);
  enemy.sprite.destroy();

  if (awardPoints) {
    scene.state.score += enemy.points;
    if (enemy.kind === 'squad' && Math.random() < 0.12) {
      spawnPickup(scene, x, y);
    }
  }

  if (enemy.kind === 'boss') {
    onBossDefeated(scene, enemy);
  }
}

// ---------------------------------------------------------------------------
// Boss
// ---------------------------------------------------------------------------

function spawnBoss(scene) {
  const wave = scene.state.wave;
  const maxHp = 30 + wave * 6;
  const sprite = scene.add.sprite(PF_CENTER_X, -70, BOSS_CONFIG.texture).setDepth(7).setScale(0.65);
  const boss = {
    sprite,
    kind: 'boss',
    mode: 'entering',
    hp: maxHp,
    maxHp,
    points: 500 + wave * 30,
    color: BOSS_CONFIG.color,
    radius: 28,
    anchorY: PF_TOP + 90,
    attackTimer: 1500,
    attackPattern: 'aimed',
    attackPool: BOSS_CONFIG.attackPool,
    defeatedLabel: BOSS_CONFIG.defeatedLabel,
  };
  scene.enemies.push(boss);
  scene.boss = boss;
}

function updateBoss(scene, boss, time, delta) {
  if (boss.mode === 'entering') {
    boss.sprite.y += 110 * (delta / 1000);
    if (boss.sprite.y >= boss.anchorY) {
      boss.sprite.y = boss.anchorY;
      boss.mode = 'fighting';
    }
    return;
  }

  boss.sprite.x = Phaser.Math.Clamp(
    PF_CENTER_X + Math.sin(time / 1000 * 1.1) * 90,
    PF_LEFT + 50,
    PF_RIGHT - 50,
  );

  boss.attackTimer -= delta;
  if (boss.attackTimer <= 0) {
    const reduction = Math.min(scene.state.wave * 50, 1100);
    boss.attackTimer = Math.max(Phaser.Math.Between(1200, 1800) - reduction, 450);
    boss.attackPattern = Phaser.Utils.Array.GetRandom(boss.attackPool);
    if (boss.attackPattern === 'spread') {
      enemyFireSpread(scene, boss, time, 7, 70);
    } else if (boss.attackPattern === 'sweep') {
      enemyFireSpread(scene, boss, time, 5, 140);
    } else {
      enemyFire(scene, boss, time);
    }
  }
}

function onBossDefeated(scene, boss) {
  scene.boss = null;
  scene.state.waveClearing = true;
  const bonus = 500 + scene.state.wave * 50;
  scene.state.score += bonus;
  scene.state.missiles = Math.min(scene.state.missiles + 2, MAX_MISSILES);
  showHudMessage(scene, `${boss.defeatedLabel}  +${bonus}`, COLORS.accent);

  scene.time.delayedCall(1600, () => {
    if (scene.state.phase !== 'playing') return;
    scene.state.wave += 1;
    startWave(scene);
  });
}

function maybeFinishWave(scene, time) {
  if (scene.state.phase !== 'playing' || scene.state.waveClearing || scene.state.waveType !== 'squad') {
    return;
  }
  const squad = scene.state.squad;
  if (!squad || squad.spawned < squad.quota || scene.enemies.length > 0) {
    return;
  }
  scene.state.waveClearing = true;
  const bonus = 100 + scene.state.wave * 20;
  scene.state.score += bonus;
  showHudMessage(scene, `OLEADA ${scene.state.wave} COMPLETA  +${bonus}`, '#7ed957');

  scene.time.delayedCall(1300, () => {
    if (scene.state.phase !== 'playing') return;
    scene.state.wave += 1;
    startWave(scene);
  });
}

// ---------------------------------------------------------------------------
// Bullets & pickups
// ---------------------------------------------------------------------------

function updateBullets(scene, delta) {
  const seconds = delta / 1000;

  scene.bulletsPlayer = scene.bulletsPlayer.filter((bullet) => {
    bullet.x += bullet.vx * seconds;
    bullet.y += bullet.vy * seconds;
    if (bullet.y < PF_TOP - 20 || bullet.x < PF_LEFT - 20 || bullet.x > PF_RIGHT + 20) {
      bullet.destroy();
      return false;
    }
    return true;
  });

  scene.bulletsEnemy = scene.bulletsEnemy.filter((bullet) => {
    bullet.x += bullet.vx * seconds;
    bullet.y += bullet.vy * seconds;
    if (bullet.y > PF_BOTTOM + 20 || bullet.y < PF_TOP - 40 || bullet.x < PF_LEFT - 40 || bullet.x > PF_RIGHT + 40) {
      bullet.destroy();
      return false;
    }
    return true;
  });
}

const FRUIT_TEXTURES = ['tex_fruit_a', 'tex_fruit_b', 'tex_fruit_c'];

function spawnPickup(scene, x, y) {
  const texture = Phaser.Utils.Array.GetRandom(FRUIT_TEXTURES);
  const pickup = scene.add.sprite(x, y, texture).setDepth(5);
  pickup.setScale(1.3);
  scene.tweens.add({ targets: pickup, alpha: 0.6, duration: 260, yoyo: true, repeat: -1 });
  scene.pickups.push(pickup);
}

function updatePickups(scene, delta) {
  const seconds = delta / 1000;
  scene.pickups = scene.pickups.filter((pickup) => {
    pickup.y += 80 * seconds;
    if (pickup.y > PF_BOTTOM + 20) {
      scene.tweens.killTweensOf(pickup);
      pickup.destroy();
      return false;
    }
    return true;
  });
}

function updateSupplyDrop(scene, time, delta) {
  if (scene.supplyDrop) {
    scene.supplyDrop.y += 70 * (delta / 1000);
    if (scene.supplyDrop.y > PF_BOTTOM + 30) {
      scene.tweens.killTweensOf(scene.supplyDrop);
      scene.supplyDrop.destroy();
      scene.supplyDrop = null;
      scene.state.supplyTimer = Phaser.Math.Between(9000, 13000);
    }
    return;
  }

  scene.state.supplyTimer -= delta;
  if (scene.state.supplyTimer <= 0) {
    const x = Phaser.Math.Between(PF_LEFT + 40, PF_RIGHT - 40);
    const drop = scene.add.sprite(x, PF_TOP - 20, 'tex_supply').setDepth(5);
    drop.setTint(COLORS.supply);
    drop.setScale(1.6);
    scene.tweens.add({ targets: drop, alpha: 0.55, duration: 280, yoyo: true, repeat: -1 });
    scene.supplyDrop = drop;
  }
}

// ---------------------------------------------------------------------------
// Collisions
// ---------------------------------------------------------------------------

function checkCollisions(scene, time) {
  const player = scene.player.sprite;

  scene.bulletsPlayer = scene.bulletsPlayer.filter((bullet) => {
    for (const enemy of scene.enemies) {
      if (enemy.mode === 'entering') continue;
      const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.sprite.x, enemy.sprite.y);
      if (dist < enemy.radius + 4) {
        enemy.hp -= 1;
        bullet.destroy();
        if (enemy.hp <= 0) {
          killEnemy(scene, enemy, true);
        } else {
          enemy.sprite.setTintFill(0xffffff);
          scene.time.delayedCall(60, () => {
            if (enemy.sprite.active) enemy.sprite.clearTint();
          });
          playSound(scene, 'hit');
        }
        return false;
      }
    }
    return true;
  });

  if (time >= scene.player.invulnUntil) {
    for (const enemy of scene.enemies.slice()) {
      if (enemy.mode === 'entering') continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.sprite.x, enemy.sprite.y);
      if (dist < enemy.radius + 12) {
        if (enemy.kind === 'boss') {
          hitPlayer(scene, time);
        } else {
          killEnemy(scene, enemy, false);
          hitPlayer(scene, time);
        }
        break;
      }
    }
  }

  scene.bulletsEnemy = scene.bulletsEnemy.filter((bullet) => {
    const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, player.x, player.y);
    if (dist < 16) {
      bullet.destroy();
      hitPlayer(scene, time);
      return false;
    }
    return true;
  });

  scene.pickups = scene.pickups.filter((pickup) => {
    const dist = Phaser.Math.Distance.Between(pickup.x, pickup.y, player.x, player.y);
    if (dist < 22) {
      const p = scene.player;
      if (p.powerUntil <= time) {
        p.powerLevel = 0;
      }
      p.powerLevel = Math.min(p.powerLevel + 1, 2);
      p.powerUntil = time + 8000;
      playSound(scene, 'pickup');
      scene.tweens.killTweensOf(pickup);
      pickup.destroy();
      return false;
    }
    return true;
  });

  if (scene.supplyDrop) {
    const dist = Phaser.Math.Distance.Between(scene.supplyDrop.x, scene.supplyDrop.y, player.x, player.y);
    if (dist < 24) {
      scene.state.missiles = Math.min(scene.state.missiles + 1, MAX_MISSILES);
      playSound(scene, 'pickup');
      showHudMessage(scene, 'RECARGA! +1 CHILLIDO', COLORS.accent);
      scene.tweens.killTweensOf(scene.supplyDrop);
      scene.supplyDrop.destroy();
      scene.supplyDrop = null;
      scene.state.supplyTimer = Phaser.Math.Between(9000, 13000);
    }
  }
}

function spawnExplosion(scene, x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const particle = scene.add.sprite(x, y, 'tex_dot').setDepth(10);
    particle.setTint(color);
    particle.setScale(0.8);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(16, 48);
    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scale: 0.1,
      duration: Phaser.Math.Between(220, 380),
      onComplete: () => particle.destroy(),
    });
  }
}

// ---------------------------------------------------------------------------
// Match flow
// ---------------------------------------------------------------------------

function startMatch(scene) {
  scene.startScreen.container.setVisible(false);
  scene.state.score = 0;
  scene.state.wave = 1;
  scene.state.lives = START_LIVES;
  scene.state.missiles = START_MISSILES;
  scene.state.waveClearing = false;
  scene.state.squad = null;
  scene.state.supplyTimer = Phaser.Math.Between(9000, 13000);
  clearPressedControls(scene);

  for (const enemy of scene.enemies) {
    scene.tweens.killTweensOf(enemy.sprite);
    enemy.sprite.destroy();
  }
  scene.enemies = [];
  scene.boss = null;
  for (const bullet of scene.bulletsPlayer) bullet.destroy();
  scene.bulletsPlayer = [];
  for (const bullet of scene.bulletsEnemy) bullet.destroy();
  scene.bulletsEnemy = [];
  for (const pickup of scene.pickups) {
    scene.tweens.killTweensOf(pickup);
    pickup.destroy();
  }
  scene.pickups = [];
  if (scene.supplyDrop) {
    scene.tweens.killTweensOf(scene.supplyDrop);
    scene.supplyDrop.destroy();
    scene.supplyDrop = null;
  }

  resetPlayer(scene);
  refreshHud(scene);
  scene.state.phase = 'playing';
  startWave(scene);
}

function gameOver(scene) {
  scene.state.phase = 'gameover';
  scene.player.sprite.setVisible(false);
  playSound(scene, 'gameover');

  // Dying mid-fight leaves the boss reference alive, which would keep the
  // music at boss tempo and the boss HP bar on screen.
  scene.boss = null;
  refreshHud(scene);

  // Drop stale presses from the match and hold input briefly so the player
  // cannot skip the save screen with the fire button they died holding.
  clearPressedControls(scene);
  const readyAt = scene.time.now + 600;
  scene.state.gameOverReadyAt = readyAt;

  const lowestScore = scene.state.highScores.length < MAX_HIGH_SCORES
    ? -1
    : scene.state.highScores[scene.state.highScores.length - 1].score;
  const qualifies = scene.state.score > lowestScore;
  scene.state.nameEntry.qualifies = qualifies;
  scene.state.nameEntry.letters = [];
  scene.state.nameEntry.row = 0;
  scene.state.nameEntry.col = 0;
  scene.state.nameEntry.moveCooldownUntil = 0;
  scene.state.nameEntry.confirmCooldownUntil = readyAt;
  scene.state.nameEntry.lastMoveVector = { x: 0, y: 0 };

  scene.endGame.container.setVisible(true);
  scene.endGame.summary.setText(`PUNTAJE ${String(scene.state.score).padStart(6, '0')}   OLEADA ${scene.state.wave}`);

  if (qualifies) {
    scene.endGame.nameLabel.setText('NUEVO RECORD — INICIALES');
    scene.endGame.nameLabel.setVisible(true);
    scene.endGame.nameValue.setVisible(true);
    scene.endGame.instructions.setVisible(true);
    scene.endGame.gridLabels.forEach(({ cell, label }) => {
      cell.setVisible(true);
      label.setVisible(true);
    });
    refreshNameEntry(scene);
    updateLetterGridHighlight(scene);
  } else {
    scene.endGame.nameLabel.setText('PRESIONA START PARA CONTINUAR');
    scene.endGame.nameLabel.setVisible(true);
    scene.endGame.nameValue.setVisible(false);
    scene.endGame.instructions.setVisible(false);
    scene.endGame.gridLabels.forEach(({ cell, label }) => {
      cell.setVisible(false);
      label.setVisible(false);
    });
  }

  scene.endGame.saveStatus.setText(scene.state.saveStatus);
  refreshLeaderboard(scene);
}

function returnToStart(scene) {
  scene.endGame.container.setVisible(false);
  showStartScreen(scene);
}

function pauseGame(scene) {
  scene.state.phase = 'paused';
  scene.pauseScreen.container.setVisible(true);
}

function resumeGame(scene) {
  scene.pauseScreen.container.setVisible(false);
  scene.state.phase = 'playing';
}

// ---------------------------------------------------------------------------
// Start / controls / leaderboard screens
// ---------------------------------------------------------------------------

function createStartScreen(scene) {
  scene.startScreen = {};
  const c = scene.add.container(0, 0).setDepth(20);
  scene.startScreen.container = c;

  c.add(scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.backdrop, 0.6));

  c.add(
    scene.add
      .text(GAME_WIDTH / 2, 70, 'PLATANUS HACK 26 · CARACAS', {
        fontFamily: 'monospace', fontSize: '15px', color: COLORS.textDim,
      })
      .setOrigin(0.5),
  );

  const title = createMultiColorText(scene, GAME_WIDTH / 2, 130, TITLE_SEGMENTS, '42px');
  c.add(title);
  scene.tweens.add({ targets: title, scale: 1.03, alpha: 0.88, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  scene.startScreen.buttons = [];
  const labels = ['JUGAR', 'CONTROLES', 'PUNTAJES'];
  for (let i = 0; i < labels.length; i += 1) {
    const y = 220 + i * 54;
    const bg = scene.add.rectangle(GAME_WIDTH / 2, y, 280, 42, 0x0c1226, 0.95).setStrokeStyle(2, COLORS.panelBorder, 0.8);
    const label = scene.add
      .text(GAME_WIDTH / 2, y, labels[i], { fontFamily: 'monospace', fontSize: '22px', color: COLORS.textBright, fontStyle: 'bold' })
      .setOrigin(0.5);
    c.add(bg);
    c.add(label);
    scene.startScreen.buttons.push({ bg, label });
  }

  c.add(
    scene.add
      .text(GAME_WIDTH / 2, 398, 'MEJORES PUNTAJES', { fontFamily: 'monospace', fontSize: '14px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5),
  );
  scene.startScreen.leaderboard = scene.add
    .text(GAME_WIDTH / 2, 422, '', { fontFamily: 'monospace', fontSize: '13px', color: COLORS.textBright, align: 'center', lineSpacing: 4 })
    .setOrigin(0.5, 0);
  c.add(scene.startScreen.leaderboard);

  c.add(
    scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 22, 'MUEVE ↕   CONFIRMA BOTON / START', {
        fontFamily: 'monospace', fontSize: '11px', color: COLORS.textDim,
      })
      .setOrigin(0.5),
  );

  c.setVisible(false);
}

function showStartScreen(scene) {
  scene.state.phase = 'start';
  scene.state.menu = { cursor: 0, cooldown: 0, lastAxis: 0 };
  applyTheme(scene, 'cityDayMenu');
  refreshStartScreenLeaderboard(scene);
  updateStartMenuHighlight(scene);
  scene.startScreen.container.setVisible(true);
}

function updateStartMenuHighlight(scene) {
  const cursor = scene.state.menu.cursor;
  scene.startScreen.buttons.forEach(({ bg, label }, i) => {
    const active = i === cursor;
    bg.setFillStyle(active ? COLORS.accentNum : 0x0c1226, active ? 1 : 0.95);
    bg.setStrokeStyle(2, active ? COLORS.white : COLORS.panelBorder, 1);
    label.setColor(active ? '#041018' : COLORS.textBright);
  });
}

function handleStartMenu(scene, time) {
  const menu = scene.state.menu;
  const axisY = getVerticalMenuAxis(scene.controls);

  if (time >= menu.cooldown && axisY !== 0 && menu.lastAxis !== axisY) {
    menu.cursor = Phaser.Math.Wrap(menu.cursor + axisY, 0, scene.startScreen.buttons.length);
    menu.cooldown = time + 160;
    updateStartMenuHighlight(scene);
    playSound(scene, 'click');
  }
  menu.lastAxis = axisY;

  if (consumeAnyPressedControl(scene, ['P1_1', 'P1_2', 'START1'])) {
    playSound(scene, 'select');
    startAmbientMusic(scene);
    if (menu.cursor === 0) {
      startMatch(scene);
    } else if (menu.cursor === 1) {
      showControlsScreen(scene);
    } else {
      showLeaderboardScreen(scene);
    }
  }
}

function createControlsScreen(scene) {
  scene.controlsScreen = {};
  const c = scene.add.container(0, 0).setDepth(21);
  scene.controlsScreen.container = c;

  c.add(scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.backdrop, 0.98));
  c.add(
    scene.add
      .text(GAME_WIDTH / 2, 100, 'CONTROLES', { fontFamily: 'monospace', fontSize: '30px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5),
  );

  const lines = [
    'JOYSTICK      MOVER GUACAMAYA',
    'BOTON 1       DISPARAR SEMILLAS',
    'BOTON 2       CHILLIDO',
    'START         PAUSA',
    '',
    'CHILLIDO: limpia la pantalla de',
    'enemigos y piedras. Es limitado —',
    'recarga al tomar un suministro (♪).',
    '',
    'FRUTA: potencia el disparo (temporal)',
    '1 FRUTA = DOBLE',
    '2 SEGUIDAS = ABANICO X3',
  ];
  c.add(
    scene.add
      .text(GAME_WIDTH / 2, 185, lines.join('\n'), { fontFamily: 'monospace', fontSize: '16px', color: COLORS.textBright, align: 'center', lineSpacing: 8 })
      .setOrigin(0.5, 0),
  );

  c.add(
    scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 28, 'PRESIONA START PARA VOLVER', { fontFamily: 'monospace', fontSize: '12px', color: COLORS.textDim })
      .setOrigin(0.5),
  );

  c.setVisible(false);
}

function showControlsScreen(scene) {
  scene.startScreen.container.setVisible(false);
  scene.controlsScreen.container.setVisible(true);
  scene.state.phase = 'controls';
}

function createLeaderboardScreen(scene) {
  scene.leaderScreen = {};
  const c = scene.add.container(0, 0).setDepth(21);
  scene.leaderScreen.container = c;

  c.add(scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.backdrop, 0.98));
  c.add(
    scene.add
      .text(GAME_WIDTH / 2, 90, 'PUNTAJES', { fontFamily: 'monospace', fontSize: '30px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5),
  );

  scene.leaderScreen.list = scene.add
    .text(GAME_WIDTH / 2, 170, '', { fontFamily: 'monospace', fontSize: '20px', color: COLORS.textBright, align: 'center', lineSpacing: 12 })
    .setOrigin(0.5, 0);
  c.add(scene.leaderScreen.list);

  c.add(
    scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 28, 'PRESIONA START PARA VOLVER', { fontFamily: 'monospace', fontSize: '12px', color: COLORS.textDim })
      .setOrigin(0.5),
  );

  c.setVisible(false);
}

function showLeaderboardScreen(scene) {
  scene.leaderScreen.list.setText(formatLeaderboardLines(scene.state.highScores).join('\n'));
  scene.startScreen.container.setVisible(false);
  scene.leaderScreen.container.setVisible(true);
  scene.state.phase = 'leaderboard';
}

function formatLeaderboardLines(highScores) {
  if (!highScores.length) {
    return ['SIN PUNTAJES AUN'];
  }
  return highScores.map((entry, i) =>
    `${String(i + 1).padStart(2, '0')}  ${entry.name.padEnd(3, ' ')}  ${String(entry.score).padStart(6, '0')}  OLA ${entry.wave}`,
  );
}

function refreshStartScreenLeaderboard(scene) {
  scene.startScreen.leaderboard.setText(formatLeaderboardLines(scene.state.highScores).slice(0, 5).join('\n'));
}

function createPauseScreen(scene) {
  scene.pauseScreen = {};
  const c = scene.add.container(0, 0).setDepth(25);
  scene.pauseScreen.container = c;

  c.add(scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.backdrop, 0.82));
  c.add(
    scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'PAUSA', { fontFamily: 'monospace', fontSize: '48px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5),
  );
  c.add(
    scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 34, 'PRESIONA START PARA CONTINUAR', { fontFamily: 'monospace', fontSize: '15px', color: COLORS.textDim })
      .setOrigin(0.5),
  );

  c.setVisible(false);
}

// ---------------------------------------------------------------------------
// Game over / name entry
// ---------------------------------------------------------------------------

function createEndGameUi(scene) {
  scene.endGame = {};
  const c = scene.add.container(0, 0).setDepth(22);
  scene.endGame.container = c;

  c.add(scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.backdrop, 0.98));

  scene.endGame.title = scene.add
    .text(GAME_WIDTH / 2, 70, 'FIN DE LA PARTIDA', { fontFamily: 'monospace', fontSize: '28px', color: COLORS.textBright, fontStyle: 'bold' })
    .setOrigin(0.5);
  c.add(scene.endGame.title);

  scene.endGame.summary = scene.add
    .text(GAME_WIDTH / 2, 110, '', { fontFamily: 'monospace', fontSize: '18px', color: COLORS.accent, align: 'center' })
    .setOrigin(0.5);
  c.add(scene.endGame.summary);

  scene.endGame.nameLabel = scene.add
    .text(GAME_WIDTH / 2, 150, '', { fontFamily: 'monospace', fontSize: '13px', color: COLORS.textDim, align: 'center' })
    .setOrigin(0.5);
  c.add(scene.endGame.nameLabel);

  scene.endGame.nameValue = scene.add
    .text(GAME_WIDTH / 2, 186, '___', { fontFamily: 'monospace', fontSize: '32px', color: '#2e6fe8', fontStyle: 'bold', letterSpacing: 10 })
    .setOrigin(0.5);
  c.add(scene.endGame.nameValue);

  scene.endGame.instructions = scene.add
    .text(GAME_WIDTH / 2, 216, 'MUEVE  ·  SELECCIONA', { fontFamily: 'monospace', fontSize: '11px', color: COLORS.textDim })
    .setOrigin(0.5);
  c.add(scene.endGame.instructions);

  scene.endGame.gridLabels = [];
  for (let row = 0; row < LETTER_GRID.length; row += 1) {
    const rowValues = LETTER_GRID[row];
    const rowWidth = rowValues.length * 54;
    for (let col = 0; col < rowValues.length; col += 1) {
      const value = rowValues[col];
      const cellX = GAME_WIDTH / 2 - rowWidth / 2 + 27 + col * 54;
      const cellY = 250 + row * 26;

      const cell = scene.add.rectangle(cellX, cellY, value.length > 1 ? 60 : 40, 22, 0x0c1226, 0.95).setStrokeStyle(2, COLORS.panelBorder, 0.8);
      const label = scene.add
        .text(cellX, cellY, value, { fontFamily: 'monospace', fontSize: value.length > 1 ? '13px' : '17px', color: COLORS.textBright, fontStyle: 'bold' })
        .setOrigin(0.5);

      scene.endGame.gridLabels.push({ cell, label, row, col, value });
      c.add(cell);
      c.add(label);
    }
  }

  scene.endGame.leaderboardTitle = scene.add
    .text(GAME_WIDTH / 2, 404, 'MEJORES PUNTAJES', { fontFamily: 'monospace', fontSize: '14px', color: COLORS.accent, fontStyle: 'bold' })
    .setOrigin(0.5);
  c.add(scene.endGame.leaderboardTitle);

  scene.endGame.leaderboard = scene.add
    .text(GAME_WIDTH / 2, 428, '', { fontFamily: 'monospace', fontSize: '13px', color: COLORS.textBright, align: 'center', lineSpacing: 5 })
    .setOrigin(0.5, 0);
  c.add(scene.endGame.leaderboard);

  scene.endGame.saveStatus = scene.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, '', { fontFamily: 'monospace', fontSize: '11px', color: COLORS.accent, align: 'center' })
    .setOrigin(0.5);
  c.add(scene.endGame.saveStatus);

  c.setVisible(false);
}

function handleNameEntry(scene, time) {
  const axisX = getHorizontalMenuAxis(scene.controls);
  const axisY = getVerticalMenuAxis(scene.controls);
  const entry = scene.state.nameEntry;

  if (
    time >= entry.moveCooldownUntil &&
    (axisX !== 0 || axisY !== 0) &&
    (entry.lastMoveVector.x !== axisX || entry.lastMoveVector.y !== axisY)
  ) {
    moveLetterSelection(scene, axisX, axisY);
    entry.moveCooldownUntil = time + 160;
    playSound(scene, 'click');
  }
  entry.lastMoveVector = { x: axisX, y: axisY };

  if (time >= entry.confirmCooldownUntil && consumeAnyPressedControl(scene, ['P1_1', 'P1_2', 'START1'])) {
    entry.confirmCooldownUntil = time + 180;
    playSound(scene, 'select');
    activateCurrentLetter(scene);
  }
}

function moveLetterSelection(scene, axisX, axisY) {
  const entry = scene.state.nameEntry;
  if (axisY !== 0) {
    entry.row = Phaser.Math.Wrap(entry.row + axisY, 0, LETTER_GRID.length);
    entry.col = Math.min(entry.col, LETTER_GRID[entry.row].length - 1);
  }
  if (axisX !== 0) {
    entry.col = Phaser.Math.Wrap(entry.col + axisX, 0, LETTER_GRID[entry.row].length);
  }
  updateLetterGridHighlight(scene);
}

function updateLetterGridHighlight(scene) {
  const entry = scene.state.nameEntry;
  for (const item of scene.endGame.gridLabels) {
    const active = item.row === entry.row && item.col === entry.col;
    item.cell.setFillStyle(active ? COLORS.accentNum : 0x0c1226, active ? 1 : 0.95);
    item.cell.setStrokeStyle(2, active ? COLORS.white : COLORS.panelBorder, 1);
    item.label.setColor(active ? '#041018' : COLORS.textBright);
  }
}

function activateCurrentLetter(scene) {
  const entry = scene.state.nameEntry;
  const value = LETTER_GRID[entry.row][entry.col];

  if (value === 'DEL') {
    entry.letters.pop();
    refreshNameEntry(scene);
    return;
  }

  if (value === 'END') {
    if (entry.letters.length === 0) {
      scene.endGame.saveStatus.setText('Elige al menos una letra.');
      return;
    }
    submitHighScore(scene);
    return;
  }

  if (entry.letters.length >= NAME_LENGTH) {
    entry.letters.shift();
  }
  entry.letters.push(value);
  refreshNameEntry(scene);
}

function refreshNameEntry(scene) {
  const letters = scene.state.nameEntry.letters.slice();
  while (letters.length < NAME_LENGTH) {
    letters.push('_');
  }
  scene.endGame.nameValue.setText(letters.join(' '));
}

function submitHighScore(scene) {
  const initials = scene.state.nameEntry.letters.join('').slice(0, NAME_LENGTH) || '???';
  const entry = {
    name: initials,
    score: scene.state.score,
    wave: scene.state.wave,
    savedAt: new Date().toISOString().slice(0, 10),
  };

  scene.state.saveStatus = `Guardado ${initials}! Presiona START para jugar de nuevo.`;
  scene.endGame.saveStatus.setText(scene.state.saveStatus);
  scene.state.phase = 'saved';

  persistHighScore(entry)
    .then((nextScores) => {
      scene.state.highScores = nextScores;
      refreshLeaderboard(scene);
    })
    .catch(() => {
      scene.state.saveStatus = 'No se pudo guardar el puntaje.';
      if (scene.state.phase === 'saved') {
        scene.endGame.saveStatus.setText(scene.state.saveStatus);
      }
    });
}

function refreshLeaderboard(scene) {
  scene.endGame.leaderboard.setText(formatLeaderboardLines(scene.state.highScores).join('\n'));
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function createControls(scene) {
  scene.controls = {
    held: Object.create(null),
    pressed: Object.create(null),
  };

  const onKeyDown = (event) => {
    const key = normalizeIncomingKey(event.key);
    if (!key) return;
    const arcadeCode = KEYBOARD_TO_ARCADE[key];
    if (!arcadeCode) return;
    if (!scene.controls.held[arcadeCode]) {
      scene.controls.pressed[arcadeCode] = true;
    }
    scene.controls.held[arcadeCode] = true;
  };

  const onKeyUp = (event) => {
    const key = normalizeIncomingKey(event.key);
    if (!key) return;
    const arcadeCode = KEYBOARD_TO_ARCADE[key];
    if (!arcadeCode) return;
    scene.controls.held[arcadeCode] = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  scene.events.once('shutdown', () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  });
}

function normalizeIncomingKey(key) {
  if (typeof key !== 'string' || key.length === 0) {
    return '';
  }
  if (key === ' ') {
    return 'space';
  }
  return key.toLowerCase();
}

function isControlHeld(scene, controlCode) {
  return scene.controls.held[controlCode] === true;
}

function consumeAnyPressedControl(scene, controlCodes) {
  for (const code of controlCodes) {
    if (scene.controls.pressed[code]) {
      scene.controls.pressed[code] = false;
      return true;
    }
  }
  return false;
}

// Firing uses the held state, so pressed flags pile up unconsumed during a
// match. Clear them on phase changes or the next screen eats a stale press.
function clearPressedControls(scene) {
  scene.controls.pressed = Object.create(null);
}

function getHorizontalMenuAxis(controls) {
  let axis = 0;
  if (controls.held.P1_L) axis -= 1;
  if (controls.held.P1_R) axis += 1;
  return Phaser.Math.Clamp(axis, -1, 1);
}

function getVerticalMenuAxis(controls) {
  let axis = 0;
  if (controls.held.P1_U) axis -= 1;
  if (controls.held.P1_D) axis += 1;
  return Phaser.Math.Clamp(axis, -1, 1);
}

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

function playTone(ctx, { type, freqFrom, freqTo, duration, gain, startAt }) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = type;
  const now = startAt || ctx.currentTime;
  osc.frequency.setValueAtTime(freqFrom, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 1), now + duration);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

function playNoise(scene, { duration, gain, filterFreq, startAt }) {
  const ctx = scene.sound.context;
  const now = startAt || ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = scene.noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  src.start(now);
  src.stop(now + duration);
}

function playSound(scene, type) {
  try {
    const ctx = scene.sound.context;
    const now = ctx.currentTime;

    if (type === 'shoot') {
      playTone(ctx, { type: 'square', freqFrom: 1000, freqTo: 600, duration: 0.07, gain: 0.1, startAt: now });
    } else if (type === 'hit') {
      playTone(ctx, { type: 'square', freqFrom: 520, freqTo: 280, duration: 0.05, gain: 0.08, startAt: now });
    } else if (type === 'explosion') {
      playNoise(scene, { duration: 0.22, gain: 0.22, filterFreq: 900, startAt: now });
      playTone(ctx, { type: 'sine', freqFrom: 110, freqTo: 40, duration: 0.15, gain: 0.18, startAt: now });
    } else if (type === 'playerhit') {
      playNoise(scene, { duration: 0.3, gain: 0.3, filterFreq: 500, startAt: now });
      playTone(ctx, { type: 'sawtooth', freqFrom: 300, freqTo: 60, duration: 0.4, gain: 0.25, startAt: now });
    } else if (type === 'missile') {
      playTone(ctx, { type: 'sawtooth', freqFrom: 1200, freqTo: 3200, duration: 0.16, gain: 0.32, startAt: now });
      playTone(ctx, { type: 'square', freqFrom: 2600, freqTo: 2000, duration: 0.1, gain: 0.18, startAt: now + 0.02 });
      playTone(ctx, { type: 'sawtooth', freqFrom: 3000, freqTo: 1500, duration: 0.2, gain: 0.28, startAt: now + 0.09 });
      playNoise(scene, { duration: 0.08, gain: 0.15, filterFreq: 2800, startAt: now });
    } else if (type === 'pickup') {
      playTone(ctx, { type: 'triangle', freqFrom: 600, freqTo: 1200, duration: 0.1, gain: 0.15, startAt: now });
      playTone(ctx, { type: 'triangle', freqFrom: 900, freqTo: 1500, duration: 0.12, gain: 0.12, startAt: now + 0.09 });
    } else if (type === 'wave') {
      [523, 659, 784].forEach((freq, i) => {
        playTone(ctx, { type: 'square', freqFrom: freq, freqTo: freq, duration: 0.12, gain: 0.1, startAt: now + i * 0.08 });
      });
    } else if (type === 'gameover') {
      [392, 349, 311, 261].forEach((freq, i) => {
        playTone(ctx, { type: 'sawtooth', freqFrom: freq, freqTo: freq * 0.9, duration: 0.3, gain: 0.14, startAt: now + i * 0.16 });
      });
    } else if (type === 'click') {
      playTone(ctx, { type: 'square', freqFrom: 1200, freqTo: 600, duration: 0.04, gain: 0.07, startAt: now });
    } else if (type === 'select') {
      playTone(ctx, { type: 'square', freqFrom: 700, freqTo: 1400, duration: 0.09, gain: 0.1, startAt: now });
    }
  } catch (_) {}
}

function startAmbientMusic(scene) {
  if (scene.state.musicStarted) {
    return;
  }
  scene.state.musicStarted = true;

  try {
    const ctx = scene.sound.context;
    if (!ctx) return;

    const STEP_NORMAL = 0.23;
    const STEP_BOSS = 0.15;
    const BASS = [110, 110, 0, 110, 0, 164.81, 110, 0];
    const DRUM = ['low', 0, 'high', 'high', 0, 'low', 'high', 0];
    const MELODY = [
      523.25, 0, 659.25, 0, 587.33, 0, 783.99, 659.25,
      0, 523.25, 0, 440, 0, 523.25, 587.33, 0,
    ];

    // One chain for drums, bass and melody so they always share a tempo, and
    // each bar is re-anchored to the audio clock: a fixed-delay chain drifts
    // ahead and would queue bars at the old tempo before a boss shows up.
    let nextBarAt = ctx.currentTime + 0.2;

    function scheduleBar() {
      const phase = scene.state.phase;
      const inBossFight = !!scene.boss && (phase === 'playing' || phase === 'paused');
      const step = inBossFight ? STEP_BOSS : STEP_NORMAL;
      const start = Math.max(nextBarAt, ctx.currentTime + 0.03);

      for (let i = 0; i < 8; i += 1) {
        const t = start + i * step;
        if (BASS[i]) {
          playTone(ctx, { type: 'triangle', freqFrom: BASS[i], freqTo: BASS[i] * 0.97, duration: 0.18, gain: 0.15, startAt: t });
        }
        if (DRUM[i] === 'low') {
          playTone(ctx, { type: 'sine', freqFrom: 100, freqTo: 45, duration: 0.14, gain: 0.28, startAt: t });
        } else if (DRUM[i] === 'high') {
          playNoise(scene, { duration: 0.08, gain: 0.2, filterFreq: 1100, startAt: t });
        }
      }

      MELODY.forEach((freq, i) => {
        if (freq) {
          playTone(ctx, { type: 'triangle', freqFrom: freq, freqTo: freq, duration: 0.16, gain: 0.09, startAt: start + i * (step / 2) });
        }
      });

      nextBarAt = start + step * 8;
      scene.time.delayedCall(Math.max(20, (nextBarAt - ctx.currentTime) * 1000 - 60), scheduleBar);
    }

    function scheduleChirp() {
      const freq = Phaser.Math.Between(1800, 2600);
      playTone(ctx, { type: 'sine', freqFrom: freq, freqTo: freq * 1.3, duration: 0.09, gain: 0.06, startAt: ctx.currentTime + 0.05 });
      scene.time.delayedCall(Phaser.Math.Between(1800, 3600), scheduleChirp);
    }

    scheduleBar();
    scene.time.delayedCall(1500, scheduleChirp);
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function getStorage() {
  if (window.platanusArcadeStorage) {
    return window.platanusArcadeStorage;
  }
  return {
    async get(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? { found: false, value: null } : { found: true, value: JSON.parse(raw) };
      } catch {
        return { found: false, value: null };
      }
    },
    async set(key, value) {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
  };
}

async function storageGet(key) {
  return getStorage().get(key);
}

async function storageSet(key, value) {
  return getStorage().set(key, value);
}

function isHighScoreEntry(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    typeof value.score === 'number' &&
    typeof value.wave === 'number' &&
    typeof value.savedAt === 'string'
  );
}

async function loadHighScores() {
  const result = await storageGet(STORAGE_KEY);
  if (!result.found || !Array.isArray(result.value)) {
    return [];
  }
  return result.value.filter(isHighScoreEntry).slice(0, MAX_HIGH_SCORES);
}

async function persistHighScore(entry) {
  const existing = await loadHighScores();
  const next = existing
    .concat(entry)
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : (a.savedAt < b.savedAt ? 1 : -1)))
    .slice(0, MAX_HIGH_SCORES);
  await storageSet(STORAGE_KEY, next);
  return next;
}
