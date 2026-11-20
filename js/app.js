/* ═══════════════════════════════════════════════════════════
   PERSONAL DASHBOARD  –  app.js
   Features:
     - Greeting with time/date
     - Custom name (Challenge: custom name)
     - Light / Dark mode (Challenge: dark mode)
     - Focus timer with configurable duration (Challenge: custom Pomodoro time)
     - To-Do list with add / edit / done / delete, duplicate prevention,
       and sort (Challenge: sort tasks)
     - Quick Links with Local Storage
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── Storage keys ─────────────────────────────────────────── */
const KEYS = {
  theme:  'dashboard_theme',
  name:   'dashboard_name',
  todos:  'dashboard_todos',
  links:  'dashboard_links',
  timerDuration: 'dashboard_timer_duration',
};

/* ─── Helpers ───────────────────────────────────────────────── */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getFavicon(url) {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(origin)}`;
  } catch { return ''; }
}

/* ════════════════════════════════════════════════════════════
   1.  CLOCK & DATE
════════════════════════════════════════════════════════════ */
(function initClock() {
  const clockEl = $('#clock');
  const dateEl  = $('#date-display');
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function tick() {
    const now = new Date();
    const h   = String(now.getHours()).padStart(2, '0');
    const m   = String(now.getMinutes()).padStart(2, '0');
    const s   = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}:${s}`;

    dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  }

  tick();
  setInterval(tick, 1000);
})();

/* ════════════════════════════════════════════════════════════
   2.  GREETING + CUSTOM NAME
════════════════════════════════════════════════════════════ */
(function initGreeting() {
  let userName = load(KEYS.name, '');

  const greetingEl  = $('#greeting');
  const editBtn     = $('#edit-name-btn');
  const modal       = $('#name-modal');
  const nameInput   = $('#name-input');
  const cancelBtn   = $('#name-cancel');
  const saveBtn     = $('#name-save');

  function getGreetingWord() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }

  function renderGreeting() {
    const word = getGreetingWord();
    greetingEl.textContent = userName
      ? `${word}, ${userName}! 👋`
      : `${word}! 👋`;
  }

  function openModal() {
    nameInput.value = userName;
    modal.classList.remove('hidden');
    nameInput.focus();
    nameInput.select();
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  editBtn.addEventListener('click', openModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.querySelector('.modal__backdrop').addEventListener('click', closeModal);

  saveBtn.addEventListener('click', () => {
    userName = nameInput.value.trim();
    save(KEYS.name, userName);
    renderGreeting();
    closeModal();
  });

  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
    if (e.key === 'Escape') closeModal();
  });

  // If no name yet, prompt on first load after a moment
  renderGreeting();
  if (!userName) setTimeout(openModal, 600);
})();

/* ════════════════════════════════════════════════════════════
   3.  LIGHT / DARK MODE
════════════════════════════════════════════════════════════ */
(function initTheme() {
  const html      = document.documentElement;
  const toggle    = $('#theme-toggle');
  const icon      = $('#theme-icon');
  let   isDark    = load(KEYS.theme, false);

  function apply() {
    html.setAttribute('data-theme', isDark ? 'dark' : 'light');
    icon.textContent = isDark ? '☀️' : '🌙';
    toggle.title     = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  toggle.addEventListener('click', () => {
    isDark = !isDark;
    save(KEYS.theme, isDark);
    apply();
  });

  apply();
})();

/* ════════════════════════════════════════════════════════════
   4.  FOCUS TIMER  (configurable duration)
════════════════════════════════════════════════════════════ */
(function initTimer() {
  const DEFAULT_MINS = 25;
  let totalSeconds   = load(KEYS.timerDuration, DEFAULT_MINS) * 60;
  let remaining      = totalSeconds;
  let intervalId     = null;
  let running        = false;

  const timeEl       = $('#timer-time');
  const bar          = $('#timer-bar');
  const startBtn     = $('#timer-start');
  const stopBtn      = $('#timer-stop');
  const resetBtn     = $('#timer-reset');
  const customInput  = $('#custom-minutes');
  const setBtn       = $('#set-duration-btn');

  customInput.value = totalSeconds / 60;

  function fmt(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateDisplay() {
    timeEl.textContent = fmt(remaining);
    const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
    bar.style.width = `${pct}%`;

    // Color cues
    timeEl.classList.remove('running', 'done');
    if (remaining === 0) {
      timeEl.classList.add('done');
      bar.style.background = 'var(--success)';
    } else if (running) {
      timeEl.classList.add('running');
      bar.style.background = 'var(--primary)';
    } else {
      bar.style.background = 'var(--primary)';
    }
  }

  function tick() {
    if (remaining <= 0) {
      clearInterval(intervalId);
      running = false;
      startBtn.disabled = true;
      stopBtn.disabled  = true;
      updateDisplay();
      // Browser notification (if permitted)
      if (Notification.permission === 'granted') {
        new Notification('⏰ Focus session complete!', {
          body: 'Great work! Time for a break.',
          icon: ''
        });
      }
      return;
    }
    remaining--;
    updateDisplay();
  }

  function start() {
    if (running || remaining === 0) return;
    // Ask notification permission lazily
    if (Notification.permission === 'default') Notification.requestPermission();
    running = true;
    startBtn.disabled = true;
    stopBtn.disabled  = false;
    updateDisplay();
    intervalId = setInterval(tick, 1000);
  }

  function stop() {
    if (!running) return;
    clearInterval(intervalId);
    running = false;
    startBtn.disabled = false;
    stopBtn.disabled  = true;
    updateDisplay();
  }

  function reset() {
    stop();
    remaining = totalSeconds;
    timeEl.classList.remove('running', 'done');
    bar.style.background = 'var(--primary)';
    updateDisplay();
  }

  setBtn.addEventListener('click', () => {
    const val = parseInt(customInput.value, 10);
    if (!val || val < 1 || val > 120) {
      customInput.style.borderColor = 'var(--danger)';
      setTimeout(() => { customInput.style.borderColor = ''; }, 1500);
      return;
    }
    stop();
    totalSeconds = val * 60;
    remaining    = totalSeconds;
    save(KEYS.timerDuration, val);
    updateDisplay();
  });

  customInput.addEventListener('keydown', e => { if (e.key === 'Enter') setBtn.click(); });

  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  resetBtn.addEventListener('click', reset);

  updateDisplay();
})();

/* ════════════════════════════════════════════════════════════
   5.  TO-DO LIST  (with duplicate prevention + sort)
════════════════════════════════════════════════════════════ */
(function initTodos() {
  let todos = load(KEYS.todos, []);    // [{id, text, done}]
  let sortMode = 'default';

  const listEl    = $('#todo-list');
  const inputEl   = $('#todo-input');
  const addBtn    = $('#todo-add-btn');
  const emptyEl   = $('#todo-empty');
  const sortSel   = $('#sort-select');

  function persist() { save(KEYS.todos, todos); }

  function getSorted() {
    const copy = [...todos];
    if (sortMode === 'az')   return copy.sort((a, b) => a.text.localeCompare(b.text));
    if (sortMode === 'za')   return copy.sort((a, b) => b.text.localeCompare(a.text));
    if (sortMode === 'done') return copy.sort((a, b) => Number(a.done) - Number(b.done));
    return copy; // default: insertion order
  }

  function render() {
    const sorted = getSorted();
    listEl.innerHTML = '';

    sorted.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item${todo.done ? ' done' : ''}`;
      li.dataset.id = todo.id;

      li.innerHTML = `
        <input type="checkbox" class="todo-item__check" ${todo.done ? 'checked' : ''} aria-label="Mark done" />
        <span class="todo-item__text">${escHtml(todo.text)}</span>
        <div class="todo-item__actions">
          <button class="icon-btn edit" title="Edit task">✏️</button>
          <button class="icon-btn delete" title="Delete task">🗑️</button>
        </div>`;

      // Checkbox
      li.querySelector('.todo-item__check').addEventListener('change', e => {
        const t = todos.find(x => x.id === todo.id);
        if (t) { t.done = e.target.checked; persist(); render(); }
      });

      // Edit
      li.querySelector('.icon-btn.edit').addEventListener('click', () => startEdit(li, todo.id));

      // Delete
      li.querySelector('.icon-btn.delete').addEventListener('click', () => {
        todos = todos.filter(x => x.id !== todo.id);
        persist();
        render();
      });

      listEl.appendChild(li);
    });

    emptyEl.style.display = todos.length === 0 ? 'block' : 'none';
  }

  function startEdit(li, id) {
    const todo   = todos.find(x => x.id === id);
    if (!todo) return;
    const spanEl = li.querySelector('.todo-item__text');
    const editInput = document.createElement('input');
    editInput.type      = 'text';
    editInput.className = 'todo-item__edit-input';
    editInput.value     = todo.text;
    editInput.maxLength = 120;
    spanEl.replaceWith(editInput);
    editInput.focus();
    editInput.select();

    const editBtn = li.querySelector('.icon-btn.edit');
    editBtn.textContent = '✅';
    editBtn.title = 'Save';

    function commitEdit() {
      const newText = editInput.value.trim();
      if (!newText) { render(); return; }

      // Duplicate check (excluding current item)
      const isDupe = todos.some(x => x.id !== id && x.text.toLowerCase() === newText.toLowerCase());
      if (isDupe) {
        editInput.style.borderColor = 'var(--danger)';
        editInput.title = 'Task already exists!';
        return;
      }

      todo.text = newText;
      persist();
      render();
    }

    editBtn.onclick = commitEdit;
    editInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') render();
    });
    editInput.addEventListener('blur', e => {
      // Don't commit if the edit button was clicked (handled above)
      if (e.relatedTarget !== editBtn) commitEdit();
    });
  }

  function addTask() {
    const text = inputEl.value.trim();
    if (!text) return;

    // Duplicate prevention
    const isDupe = todos.some(x => x.text.toLowerCase() === text.toLowerCase());
    if (isDupe) {
      inputEl.style.borderColor = 'var(--danger)';
      inputEl.title = 'This task already exists!';
      setTimeout(() => { inputEl.style.borderColor = ''; inputEl.title = ''; }, 2000);
      return;
    }

    todos.push({ id: Date.now().toString(), text, done: false });
    persist();
    inputEl.value = '';
    render();
  }

  addBtn.addEventListener('click', addTask);
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
  sortSel.addEventListener('change', () => { sortMode = sortSel.value; render(); });

  render();
})();

/* ════════════════════════════════════════════════════════════
   6.  QUICK LINKS
════════════════════════════════════════════════════════════ */
(function initLinks() {
  let links = load(KEYS.links, []);   // [{id, name, url}]
  let editingId = null;

  const gridEl      = $('#links-grid');
  const emptyEl     = $('#links-empty');
  const addLinkBtn  = $('#add-link-btn');
  const modal       = $('#link-modal');
  const modalTitle  = $('#link-modal-title');
  const nameInput   = $('#link-name-input');
  const urlInput    = $('#link-url-input');
  const cancelBtn   = $('#link-cancel');
  const saveBtn     = $('#link-save');

  function persist() { save(KEYS.links, links); }

  function render() {
    gridEl.innerHTML = '';
    links.forEach(link => {
      const chip = document.createElement('div');
      chip.className = 'link-chip-wrap';
      chip.style.display = 'inline-flex';
      chip.style.alignItems = 'center';
      chip.style.gap = '.25rem';

      const a = document.createElement('a');
      a.className = 'link-chip';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = link.url;

      const favSrc = getFavicon(link.url);
      if (favSrc) {
        const img = document.createElement('img');
        img.src = favSrc;
        img.className = 'link-chip__favicon';
        img.alt = '';
        img.onerror = () => { img.style.display = 'none'; };
        a.appendChild(img);
      }

      a.appendChild(document.createTextNode(link.name));
      chip.appendChild(a);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'icon-btn delete';
      removeBtn.title = 'Remove link';
      removeBtn.textContent = '✕';
      removeBtn.style.marginLeft = '-.3rem';
      removeBtn.addEventListener('click', () => {
        links = links.filter(x => x.id !== link.id);
        persist();
        render();
      });
      chip.appendChild(removeBtn);

      gridEl.appendChild(chip);
    });

    emptyEl.style.display = links.length === 0 ? 'block' : 'none';
  }

  function openModal(id = null) {
    editingId = id;
    if (id) {
      const link = links.find(x => x.id === id);
      modalTitle.textContent = 'Edit Quick Link';
      nameInput.value = link.name;
      urlInput.value  = link.url;
    } else {
      modalTitle.textContent = 'Add Quick Link';
      nameInput.value = '';
      urlInput.value  = '';
    }
    modal.classList.remove('hidden');
    nameInput.focus();
  }

  function closeModal() { modal.classList.add('hidden'); }

  function saveLink() {
    const name = nameInput.value.trim();
    let   url  = urlInput.value.trim();
    if (!name || !url) return;

    // Auto-add https if missing
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    if (editingId) {
      const link = links.find(x => x.id === editingId);
      if (link) { link.name = name; link.url = url; }
    } else {
      links.push({ id: Date.now().toString(), name, url });
    }

    persist();
    render();
    closeModal();
  }

  addLinkBtn.addEventListener('click', () => openModal());
  cancelBtn.addEventListener('click', closeModal);
  modal.querySelector('.modal__backdrop').addEventListener('click', closeModal);
  saveBtn.addEventListener('click', saveLink);
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveLink(); });

  render();
})();

/* ─── Utility: escape HTML ───────────────────────────────── */
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
