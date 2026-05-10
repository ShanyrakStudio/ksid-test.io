// ===== SNAKE GAME =====
let canvas, ctx;
let snake = [];
let food = {};
let dx = 1, dy = 0;
let nextDx = 1, nextDy = 0;
let score = 0;
let gameLoop = null;
let isPaused = false;
let startTime = 0;
let isGameOver = true;
let isGameStarted = false;

const gridSize = 20;
const tileCount = 25;
const baseSpeed = 100;

// ===== GET USER ID FOR PERSISTENT HIGH SCORE =====
function getUserId() {
  const session = localStorage.getItem('ksid_session');
  if (session) {
    try {
      const s = JSON.parse(session);
      return s.id || 'guest';
    } catch(e) {}
  }
  // Fallback: use a persistent guest ID
  let guestId = localStorage.getItem('ksid_guest_id');
  if (!guestId) {
    guestId = 'guest_' + Date.now();
    localStorage.setItem('ksid_guest_id', guestId);
  }
  return guestId;
}

function getHighScoreKey() {
  return 'snake_high_' + getUserId();
}

function getHighScore() {
  return parseInt(localStorage.getItem(getHighScoreKey()) || '0');
}

function setHighScore(val) {
  localStorage.setItem(getHighScoreKey(), val.toString());
}

// ===== INIT =====
function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  // Resize canvas for high DPI
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = 500 * dpr;
  canvas.height = 500 * dpr;
  ctx.scale(dpr, dpr);
  
  // Initial draw
  drawEmptyBoard();
  updateStats();
  showOverlay('🐍', 'Нажми "Новая игра"', 'или клавишу R');
  
  // Setup D-pad
  setupDPad();
  
  // Setup keyboard
  document.addEventListener('keydown', handleKeyDown, { passive: false });
  
  // Setup touch/swipe
  setupTouch();
  
  // Prevent pull-to-refresh
  document.body.style.overscrollBehavior = 'none';
}

function drawEmptyBoard() {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, 500, 500);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= tileCount; i++) {
    ctx.beginPath(); ctx.moveTo(i * gridSize, 0); ctx.lineTo(i * gridSize, 500); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * gridSize); ctx.lineTo(500, i * gridSize); ctx.stroke();
  }
}

// ===== OVERLAY =====
function showOverlay(icon, title, subtitle) {
  const overlay = document.getElementById('gameOverlay');
  document.querySelector('.overlay-icon').textContent = icon;
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlaySubtitle').textContent = subtitle;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  document.getElementById('gameOverlay').classList.add('hidden');
}

// ===== START GAME =====
function startGame() {
  snake = [{x: 12, y: 12}];
  food = randomFood();
  dx = 1; dy = 0;
  nextDx = 1; nextDy = 0;
  score = 0;
  isPaused = false;
  isGameOver = false;
  isGameStarted = true;
  startTime = Date.now();
  
  updateStats();
  hideOverlay();
  
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, getSpeed());
  draw();
  
  updateButtonStates();
}

function getSpeed() {
  // Speed increases as snake grows
  const speed = baseSpeed - Math.min(snake.length * 2, 50);
  return Math.max(speed, 50);
}

function randomFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

// ===== UPDATE =====
function update() {
  if (isPaused || isGameOver || !isGameStarted) return;
  
  dx = nextDx;
  dy = nextDy;
  
  const head = {x: snake[0].x + dx, y: snake[0].y + dy};
  
  // Wall wrap
  if (head.x < 0) head.x = tileCount - 1;
  if (head.x >= tileCount) head.x = 0;
  if (head.y < 0) head.y = tileCount - 1;
  if (head.y >= tileCount) head.y = 0;
  
  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }
  
  snake.unshift(head);
  
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    showScorePopup(head.x * gridSize + gridSize/2, head.y * gridSize);
    food = randomFood();
    updateStats();
    
    // Adjust speed
    clearInterval(gameLoop);
    gameLoop = setInterval(update, getSpeed());
  } else {
    snake.pop();
  }
  
  draw();
  updateTime();
}

// ===== DRAW =====
function draw() {
  // Clear
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, 500, 500);
  
  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= tileCount; i++) {
    ctx.beginPath(); ctx.moveTo(i * gridSize, 0); ctx.lineTo(i * gridSize, 500); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * gridSize); ctx.lineTo(500, i * gridSize); ctx.stroke();
  }
  
  // Food with glow
  ctx.shadowColor = '#ff1744';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ff1744';
  ctx.beginPath();
  ctx.arc(food.x * gridSize + gridSize/2, food.y * gridSize + gridSize/2, gridSize/2 - 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Food inner highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff5252';
  ctx.beginPath();
  ctx.arc(food.x * gridSize + gridSize/2 - 2, food.y * gridSize + gridSize/2 - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Snake
  snake.forEach((seg, i) => {
    const x = seg.x * gridSize;
    const y = seg.y * gridSize;
    
    if (i === 0) {
      // Head
      const g = ctx.createLinearGradient(x, y, x + gridSize, y + gridSize);
      g.addColorStop(0, '#ff2d75');
      g.addColorStop(1, '#7c3aed');
      ctx.fillStyle = g;
      ctx.shadowColor = '#ff2d75';
      ctx.shadowBlur = 12;
      
      // Rounded head
      roundRect(ctx, x + 1, y + 1, gridSize - 2, gridSize - 2, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Eyes
      ctx.fillStyle = '#fff';
      const eyeOffset = 4;
      if (dx === 1) {
        ctx.fillRect(x + 12, y + 5, 4, 4);
        ctx.fillRect(x + 12, y + 12, 4, 4);
      } else if (dx === -1) {
        ctx.fillRect(x + 4, y + 5, 4, 4);
        ctx.fillRect(x + 4, y + 12, 4, 4);
      } else if (dy === -1) {
        ctx.fillRect(x + 5, y + 4, 4, 4);
        ctx.fillRect(x + 12, y + 4, 4, 4);
      } else {
        ctx.fillRect(x + 5, y + 12, 4, 4);
        ctx.fillRect(x + 12, y + 12, 4, 4);
      }
    } else {
      // Body
      const alpha = Math.max(0.3, 1 - i / (snake.length + 5));
      ctx.fillStyle = `rgba(255,45,117,${alpha})`;
      roundRect(ctx, x + 2, y + 2, gridSize - 4, gridSize - 4, 3);
      ctx.fill();
    }
  });
  
  ctx.shadowBlur = 0;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ===== SCORE POPUP =====
function showScorePopup(x, y) {
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = '+10';
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';
  document.querySelector('.game-area').appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

// ===== GAME OVER =====
function gameOver() {
  isGameOver = true;
  clearInterval(gameLoop);
  
  const high = getHighScore();
  if (score > high) {
    setHighScore(score);
    showOverlay('🏆', 'Новый рекорд: ' + score + '!', 'Твой лучший результат!');
    showToast('🏆 Новый рекорд: ' + score + '!', 'success');
  } else {
    showOverlay('💀', 'Игра окончена! Счёт: ' + score, 'Рекорд: ' + high);
    showToast('💀 Игра окончена! Счёт: ' + score, 'error');
  }
  
  updateStats();
  updateButtonStates();
}

// ===== STATS =====
function updateStats() {
  document.getElementById('statScore').textContent = score;
  document.getElementById('statHigh').textContent = getHighScore();
  document.getElementById('statLen').textContent = snake.length;
}

function updateTime() {
  if (!startTime) return;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');
  document.getElementById('statTime').textContent = mins + ':' + secs;
}

// ===== PAUSE =====
function togglePause() {
  if (isGameOver) {
    startGame();
    return;
  }
  if (!isGameStarted) {
    startGame();
    return;
  }
  
  isPaused = !isPaused;
  
  if (isPaused) {
    showOverlay('⏸', 'Пауза', 'Нажми снова для продолжения');
    showToast('⏸ Пауза');
  } else {
    hideOverlay();
    showToast('▶ Продолжаем!');
  }
  
  updateButtonStates();
}

function updateButtonStates() {
  const btnPause = document.getElementById('btnPause');
  const btnPausePad = document.getElementById('btnPausePad');
  
  if (isGameOver || !isGameStarted) {
    btnPause.textContent = '⏸ Пауза';
    if (btnPausePad) btnPausePad.textContent = '⏸';
  } else if (isPaused) {
    btnPause.textContent = '▶ Продолжить';
    if (btnPausePad) btnPausePad.textContent = '▶';
  } else {
    btnPause.textContent = '⏸ Пауза';
    if (btnPausePad) btnPausePad.textContent = '⏸';
  }
}

// ===== DIRECTION =====
function setDir(ndx, ndy) {
  // Prevent 180-degree turns
  if ((ndx !== 0 && ndx === -dx) || (ndy !== 0 && ndy === -dy)) return;
  nextDx = ndx;
  nextDy = ndy;
  
  // Auto-start on first direction input
  if (!isGameStarted && !isGameOver) {
    startGame();
  }
}

// ===== KEYBOARD =====
function handleKeyDown(e) {
  const key = e.key;
  
  // Block scroll for game keys
  const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D', 'r', 'R'];
  if (gameKeys.includes(key)) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  if (key === 'ArrowUp' || key === 'w' || key === 'W') setDir(0, -1);
  else if (key === 'ArrowDown' || key === 's' || key === 'S') setDir(0, 1);
  else if (key === 'ArrowLeft' || key === 'a' || key === 'A') setDir(-1, 0);
  else if (key === 'ArrowRight' || key === 'd' || key === 'D') setDir(1, 0);
  else if (key === ' ' || key === 'Space') togglePause();
  else if (key === 'r' || key === 'R') startGame();
}

// ===== D-PAD =====
function setupDPad() {
  const dirs = {
    'up': [0, -1],
    'down': [0, 1],
    'left': [-1, 0],
    'right': [1, 0]
  };
  
  document.querySelectorAll('.d-btn[data-dir]').forEach(btn => {
    const dir = btn.dataset.dir;
    const [ndx, ndy] = dirs[dir];
    
    // Touch events
    btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      setDir(ndx, ndy);
    }, { passive: false });
    
    // Mouse events (for testing on desktop)
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      setDir(ndx, ndy);
    });
  });
  
  // Pause button on D-pad
  const pauseBtn = document.getElementById('btnPausePad');
  if (pauseBtn) {
    pauseBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      togglePause();
    }, { passive: false });
    
    pauseBtn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      togglePause();
    });
  }
}

// ===== TOUCH / SWIPE =====
function setupTouch() {
  let tsX = 0, tsY = 0, tsT = 0;
  const gameArea = document.getElementById('gameArea');
  
  // Prevent all default touch behaviors in game area
  gameArea.addEventListener('touchstart', function(e) {
    tsX = e.touches[0].clientX;
    tsY = e.touches[0].clientY;
    tsT = Date.now();
  }, { passive: true });
  
  gameArea.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  gameArea.addEventListener('touchend', function(e) {
    if (!tsX && !tsY) return;
    
    const ex = e.changedTouches[0].clientX;
    const ey = e.changedTouches[0].clientY;
    const dx2 = ex - tsX;
    const dy2 = ey - tsY;
    const dt = Date.now() - tsT;
    
    // Tap = pause (only if not on buttons)
    if (Math.abs(dx2) < 15 && Math.abs(dy2) < 15 && dt < 250) {
      // Don't trigger if tapped on a button
      const target = e.target;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        tsX = 0; tsY = 0;
        return;
      }
      togglePause();
      tsX = 0; tsY = 0;
      return;
    }
    
    // Swipe
    const minSwipe = 30;
    if (Math.abs(dx2) > Math.abs(dy2)) {
      if (Math.abs(dx2) > minSwipe) setDir(dx2 > 0 ? 1 : -1, 0);
    } else {
      if (Math.abs(dy2) > minSwipe) setDir(0, dy2 > 0 ? 1 : -1);
    }
    
    tsX = 0; tsY = 0;
  }, { passive: true });
}

// ===== START ON LOAD =====
window.addEventListener('load', function() {
  initGame();
});