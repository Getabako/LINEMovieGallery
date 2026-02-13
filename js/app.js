/* ============================================
   秋田ノーザンハピネッツ MOVIE GALLERY
   LINE LIFF App - Main Application
   ============================================ */

// --- カテゴリ定義 ---
const CATEGORIES = [
  { key: 'all',       label: 'すべて' },
  { key: 'highlight', label: '試合ハイライト' },
  { key: 'interview', label: '選手インタビュー' },
  { key: 'message',   label: '選手メッセージ' },
  { key: 'cheer',     label: 'チア・イベント' },
  { key: 'behind',    label: '舞台裏' },
];

// --- 動画データ ---
const ALL_VIDEOS = [
  {
    id: '4DzlWiyNPJU',
    title: '秋田ノーザンハピネッツ 試合ハイライト vs アルバルク東京',
    description: 'B.LEAGUE 2024-25シーズン 注目の一戦をハイライトでお届け。',
    category: 'highlight',
    tags: ['試合', 'ハイライト', 'アルバルク', 'Bリーグ'],
  },
  {
    id: 'hjX5rhceKpA',
    title: '【選手インタビュー】シーズンを振り返って',
    description: '主力選手がシーズンの手応えと課題を語る。',
    category: 'interview',
    tags: ['選手', 'インタビュー', 'シーズン'],
  },
  {
    id: 'D2nR0NFsgbo',
    title: '選手からファンへのメッセージ 2025',
    description: 'いつも応援ありがとう！選手たちからファンの皆様へ感謝のメッセージ。',
    category: 'message',
    tags: ['選手', 'メッセージ', 'ファン', '感謝'],
  },
  {
    id: '4DzlWiyNPJU',
    title: '秋田ノーザンハピネッツ 試合ハイライト vs 千葉ジェッツ',
    description: 'ホームゲームの熱い戦いをダイジェストで。',
    category: 'highlight',
    tags: ['試合', 'ハイライト', '千葉ジェッツ', 'ホーム'],
  },
  {
    id: 'hjX5rhceKpA',
    title: 'ハピネッツチアリーダーズ パフォーマンス集',
    description: 'ハーフタイムを盛り上げるチアリーダーズの最高のパフォーマンス。',
    category: 'cheer',
    tags: ['チア', 'チアリーダーズ', 'パフォーマンス', 'ハーフタイム'],
  },
  {
    id: 'D2nR0NFsgbo',
    title: '【密着】試合当日の舞台裏に潜入！',
    description: 'CNAアリーナの裏側をお見せします。選手の準備から試合直前の緊張感まで。',
    category: 'behind',
    tags: ['舞台裏', '密着', 'アリーナ', '裏側'],
  },
  {
    id: '4DzlWiyNPJU',
    title: 'キャプテンからの開幕メッセージ',
    description: '新シーズン開幕に向けたキャプテンの意気込み。',
    category: 'message',
    tags: ['キャプテン', 'メッセージ', '開幕', 'シーズン'],
  },
  {
    id: 'hjX5rhceKpA',
    title: 'ファン感謝祭 2025 ダイジェスト',
    description: 'ファンとの交流イベントの模様をお届け。',
    category: 'cheer',
    tags: ['ファン', '感謝祭', 'イベント', '交流'],
  },
];

// --- LIFF設定 ---
const LIFF_ID = '2009109071-mxy5adpB';

// --- グローバル変数 ---
let swiper = null;
let players = {};
let currentSlideIndex = 0;
let filteredVideos = [...ALL_VIDEOS];
let activeCategory = 'all';
let searchQuery = '';
let isFullscreenMode = false; // 全画面モード（横画面 or 手動フルスクリーン）
let overlayTimer = null;
let ytApiReady = false;
let appInitialized = false;
let searchDebounceTimer = null;
let liffAvailable = false;

// ============================================
// 初期化
// ============================================

window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  if (appInitialized && filteredVideos.length > 0) {
    createPlayerForSlide(0);
  }
};

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) { ytApiReady = true; resolve(); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const timeout = setTimeout(() => { resolve(); }, 8000);
    const orig = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      clearTimeout(timeout); ytApiReady = true; if (orig) orig(); resolve();
    };
    tag.onerror = () => { clearTimeout(timeout); resolve(); };
    document.head.appendChild(tag);
  });
}

async function initLIFF() {
  if (!LIFF_ID || window.__liffLoadFailed || typeof liff === 'undefined') return;
  try { await liff.init({ liffId: LIFF_ID }); liffAvailable = true; } catch (e) { console.warn('LIFF:', e); }
}

function isInLineClient() {
  try { return liffAvailable && liff.isInClient(); } catch (e) { return false; }
}

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  await initLIFF();
  buildFilterChips();
  setupSearch();
  applyFilter();
  setupFullscreenHandler();
  setupFsControls();
  appInitialized = true;
  await loadYouTubeAPI();
  if (ytApiReady && filteredVideos.length > 0) createPlayerForSlide(0);
}

// ============================================
// フィルター & 検索
// ============================================

function buildFilterChips() {
  const scroll = document.querySelector('.filter-scroll');
  scroll.innerHTML = CATEGORIES.map(cat =>
    `<button class="filter-chip ${cat.key === 'all' ? 'active' : ''}" data-category="${cat.key}">${cat.label}</button>`
  ).join('');
  scroll.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (chip) setActiveCategory(chip.dataset.category);
  });
}

function setActiveCategory(category) {
  activeCategory = category;
  document.querySelectorAll('.filter-chip').forEach(chip =>
    chip.classList.toggle('active', chip.dataset.category === category)
  );
  applyFilter();
}

function setupSearch() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClear');
  const resetBtn = document.getElementById('resetFilterBtn');

  input.addEventListener('input', () => {
    const val = input.value.trim();
    clearBtn.style.display = val ? 'flex' : 'none';
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => { searchQuery = val; applyFilter(); }, 250);
  });

  clearBtn.addEventListener('click', () => {
    input.value = ''; clearBtn.style.display = 'none'; searchQuery = ''; applyFilter();
  });

  resetBtn.addEventListener('click', () => {
    input.value = ''; clearBtn.style.display = 'none'; searchQuery = ''; setActiveCategory('all');
  });
}

function applyFilter() {
  destroyAllPlayers();
  filteredVideos = ALL_VIDEOS.filter(video => {
    const matchCat = activeCategory === 'all' || video.category === activeCategory;
    if (!matchCat) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return video.title.toLowerCase().includes(q) ||
           video.description.toLowerCase().includes(q) ||
           video.tags.some(tag => tag.toLowerCase().includes(q));
  });
  currentSlideIndex = 0;

  const hasResults = filteredVideos.length > 0;
  document.getElementById('playerSection').classList.toggle('hidden', !hasResults);
  document.getElementById('playerBar').classList.toggle('hidden', !hasResults);
  document.getElementById('videoInfo').classList.toggle('hidden', !hasResults);
  document.getElementById('videoGrid').style.display = hasResults ? '' : 'none';
  document.getElementById('noResults').style.display = hasResults ? 'none' : 'flex';

  const catLabel = CATEGORIES.find(c => c.key === activeCategory)?.label || 'すべて';
  document.getElementById('listHeading').textContent = activeCategory === 'all' ? 'ALL MOVIES' : catLabel;
  document.getElementById('listCount').textContent = `${filteredVideos.length}本`;

  if (hasResults) {
    buildSwiperSlides();
    buildVideoGrid();
    initSwiper();
    updateVideoInfo(0);
    updateDots(0);
    if (ytApiReady) createPlayerForSlide(0);
  }
}

// ============================================
// プレーヤー & スワイパー
// ============================================

function buildSwiperSlides() {
  const wrapper = document.getElementById('swiperWrapper');
  wrapper.innerHTML = filteredVideos.map((video, i) => `
    <div class="swiper-slide" data-index="${i}">
      <div class="video-frame-wrapper" id="playerWrapper-${i}">
        <div class="video-thumbnail-slide" id="thumbnail-${i}">
          <img src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg" alt="${video.title}">
          <div class="thumbnail-play-icon"></div>
        </div>
        <div class="touch-overlay" data-index="${i}">
          <div class="tap-to-play" id="tapIcon-${i}"></div>
        </div>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.touch-overlay').forEach(setupTouchOverlay);
}

function setupTouchOverlay(overlay) {
  let sx = 0, sy = 0, st = 0;
  overlay.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  overlay.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (Math.abs(t.clientX - sx) < 15 && Math.abs(t.clientY - sy) < 15 && Date.now() - st < 300) {
      const idx = parseInt(overlay.dataset.index);
      if (isFullscreenMode) { toggleFsOverlay(); } else { togglePlayPause(idx); }
    }
  }, { passive: true });
  overlay.addEventListener('click', () => {
    const idx = parseInt(overlay.dataset.index);
    if (isFullscreenMode) { toggleFsOverlay(); } else { togglePlayPause(idx); }
  });
}

function togglePlayPause(index) {
  const player = players[index];
  if (!player) { createPlayerForSlide(index); return; }
  try {
    const state = player.getPlayerState();
    const icon = document.getElementById(`tapIcon-${index}`);
    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      if (icon) { icon.classList.add('paused', 'show'); setTimeout(() => icon.classList.remove('show'), 800); }
    } else {
      player.playVideo();
      if (icon) { icon.classList.remove('paused'); icon.classList.add('show'); setTimeout(() => icon.classList.remove('show'), 800); }
    }
  } catch (e) { createPlayerForSlide(index); }
}

function buildVideoGrid() {
  const grid = document.getElementById('videoGrid');
  grid.innerHTML = filteredVideos.map((video, i) => {
    const catLabel = CATEGORIES.find(c => c.key === video.category)?.label || '';
    return `
      <div class="video-card ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="goToVideo(${i})">
        <div class="card-thumbnail">
          <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="${video.title}">
          <span class="card-category-badge">${catLabel}</span>
          ${i === 0 ? '<span class="card-now-playing">再生中</span>' : ''}
        </div>
        <div class="card-info">
          <div class="card-title">${video.title}</div>
          <div class="card-meta">秋田ノーザンハピネッツ</div>
        </div>
      </div>`;
  }).join('');
}

function initSwiper() {
  if (swiper) { swiper.destroy(true, true); swiper = null; }
  swiper = new Swiper('#playerSwiper', {
    slidesPerView: 1,
    spaceBetween: 0,
    resistance: true,
    resistanceRatio: 0.3,
    speed: 300,
    threshold: 10,
    touchEventsTarget: 'container',
    on: { slideChange: function () { onSlideChange(this.activeIndex); } },
  });
}

function onSlideChange(newIndex) {
  pausePlayer(currentSlideIndex);
  currentSlideIndex = newIndex;
  updateVideoInfo(newIndex);
  updateDots(newIndex);
  updateVideoGrid(newIndex);
  updateFsUI(newIndex);
  createPlayerForSlide(newIndex);
}

function goToVideo(index) {
  if (swiper) swiper.slideTo(index);
}

function createPlayerForSlide(index) {
  if (!ytApiReady || !window.YT || !window.YT.Player) return;
  if (index >= filteredVideos.length) return;
  const video = filteredVideos[index];
  const wrapper = document.getElementById(`playerWrapper-${index}`);
  if (!wrapper) return;

  if (players[index]) {
    try { players[index].playVideo(); } catch (e) { rebuildPlayer(index); }
    return;
  }

  const thumb = document.getElementById(`thumbnail-${index}`);
  if (thumb) thumb.style.display = 'none';

  const div = document.createElement('div');
  div.id = `ytplayer-${index}`;
  wrapper.appendChild(div);

  try {
    players[index] = new YT.Player(`ytplayer-${index}`, {
      videoId: video.id,
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, controls: 1, fs: 0 },
      events: {
        onReady: (e) => { try { e.target.playVideo(); } catch (err) {} },
        onError: (e) => { console.warn('YT error:', e.data); },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED && currentSlideIndex < filteredVideos.length - 1) {
            goToVideo(currentSlideIndex + 1);
          }
        },
      },
    });
  } catch (e) { console.warn('YT player create failed:', e); }
}

function rebuildPlayer(index) {
  if (players[index]) { try { players[index].destroy(); } catch (e) {} delete players[index]; }
  const old = document.getElementById(`ytplayer-${index}`);
  if (old) old.remove();
  createPlayerForSlide(index);
}

function pausePlayer(index) {
  if (players[index]) { try { players[index].pauseVideo(); } catch (e) {} }
}

function destroyAllPlayers() {
  Object.keys(players).forEach(k => { try { players[k].destroy(); } catch (e) {} });
  players = {};
}

// ============================================
// UI更新
// ============================================

function updateVideoInfo(index) {
  if (index >= filteredVideos.length) return;
  const video = filteredVideos[index];
  const catLabel = CATEGORIES.find(c => c.key === video.category)?.label || '';
  document.getElementById('videoCategory').textContent = catLabel;
  document.getElementById('videoTitle').textContent = video.title;
  document.getElementById('videoDescription').textContent = video.description;
}

function updateDots(index) {
  document.getElementById('swipeDots').innerHTML = filteredVideos.map((_, i) =>
    `<div class="swipe-dot ${i === index ? 'active' : ''}"></div>`
  ).join('');
}

function updateVideoGrid(index) {
  document.querySelectorAll('.video-card').forEach((card, i) => {
    card.classList.toggle('active', i === index);
    const badge = card.querySelector('.card-now-playing');
    if (i === index && !badge) {
      const span = document.createElement('span');
      span.className = 'card-now-playing';
      span.textContent = '再生中';
      card.querySelector('.card-thumbnail').appendChild(span);
    } else if (i !== index && badge) { badge.remove(); }
  });
}

// ============================================
// フルスクリーン（横画面自動 + ボタン手動）
// ============================================

function isLandscape() {
  // screen.orientation API（キーボード表示に影響されない）
  if (screen.orientation && screen.orientation.type) {
    return screen.orientation.type.startsWith('landscape');
  }
  // CSS media query（キーボードに影響されない）
  if (window.matchMedia) {
    return window.matchMedia('(orientation: landscape)').matches;
  }
  // 最終フォールバック: screen寸法（キーボードで変わらない）
  return (screen.width || window.innerWidth) > (screen.height || window.innerHeight);
}

function setupFullscreenHandler() {
  // 画面回転検知（キーボード表示ではなく実際の回転のみ検知）
  let lastOrientation = isLandscape();

  const checkOrientation = () => {
    const landscape = isLandscape();
    // 実際に方向が変わった場合のみ処理
    if (landscape === lastOrientation) return;
    lastOrientation = landscape;

    if (landscape && !isFullscreenMode) {
      enterFullscreenMode(true);
    } else if (!landscape && isFullscreenMode) {
      exitFullscreenMode();
    }
  };

  // orientationchangeイベントを優先（実際の回転のみ発火）
  if (screen.orientation) {
    screen.orientation.addEventListener('change', () => setTimeout(checkOrientation, 100));
  } else {
    window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 200));
  }
  // resizeでもチェック（ただしデバウンス付き）
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(checkOrientation, 300);
  });
  checkOrientation();

  // 全画面ボタン（縦画面で押す）
  const fsBtn = document.getElementById('fullscreenBtn');
  fsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    enterFullscreenMode(false);
  });
  // タッチイベントも追加（LINE内ブラウザ対応）
  fsBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    enterFullscreenMode(false);
  });

  // Fullscreen API の状態変化を監視
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
}

function onFullscreenChange() {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (!fsEl && isFullscreenMode) {
    // ブラウザ側でフルスクリーンが解除された
    isFullscreenMode = false;
    document.body.classList.remove('fs-active');
    document.getElementById('fsOverlay').classList.remove('visible');
    clearTimeout(overlayTimer);
    // Swiperリサイズ
    setTimeout(() => { if (swiper) swiper.update(); }, 100);
  }
}

function enterFullscreenMode(isAutoLandscape) {
  isFullscreenMode = true;
  document.body.classList.add('fs-active');
  updateFsUI(currentSlideIndex);

  // Fullscreen APIを試行（ブラウザクロームを隠す）
  const container = document.getElementById('fullscreenContainer');
  if (!isAutoLandscape) {
    // 手動ボタン：Fullscreen APIでブラウザバーを隠す + 横向きロック
    requestFS(container).then(() => {
      tryLockLandscape();
    });
  } else {
    // 横画面自動：Fullscreen APIを試行
    requestFS(container);
  }

  // オーバーレイ表示
  document.getElementById('fsOverlay').classList.add('visible');
  resetOverlayTimer();

  // Swiperリサイズ（段階的にリトライ）
  setTimeout(() => { if (swiper) swiper.update(); }, 150);
  setTimeout(() => { if (swiper) swiper.update(); }, 500);
}

function exitFullscreenMode() {
  isFullscreenMode = false;
  document.body.classList.remove('fs-active');
  document.getElementById('fsOverlay').classList.remove('visible');
  clearTimeout(overlayTimer);

  // Fullscreen API解除
  exitFS();
  // 画面ロック解除
  tryUnlockOrientation();

  setTimeout(() => { if (swiper) swiper.update(); }, 100);
}

// --- Fullscreen API ヘルパー ---
function requestFS(el) {
  try {
    if (el.requestFullscreen) return el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); return Promise.resolve(); }
  } catch (e) {}
  return Promise.resolve();
}

function exitFS() {
  try {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  } catch (e) {}
}

function tryLockLandscape() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } catch (e) {}
}

function tryUnlockOrientation() {
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch (e) {}
}

// ============================================
// フルスクリーン UI コントロール
// ============================================

function updateFsUI(index) {
  if (index >= filteredVideos.length) return;
  const video = filteredVideos[index];
  document.getElementById('fsTitle').textContent = video.title;
  document.getElementById('fsCounter').textContent = `${index + 1} / ${filteredVideos.length}`;
  document.getElementById('fsPrevBtn').style.visibility = index > 0 ? 'visible' : 'hidden';
  document.getElementById('fsNextBtn').style.visibility = index < filteredVideos.length - 1 ? 'visible' : 'hidden';
}

function setupFsControls() {
  // 閉じるボタン → フルスクリーン解除
  document.getElementById('fsBackBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    exitFullscreenMode();
  });

  // 前の動画
  document.getElementById('fsPrevBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentSlideIndex > 0) goToVideo(currentSlideIndex - 1);
    resetOverlayTimer();
  });

  // 次の動画
  document.getElementById('fsNextBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentSlideIndex < filteredVideos.length - 1) goToVideo(currentSlideIndex + 1);
    resetOverlayTimer();
  });
}

function toggleFsOverlay() {
  const overlay = document.getElementById('fsOverlay');
  if (overlay.classList.contains('visible')) {
    overlay.classList.remove('visible');
    clearTimeout(overlayTimer);
  } else {
    overlay.classList.add('visible');
    resetOverlayTimer();
  }
}

function resetOverlayTimer() {
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => {
    document.getElementById('fsOverlay').classList.remove('visible');
  }, 4000);
}
