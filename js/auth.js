// ===== DATA LAYER =====
const DB = {
  users: 'ksid_users_v2',
  session: 'ksid_session',
  codes: 'ksid_email_codes',
  avatars: 'ksid_avatars'
};

function getUsers() {
  const data = localStorage.getItem(DB.users);
  if (data) return JSON.parse(data);
  const defaults = [{
    id: 'admin',
    login: 'admin',
    password: 'admin123',
    role: 'admin',
    email: 'admin@ksid.local',
    emailVerified: true,
    avatar: null,
    createdAt: new Date().toISOString()
  }];
  localStorage.setItem(DB.users, JSON.stringify(defaults));
  return defaults;
}

function saveUsers(users) { localStorage.setItem(DB.users, JSON.stringify(users)); }

function getSession() {
  const data = localStorage.getItem(DB.session);
  return data ? JSON.parse(data) : null;
}

function setSession(user) {
  localStorage.setItem(DB.session, JSON.stringify({
    id: user.id,
    login: user.login,
    role: user.role,
    email: user.email,
    emailVerified: user.emailVerified,
    avatar: user.avatar
  }));
}

function clearSession() { localStorage.removeItem(DB.session); }

// ===== EMAIL CODES (simulated) =====
function sendEmailCode(email) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codes = JSON.parse(localStorage.getItem(DB.codes) || '{}');
  codes[email] = { code, expires: Date.now() + 600000 }; // 10 min
  localStorage.setItem(DB.codes, JSON.stringify(codes));
  // Simulate email
  console.log('[EMAIL TO ' + email + '] Код подтверждения: ' + code);
  showToast('Код отправлен на ' + email + ' (смотри консоль F12)', 'success');
  return code;
}

function verifyEmailCode(email, inputCode) {
  const codes = JSON.parse(localStorage.getItem(DB.codes) || '{}');
  const record = codes[email];
  if (!record) return false;
  if (Date.now() > record.expires) return false;
  return record.code === inputCode;
}

// ===== AUTH =====
let currentUser = null;

function login() {
  const login = document.getElementById('loginInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const errorMsg = document.getElementById('errorMsg');
  if (!login || !password) {
    showError('Введите логин и пароль'); return;
  }
  const users = getUsers();
  const user = users.find(u => u.login === login && u.password === password);
  if (user) {
    currentUser = user;
    setSession(user);
    showApp();
    showToast('Добро пожаловать, ' + user.login + '!', 'success');
  } else {
    showError('Неверный логин или пароль');
  }
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function logout() {
  showConfirm('Выйти из аккаунта?', 'Вы уверены, что хотите выйти?', function() {
    clearSession(); currentUser = null;
    location.reload();
  });
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  updateHeader();
  initParticles();
}

function updateHeader() {
  const u = currentUser;
  document.getElementById('userName').textContent = u.login;
  const avatarEl = document.getElementById('userAvatar');
  const dropAvatar = document.getElementById('dropdownAvatar');
  if (u.avatar) {
    avatarEl.innerHTML = '<img src="' + u.avatar + '" alt="">';
    dropAvatar.innerHTML = '<img src="' + u.avatar + '" alt="">';
  } else {
    avatarEl.textContent = u.login[0].toUpperCase();
    dropAvatar.textContent = u.login[0].toUpperCase();
  }
  document.getElementById('dropdownName').textContent = u.login;
  document.getElementById('dropdownEmail').textContent = u.email || 'Email не привязан';
  document.getElementById('dropdownRole').textContent = u.role === 'admin' ? 'Администратор' : 'Игрок';
  const adminBtn = document.getElementById('adminPanelBtn');
  if (adminBtn) adminBtn.style.display = u.role === 'admin' ? 'flex' : 'none';
}

// ===== AVATAR =====
function changeAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const dataUrl = ev.target.result;
      const users = getUsers();
      const user = users.find(u => u.id === currentUser.id);
      if (user) {
        user.avatar = dataUrl;
        saveUsers(users);
        currentUser.avatar = dataUrl;
        setSession(currentUser);
        updateHeader();
        showToast('Аватар обновлён!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ===== EMAIL BINDING =====
let pendingEmail = '';

function bindEmail() {
  const emailInput = document.getElementById('bindEmailInput');
  const codeSection = document.getElementById('emailCodeSection');
  const email = emailInput.value.trim();
  if (!email || !email.includes('@')) {
    showToast('Введите корректный email', 'error'); return;
  }
  pendingEmail = email;
  sendEmailCode(email);
  codeSection.style.display = 'block';
  emailInput.disabled = true;
  showToast('Код отправлен! Проверь консоль (F12)', 'success');
}

function confirmEmailCode() {
  const code = document.getElementById('emailCodeInput').value.trim();
  if (!code) { showToast('Введите код', 'error'); return; }
  if (!verifyEmailCode(pendingEmail, code)) {
    showToast('Неверный или просроченный код', 'error'); return;
  }
  const users = getUsers();
  const user = users.find(u => u.id === currentUser.id);
  if (user) {
    user.email = pendingEmail;
    user.emailVerified = true;
    saveUsers(users);
    currentUser.email = pendingEmail;
    currentUser.emailVerified = true;
    setSession(currentUser);
    updateHeader();
    closeModal('emailModal');
    document.getElementById('bindEmailInput').value = '';
    document.getElementById('emailCodeInput').value = '';
    document.getElementById('emailCodeSection').style.display = 'none';
    document.getElementById('bindEmailInput').disabled = false;
    pendingEmail = '';
    showToast('Email успешно привязан!', 'success');
  }
}

// ===== CHANGE EMAIL VIA PASSWORD =====
function changeEmail() {
  const pass = document.getElementById('changeEmailPass').value;
  const newEmail = document.getElementById('changeEmailNew').value.trim();
  const code = document.getElementById('changeEmailCode').value.trim();
  if (!pass || !newEmail || !code) {
    showToast('Заполните все поля', 'error'); return;
  }
  const users = getUsers();
  const user = users.find(u => u.id === currentUser.id);
  if (user.password !== pass) {
    showToast('Неверный пароль', 'error'); return;
  }
  if (!verifyEmailCode(newEmail, code)) {
    showToast('Неверный код подтверждения', 'error'); return;
  }
  user.email = newEmail;
  saveUsers(users);
  currentUser.email = newEmail;
  setSession(currentUser);
  updateHeader();
  closeModal('changeEmailModal');
  showToast('Email изменён!', 'success');
}

function sendChangeEmailCode() {
  const newEmail = document.getElementById('changeEmailNew').value.trim();
  if (!newEmail || !newEmail.includes('@')) {
    showToast('Введите новый email', 'error'); return;
  }
  sendEmailCode(newEmail);
  showToast('Код отправлен на ' + newEmail, 'success');
}

// ===== DELETE ACCOUNT =====
function deleteAccount() {
  showConfirm('Удалить аккаунт?', 'Это действие необратимо! Все данные будут потеряны.', function() {
    const users = getUsers();
    const filtered = users.filter(u => u.id !== currentUser.id);
    saveUsers(filtered);
    clearSession();
    showToast('Аккаунт удалён', 'success');
    setTimeout(() => location.reload(), 1500);
  });
}

// ===== ADMIN =====
function addUser() {
  const login = document.getElementById('newUserLogin').value.trim();
  const password = document.getElementById('newUserPass').value.trim();
  if (!login || !password) { showToast('Заполните все поля', 'error'); return; }
  const users = getUsers();
  if (users.some(u => u.login === login)) {
    showToast('Такой логин уже есть', 'error'); return;
  }
  users.push({
    id: Date.now().toString(),
    login, password,
    role: 'user',
    email: null,
    emailVerified: false,
    avatar: null,
    createdAt: new Date().toISOString()
  });
  saveUsers(users);
  document.getElementById('newUserLogin').value = '';
  document.getElementById('newUserPass').value = '';
  renderUsersTable();
  showToast('Пользователь создан!', 'success');
}

function adminDeleteUser(id) {
  if (id === 'admin') { showToast('Нельзя удалить админа', 'error'); return; }
  showConfirm('Удалить пользователя?', 'Это действие нельзя отменить.', function() {
    let users = getUsers();
    users = users.filter(u => u.id !== id);
    saveUsers(users);
    renderUsersTable();
    showToast('Пользователь удалён', 'success');
  });
}

function renderUsersTable() {
  const users = getUsers();
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = users.map(user => `
    <tr>
      <td style="display:flex;align-items:center;gap:10px">
        <div class="account-avatar" style="width:32px;height:32px;font-size:12px">
          ${user.avatar ? '<img src="' + user.avatar + '" style="width:100%;height:100%;object-fit:cover">' : user.login[0].toUpperCase()}
        </div>
        <div>
          <div style="font-weight:700">${user.login}</div>
          <div style="font-size:11px;color:var(--text-3)">${user.email || '—'}</div>
        </div>
      </td>
      <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role === 'admin' ? 'Админ' : 'Игрок'}</span></td>
      <td><span style="color:var(--text-3);font-size:12px">${new Date(user.createdAt).toLocaleDateString('ru-RU')}</span></td>
      <td>${user.id !== 'admin' ? `<button class="btn-small btn-danger" style="padding:4px 12px;font-size:11px" onclick="adminDeleteUser('${user.id}')">Удалить</button>` : '<span style="color:var(--text-3);font-size:12px">Системный</span>'}</td>
    </tr>
  `).join('');
}

// ===== UI HELPERS =====
function toggleAccountMenu() {
  document.getElementById('accountDropdown').classList.toggle('show');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.account-menu')) {
    const d = document.getElementById('accountDropdown');
    if (d) d.classList.remove('show');
  }
});

function openModal(id) {
  document.getElementById(id).classList.add('active');
  toggleAccountMenu();
  if (id === 'adminModal') renderUsersTable();
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function changePassword() {
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;
  if (!newPass || !confirmPass) { showToast('Заполните все поля', 'error'); return; }
  if (newPass !== confirmPass) { showToast('Пароли не совпадают', 'error'); return; }
  const users = getUsers();
  const user = users.find(u => u.id === currentUser.id);
  if (user) {
    user.password = newPass;
    saveUsers(users);
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    closeModal('passwordModal');
    showToast('Пароль изменён!', 'success');
  }
}

// ===== CONFIRM DIALOG =====
function showConfirm(title, text, onConfirm) {
  const overlay = document.getElementById('confirmOverlay');
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  overlay.classList.add('active');
  window._confirmCallback = onConfirm;
}

function confirmYes() {
  document.getElementById('confirmOverlay').classList.remove('active');
  if (window._confirmCallback) window._confirmCallback();
}

function confirmNo() {
  document.getElementById('confirmOverlay').classList.remove('active');
  window._confirmCallback = null;
}

// ===== TOAST =====
function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + (type || '');
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== PARTICLES =====
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (8 + Math.random() * 12) + 's';
    p.style.animationDelay = Math.random() * 8 + 's';
    p.style.width = (2 + Math.random() * 4) + 'px';
    p.style.height = p.style.width;
    const colors = ['#ff2d75', '#7c3aed', '#2979ff', '#00e676'];
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(p);
  }
}

// ===== INIT =====
document.getElementById('passwordInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') login();
});

window.addEventListener('load', function() {
  const session = getSession();
  if (session) {
    const users = getUsers();
    const user = users.find(u => u.id === session.id);
    if (user) {
      currentUser = user;
      showApp();
    }
  }
});
