/* ============================================
   MOVIE GALLERY
   LINE LIFF App - Main Application
   ============================================ */

// カテゴリ・動画データは js/videos.js（集計ページと共用）

// --- LIFF設定 ---
// LINEミニアプリ「秋田ノーザンハピネッツムービーギャラリー」
// プロバイダー=秋田ノーザンハピネッツ株式会社 (再申請用に再作成 / チャネルID 2010426723/724/726)
// 本番用LIFF ID。審査用=2010426724-SQjJAsuz / 開発用=2010426723-4IoTyE4N
// ※liff.initはtry/catchで握りつぶしており、IDが環境と不一致でもアプリ表示には影響しない
const LIFF_ID = '2010426726-rVwJAcaH';

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
// 視聴計測
// - open: アプリを開いた / play: 3秒以上再生 / complete: 最後まで再生
// - 個人情報は送らない。端末ごとのランダムIDのみ（人数の重複除外用）
// - 計測の失敗がアプリの動作に影響しないよう、すべて握りつぶす
// ============================================

const PLAY_THRESHOLD_SEC = 3;
let viewState = { index: -1, played: false, completed: false };

function getViewerId() {
  try {
    let id = localStorage.getItem('mg_viewer_id');
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem('mg_viewer_id', id);
    }
    return id;
  } catch (e) { return null; }
}

function track(event, videoKey, extra) {
  try {
    let inLine = false;
    try { inLine = liffAvailable && liff.isInClient(); } catch (e) {}
    const body = JSON.stringify({ e: event, v: videoKey || null, u: getViewerId(), l: inLine, ...(extra || {}) });
    // 文字列のsendBeaconは text/plain 扱いでプリフライトが発生しない
    if (navigator.sendBeacon && navigator.sendBeacon(TRACK_URL, body)) return;
    fetch(TRACK_URL, { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => {});
  } catch (e) {}
}

// アプリを開いた記録。公式アカウントと友だちかどうかも分かる範囲で添える
// （チャネルに公式アカウントが紐づいていない場合は取得できないので null のまま送る）
async function trackOpen() {
  let friend = null;
  try {
    if (liffAvailable && liff.isLoggedIn()) {
      const r = await Promise.race([
        liff.getFriendship(),
        new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (r && typeof r.friendFlag === 'boolean') friend = r.friendFlag;
    }
  } catch (e) {}
  track('open', null, { f: friend });
}

function onVideoProgress(index, video) {
  if (index !== viewState.index || video.paused) return;
  const item = filteredVideos[index];
  if (!item) return;
  if (!viewState.played && video.currentTime >= PLAY_THRESHOLD_SEC) {
    viewState.played = true;
    track('play', item.key);
  }
  // loop再生のため ended は発火しない。終端の手前に到達した時点で視聴完了とする
  if (viewState.played && !viewState.completed && video.duration && video.currentTime >= video.duration - 1) {
    viewState.completed = true;
    track('complete', item.key);
  }
}

// ============================================
// 初期化
// ============================================

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  await initLIFF();
  trackOpen(); // 待たない（表示を遅らせない）
  buildFilterChips();
  setupSearch();
  applyFilter();
  setupFullscreenHandler();
  setupFsControls();
  setupUserInteraction();
  setupFooterLinks();
  setupMiniAppActions();
  appInitialized = true;
}

// ============================================
// LINEミニアプリ機能（認証済ミニアプリ向け）
// - ホーム画面に追加: liff.createShortcutOnHomeScreen（認証済のみ・LIFF v2.23.0+）
// - 友だちに送る: liff.shareTargetPicker（コンソールでシェアターゲットピッカーON が必要）
// どちらも liff.isApiAvailable で使える環境のときだけボタンを出す
// ============================================

const MINI_APP_URL = `https://miniapp.line.me/${LIFF_ID}`;

function isLiffApiAvailable(name) {
  try { return liffAvailable && liff.isInClient() && liff.isApiAvailable(name); } catch (e) { return false; }
}

function setupMiniAppActions() {
  const wrap = document.getElementById('miniActions');
  const shareBtn = document.getElementById('shareBtn');
  const shortcutBtn = document.getElementById('shortcutBtn');
  let any = false;

  if (isLiffApiAvailable('shareTargetPicker')) {
    shareBtn.hidden = false;
    any = true;
    shareBtn.addEventListener('click', shareCurrentVideo);
  }

  if (isLiffApiAvailable('createShortcutOnHomeScreen')) {
    shortcutBtn.hidden = false;
    any = true;
    shortcutBtn.addEventListener('click', async () => {
      try {
        await liff.createShortcutOnHomeScreen({ url: MINI_APP_URL });
      } catch (e) {
        console.warn('shortcut:', e);
      }
    });
  }

  wrap.hidden = !any;
}

async function shareCurrentVideo() {
  const video = filteredVideos[currentSlideIndex];
  const title = video ? `「${video.title}」` : '';
  const text = `秋田ノーザンハピネッツ ムービーギャラリーで${title}を観よう！\n${MINI_APP_URL}`;
  try {
    await liff.shareTargetPicker([{ type: 'text', text }], { isMultiple: true });
  } catch (e) {
    // コンソール側でシェアターゲットピッカーが無効な場合など。ボタンを隠して以後出さない
    console.warn('share:', e);
    document.getElementById('shareBtn').hidden = true;
    const shortcutHidden = document.getElementById('shortcutBtn').hidden;
    if (shortcutHidden) document.getElementById('miniActions').hidden = true;
  }
}

// フッターのプラポリ・利用規約リンク（外部リダイレクトを避け、LINE内ブラウザ/別タブで開く）
function setupFooterLinks() {
  const urls = {
    privacy: 'https://northern-happinets.com/privacy/',
    terms: 'https://northern-happinets.com/rule/',
  };
  document.querySelectorAll('.footer-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = urls[btn.dataset.doc];
      if (!url) return;
      // LIFF環境では liff.openWindow(external:false) でLINE内ブラウザ表示（ミニアプリから離脱しない）
      if (liffAvailable && typeof liff !== 'undefined' && liff.openWindow) {
        try { liff.openWindow({ url, external: false }); return; } catch (e) {}
      }
      // 通常ブラウザ用フォールバック
      window.open(url, '_blank', 'noopener');
    });
  });
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

  // 視聴計測
  filteredVideos.forEach((_, i) => {
    const v = document.getElementById(`video-${i}`);
    if (v) v.addEventListener('timeupdate', () => onVideoProgress(i, v));
  });
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
  viewState = { index, played: false, completed: false };
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
