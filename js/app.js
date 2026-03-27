/* ============================================
   MOVIE GALLERY
   LINE LIFF App - Main Application
   ============================================ */

// --- カテゴリ定義 ---
const CATEGORIES = [
  { key: 'all',     label: 'すべて' },
  { key: 'player',  label: '選手紹介' },
  { key: 'action',  label: 'アクション' },
  { key: 'story',   label: 'ストーリー' },
  { key: 'scene',   label: 'ワンシーン' },
];

// --- Firebase Storage ベースURL ---
const STORAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0306469427.firebasestorage.app/o';
const media = (path) => `${STORAGE_BASE}/${encodeURIComponent(path)}?alt=media`;

// --- 動画データ ---
const ALL_VIDEOS = [
  {
    src: media('movies/1 中山拓哉 ドラフト01.mp4'),
    title: '中山拓哉',
    description: '中山拓哉選手の紹介ムービー。',
    category: 'player',
    tags: ['中山拓哉', '選手', '紹介'],
  },
  {
    src: media('movies/2 田口成浩 ドラフト02.mp4'),
    title: '田口成浩',
    description: '田口成浩選手の紹介ムービー。',
    category: 'player',
    tags: ['田口成浩', '選手', '紹介'],
  },
  {
    src: media('movies/3 赤穂雷太 ドラフト01.mp4'),
    title: '赤穂雷太',
    description: '赤穂雷太選手の紹介ムービー。',
    category: 'player',
    tags: ['赤穂雷太', '選手', '紹介'],
  },
  {
    src: media('movies/4 元田大陽 ドラフト01.mp4'),
    title: '元田大陽',
    description: '元田大陽選手の紹介ムービー。',
    category: 'player',
    tags: ['元田大陽', '選手', '紹介'],
  },
  {
    src: media('movies/5 ヤニー・ウェッツェル ドラフト01.mp4'),
    title: 'ヤニー・ウェッツェル',
    description: 'ヤニー・ウェッツェル選手の紹介ムービー。',
    category: 'player',
    tags: ['ヤニー・ウェッツェル', '選手', '紹介'],
  },
  {
    src: media('movies/バスケットボールコートでの乱入.mp4'),
    title: 'バスケットボールコートでの乱入',
    description: '試合中に予想外の乱入者が現れる衝撃のシーン。',
    category: 'action',
    tags: ['バスケ', '乱入', 'コート', 'アクション'],
  },
  {
    src: media('movies/ダンクシュート動画生成.mp4'),
    title: '渾身のダンクシュート',
    description: '圧巻のダンクシュートが炸裂する瞬間。',
    category: 'action',
    tags: ['バスケ', 'ダンク', 'シュート', 'アクション'],
  },
  {
    src: media('movies/高校生、体育館で土下座.mp4'),
    title: '体育館での土下座',
    description: '体育館で高校生が土下座する緊迫のシーン。',
    category: 'story',
    tags: ['高校生', '体育館', '土下座', 'ドラマ'],
  },
  {
    src: media('movies/チームメイトとの和解ハイタッチ.mp4'),
    title: 'チームメイトとの和解',
    description: 'ハイタッチで仲間との絆を確かめ合う感動の瞬間。',
    category: 'story',
    tags: ['チームメイト', '和解', 'ハイタッチ', '感動'],
  },
  {
    src: media('movies/海岸を歩く男性の動画.mp4'),
    title: '海岸を歩く男',
    description: '波打ち際を一人歩く男の姿。',
    category: 'scene',
    tags: ['海岸', '風景', 'シーン'],
  },
  {
    src: media('movies/c03f0813-cf0e-4234-8c04-0628028cdc18.mp4'),
    title: 'スペシャルムービー',
    description: '特別映像をお届けします。',
    category: 'scene',
    tags: ['スペシャル', '特別'],
  },
];

// --- LIFF設定 ---
const LIFF_ID = '2009109071-mxy5adpB';

// --- グローバル変数 ---
let swiper = null;
let currentSlideIndex = 0;
let filteredVideos = [...ALL_VIDEOS];
let activeCategory = 'all';
let searchQuery = '';
let isFullscreenMode = false;
let overlayTimer = null;
let appInitialized = false;
let searchDebounceTimer = null;
let liffAvailable = false;
let userInteracted = false; // ユーザーが画面操作したか（ミュート解除用）

// ============================================
// 初期化
// ============================================

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  await initLIFF();
  buildFilterChips();
  setupSearch();
  applyFilter();
  setupFullscreenHandler();
  setupFsControls();
  setupUserInteraction();
  appInitialized = true;
}

async function initLIFF() {
  if (!LIFF_ID || window.__liffLoadFailed || typeof liff === 'undefined') return;
  try { await liff.init({ liffId: LIFF_ID }); liffAvailable = true; } catch (e) { console.warn('LIFF:', e); }
}

// ユーザー初回操作でミュート解除
function setupUserInteraction() {
  const unlock = () => {
    if (userInteracted) return;
    userInteracted = true;
    const video = document.getElementById(`video-${currentSlideIndex}`);
    if (video) {
      video.muted = false;
    }
  };
  document.addEventListener('touchstart', unlock, { once: true });
  document.addEventListener('click', unlock, { once: true });
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

  input.addEventListener('focus', () => {
    document.getElementById('mainContent').style.overflow = 'hidden';
    setTimeout(() => window.scrollTo(0, 0), 50);
  });
  input.addEventListener('blur', () => {
    document.getElementById('mainContent').style.overflow = '';
  });
  input.addEventListener('touchstart', (e) => { e.stopPropagation(); });

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
  // 現在の動画をすべて停止
  filteredVideos.forEach((_, i) => pausePlayer(i));

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
    // 最初の動画を自動再生
    playVideo(0);
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
        <video
          class="slide-video"
          id="video-${i}"
          preload="${i <= 1 ? 'auto' : 'metadata'}"
          playsinline
          webkit-playsinline
          muted
          loop
          src="${video.src}"
        ></video>
        <div class="touch-overlay" data-index="${i}">
          <div class="tap-to-play" id="tapIcon-${i}"></div>
        </div>
      </div>
    </div>
  `).join('');

  // タッチオーバーレイ設定
  document.querySelectorAll('.touch-overlay').forEach(setupTouchOverlay);
}

function setupTouchOverlay(overlay) {
  let sx = 0, sy = 0, st = 0;
  let handledByTouch = false;

  overlay.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    st = Date.now();
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (Math.abs(t.clientX - sx) < 15 && Math.abs(t.clientY - sy) < 15 && Date.now() - st < 300) {
      handledByTouch = true;
      setTimeout(() => { handledByTouch = false; }, 500);
      const idx = parseInt(overlay.dataset.index);
      if (isFullscreenMode) { toggleFsOverlay(); } else { handleTap(idx); }
    }
  }, { passive: true });

  // デスクトップ用 click（touchend で処理済みならスキップ）
  overlay.addEventListener('click', () => {
    if (handledByTouch) return;
    const idx = parseInt(overlay.dataset.index);
    if (isFullscreenMode) { toggleFsOverlay(); } else { handleTap(idx); }
  });
}

// タップ処理: 初回はミュート解除、以降は再生/一時停止トグル
function handleTap(index) {
  const video = document.getElementById(`video-${index}`);
  if (!video) return;

  // ミュート中なら解除して再生継続
  if (video.muted) {
    video.muted = false;
    userInteracted = true;
    // 停止中なら再生開始
    if (video.paused) {
      video.play().catch(() => {});
    }
    return;
  }

  // 再生/一時停止トグル
  togglePlayPause(index);
}

function togglePlayPause(index) {
  const video = document.getElementById(`video-${index}`);
  if (!video) return;
  const icon = document.getElementById(`tapIcon-${index}`);

  if (video.paused) {
    video.play().catch(() => {});
    if (icon) { icon.classList.remove('paused'); icon.classList.add('show'); setTimeout(() => icon.classList.remove('show'), 800); }
  } else {
    video.pause();
    if (icon) { icon.classList.add('paused', 'show'); setTimeout(() => icon.classList.remove('show'), 800); }
  }
}

// 動画を自動再生（ミュートならミュートのまま）
function playVideo(index) {
  const video = document.getElementById(`video-${index}`);
  if (!video) return;

  // ユーザー操作済みならミュート解除
  video.muted = !userInteracted;
  video.currentTime = 0;
  video.play().catch(() => {
    // ブロックされたらミュートで再試行
    video.muted = true;
    video.play().catch(() => {});
  });

  // 隣接動画をプリロード
  preloadAdjacent(index);
}

function preloadAdjacent(index) {
  [index - 1, index + 1].forEach(i => {
    if (i >= 0 && i < filteredVideos.length) {
      const v = document.getElementById(`video-${i}`);
      if (v && v.preload !== 'auto') v.preload = 'auto';
    }
  });
}

function buildVideoGrid() {
  const grid = document.getElementById('videoGrid');
  grid.innerHTML = filteredVideos.map((video, i) => {
    const catLabel = CATEGORIES.find(c => c.key === video.category)?.label || '';
    return `
      <div class="video-card ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="goToVideo(${i})">
        <div class="card-thumbnail">
          <video preload="metadata" muted playsinline src="${video.src}#t=0.5"></video>
          <span class="card-category-badge">${catLabel}</span>
          ${i === 0 ? '<span class="card-now-playing">再生中</span>' : ''}
        </div>
        <div class="card-info">
          <div class="card-title">${video.title}</div>
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

  // 新しい動画を自動再生
  playVideo(newIndex);
}

function goToVideo(index) {
  if (swiper) swiper.slideTo(index);
}

function pausePlayer(index) {
  const video = document.getElementById(`video-${index}`);
  if (video) { try { video.pause(); } catch (e) {} }
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
// フルスクリーン（縦画面対応）
// ============================================

function setupFullscreenHandler() {
  const fsBtn = document.getElementById('fullscreenBtn');
  fsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    enterFullscreenMode();
  });
  fsBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    enterFullscreenMode();
  });

  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
}

function onFullscreenChange() {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (!fsEl && isFullscreenMode) {
    isFullscreenMode = false;
    document.body.classList.remove('fs-active');
    document.getElementById('fsOverlay').classList.remove('visible');
    clearTimeout(overlayTimer);
    setTimeout(() => { if (swiper) swiper.update(); }, 100);
  }
}

function enterFullscreenMode() {
  isFullscreenMode = true;
  document.body.classList.add('fs-active');
  updateFsUI(currentSlideIndex);

  const container = document.getElementById('fullscreenContainer');
  requestFS(container);

  document.getElementById('fsOverlay').classList.add('visible');
  resetOverlayTimer();

  setTimeout(() => { if (swiper) swiper.update(); }, 150);
  setTimeout(() => { if (swiper) swiper.update(); }, 500);
}

function exitFullscreenMode() {
  isFullscreenMode = false;
  document.body.classList.remove('fs-active');
  document.getElementById('fsOverlay').classList.remove('visible');
  clearTimeout(overlayTimer);
  exitFS();
  setTimeout(() => { if (swiper) swiper.update(); }, 100);
}

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
  document.getElementById('fsBackBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    exitFullscreenMode();
  });

  document.getElementById('fsPrevBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentSlideIndex > 0) goToVideo(currentSlideIndex - 1);
    resetOverlayTimer();
  });

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
