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
let isLandscape = false;
let overlayTimer = null;
let ytApiReady = false;
let appInitialized = false;
let searchDebounceTimer = null;

// --- YouTube IFrame API Ready ---
window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  if (appInitialized && filteredVideos.length > 0) {
    createPlayerForSlide(0);
  }
};

// --- アプリ初期化 ---
document.addEventListener('DOMContentLoaded', function () {
  initApp();
});

async function initApp() {
  if (LIFF_ID) {
    try {
      await liff.init({ liffId: LIFF_ID });
    } catch (e) {
      console.warn('LIFF init failed:', e);
    }
  }

  buildFilterChips();
  setupSearch();
  applyFilter();
  setupOrientationHandler();
  setupLandscapeControls();

  appInitialized = true;

  if (ytApiReady && filteredVideos.length > 0) {
    createPlayerForSlide(0);
  }
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
    if (!chip) return;
    const category = chip.dataset.category;
    setActiveCategory(category);
  });
}

function setActiveCategory(category) {
  activeCategory = category;
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === category);
  });
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
    searchDebounceTimer = setTimeout(() => {
      searchQuery = val;
      applyFilter();
    }, 250);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    searchQuery = '';
    applyFilter();
  });

  resetBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    searchQuery = '';
    setActiveCategory('all');
  });
}

function applyFilter() {
  // すべてのプレーヤーを停止・破棄
  destroyAllPlayers();

  // フィルタリング
  filteredVideos = ALL_VIDEOS.filter(video => {
    const matchCategory = activeCategory === 'all' || video.category === activeCategory;
    if (!matchCategory) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      video.title.toLowerCase().includes(q) ||
      video.description.toLowerCase().includes(q) ||
      video.tags.some(tag => tag.toLowerCase().includes(q))
    );
  });

  currentSlideIndex = 0;

  // UI更新
  const hasResults = filteredVideos.length > 0;
  const playerSection = document.getElementById('playerSection');
  const swipeIndicator = document.getElementById('swipeIndicator');
  const videoInfo = document.getElementById('videoInfo');
  const videoGrid = document.getElementById('videoGrid');
  const noResults = document.getElementById('noResults');

  playerSection.classList.toggle('hidden', !hasResults);
  swipeIndicator.classList.toggle('hidden', !hasResults);
  videoInfo.classList.toggle('hidden', !hasResults);
  videoGrid.style.display = hasResults ? '' : 'none';
  noResults.style.display = hasResults ? 'none' : 'flex';

  // 見出し更新
  const categoryLabel = CATEGORIES.find(c => c.key === activeCategory)?.label || 'すべて';
  document.getElementById('listHeading').textContent =
    activeCategory === 'all' ? 'ALL MOVIES' : categoryLabel;
  document.getElementById('listCount').textContent = `${filteredVideos.length}本`;

  if (hasResults) {
    buildSwiperSlides();
    buildVideoGrid();
    initSwiper();
    updateVideoInfo(0);
    updateDots(0);

    if (ytApiReady) {
      createPlayerForSlide(0);
    }
  }
}

// ============================================
// プレーヤー & スワイパー
// ============================================

function buildSwiperSlides() {
  const wrapper = document.getElementById('swiperWrapper');
  wrapper.innerHTML = filteredVideos.map((video, index) => `
    <div class="swiper-slide" data-index="${index}">
      <div class="video-frame-wrapper" id="playerWrapper-${index}">
        <div class="video-thumbnail-slide" id="thumbnail-${index}">
          <img src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg" alt="${video.title}">
          <div class="thumbnail-play-icon"></div>
        </div>
        <div class="touch-overlay" data-index="${index}">
          <div class="tap-to-play" id="tapIcon-${index}"></div>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.touch-overlay').forEach(overlay => {
    setupTouchOverlay(overlay);
  });
}

function setupTouchOverlay(overlay) {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  const TAP_THRESHOLD = 15;
  const TAP_TIME = 300;

  overlay.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);
    const dt = Date.now() - touchStartTime;
    if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD && dt < TAP_TIME) {
      const index = parseInt(overlay.dataset.index);
      togglePlayPause(index);
    }
  }, { passive: true });

  overlay.addEventListener('click', () => {
    const index = parseInt(overlay.dataset.index);
    togglePlayPause(index);
  });
}

function togglePlayPause(index) {
  const player = players[index];
  if (!player) {
    createPlayerForSlide(index);
    return;
  }
  try {
    const state = player.getPlayerState();
    const tapIcon = document.getElementById(`tapIcon-${index}`);
    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      if (tapIcon) {
        tapIcon.classList.add('paused', 'show');
        setTimeout(() => tapIcon.classList.remove('show'), 800);
      }
    } else {
      player.playVideo();
      if (tapIcon) {
        tapIcon.classList.remove('paused');
        tapIcon.classList.add('show');
        setTimeout(() => tapIcon.classList.remove('show'), 800);
      }
    }
  } catch (e) {
    createPlayerForSlide(index);
  }
}

function buildVideoGrid() {
  const grid = document.getElementById('videoGrid');
  grid.innerHTML = filteredVideos.map((video, index) => {
    const catLabel = CATEGORIES.find(c => c.key === video.category)?.label || '';
    return `
      <div class="video-card ${index === 0 ? 'active' : ''}" data-index="${index}" onclick="goToVideo(${index})">
        <div class="card-thumbnail">
          <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="${video.title}">
          <span class="card-category-badge">${catLabel}</span>
          ${index === 0 ? '<span class="card-now-playing">再生中</span>' : ''}
        </div>
        <div class="card-info">
          <div class="card-title">${video.title}</div>
          <div class="card-meta">秋田ノーザンハピネッツ</div>
        </div>
      </div>
    `;
  }).join('');
}

function initSwiper() {
  if (swiper) {
    swiper.destroy(true, true);
    swiper = null;
  }
  swiper = new Swiper('#playerSwiper', {
    slidesPerView: 1,
    spaceBetween: 0,
    resistance: true,
    resistanceRatio: 0.3,
    speed: 300,
    threshold: 10,
    touchEventsTarget: 'container',
    on: {
      slideChange: function () {
        onSlideChange(this.activeIndex);
      },
    },
  });
}

function onSlideChange(newIndex) {
  pausePlayer(currentSlideIndex);
  currentSlideIndex = newIndex;
  updateVideoInfo(newIndex);
  updateDots(newIndex);
  updateVideoGrid(newIndex);
  updateLandscapeUI(newIndex);
  createPlayerForSlide(newIndex);
}

function goToVideo(index) {
  if (swiper) {
    swiper.slideTo(index);
  }
}

function createPlayerForSlide(index) {
  if (!ytApiReady || index >= filteredVideos.length) return;
  const video = filteredVideos[index];
  const thumbnail = document.getElementById(`thumbnail-${index}`);

  if (players[index]) {
    try { players[index].playVideo(); } catch (e) { rebuildPlayer(index); }
    return;
  }

  if (thumbnail) thumbnail.style.display = 'none';

  const wrapper = document.getElementById(`playerWrapper-${index}`);
  const playerDiv = document.createElement('div');
  playerDiv.id = `ytplayer-${index}`;
  wrapper.appendChild(playerDiv);

  players[index] = new YT.Player(`ytplayer-${index}`, {
    videoId: video.id,
    playerVars: {
      autoplay: 1,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
      controls: 1,
      fs: 0,
    },
    events: {
      onReady: (event) => event.target.playVideo(),
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.ENDED) {
          if (currentSlideIndex < filteredVideos.length - 1) {
            goToVideo(currentSlideIndex + 1);
          }
        }
      },
    },
  });
}

function rebuildPlayer(index) {
  if (players[index]) {
    try { players[index].destroy(); } catch (e) {}
    delete players[index];
  }
  const old = document.getElementById(`ytplayer-${index}`);
  if (old) old.remove();
  createPlayerForSlide(index);
}

function pausePlayer(index) {
  if (players[index]) {
    try { players[index].pauseVideo(); } catch (e) {}
  }
}

function destroyAllPlayers() {
  Object.keys(players).forEach(key => {
    try { players[key].destroy(); } catch (e) {}
  });
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
  const container = document.getElementById('swipeDots');
  container.innerHTML = filteredVideos.map((_, i) =>
    `<div class="swipe-dot ${i === index ? 'active' : ''}"></div>`
  ).join('');
}

function updateVideoGrid(index) {
  const cards = document.querySelectorAll('.video-card');
  cards.forEach((card, i) => {
    card.classList.toggle('active', i === index);
    const badge = card.querySelector('.card-now-playing');
    if (i === index) {
      if (!badge) {
        const thumb = card.querySelector('.card-thumbnail');
        const span = document.createElement('span');
        span.className = 'card-now-playing';
        span.textContent = '再生中';
        thumb.appendChild(span);
      }
    } else {
      if (badge) badge.remove();
    }
  });
}

// ============================================
// 画面回転 & 横画面コントロール
// ============================================

function setupOrientationHandler() {
  const check = () => {
    const was = isLandscape;
    isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape && !was) enterLandscapeMode();
    else if (!isLandscape && was) exitLandscapeMode();
  };
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', () => setTimeout(check, 100));
  check();
}

function enterLandscapeMode() {
  const overlay = document.getElementById('landscapeOverlay');
  updateLandscapeUI(currentSlideIndex);
  overlay.classList.add('visible');
  resetOverlayTimer();
}

function exitLandscapeMode() {
  document.getElementById('landscapeOverlay').classList.remove('visible');
  clearTimeout(overlayTimer);
}

function updateLandscapeUI(index) {
  if (index >= filteredVideos.length) return;
  const video = filteredVideos[index];
  document.getElementById('landscapeTitle').textContent = video.title;
  document.getElementById('videoCounter').textContent = `${index + 1} / ${filteredVideos.length}`;
  document.getElementById('prevBtn').style.visibility = index > 0 ? 'visible' : 'hidden';
  document.getElementById('nextBtn').style.visibility = index < filteredVideos.length - 1 ? 'visible' : 'hidden';
}

function setupLandscapeControls() {
  document.getElementById('playerSection').addEventListener('click', (e) => {
    if (!isLandscape) return;
    if (e.target.closest('.video-frame-wrapper')) toggleOverlay();
  });

  document.getElementById('prevBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentSlideIndex > 0) goToVideo(currentSlideIndex - 1);
    resetOverlayTimer();
  });

  document.getElementById('nextBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentSlideIndex < filteredVideos.length - 1) goToVideo(currentSlideIndex + 1);
    resetOverlayTimer();
  });

  document.getElementById('landscapeBackBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (LIFF_ID && liff.isInClient()) liff.closeWindow();
  });
}

function toggleOverlay() {
  const overlay = document.getElementById('landscapeOverlay');
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
    document.getElementById('landscapeOverlay').classList.remove('visible');
  }, 4000);
}
