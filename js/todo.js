// ============================================================
// todo.js — 待办模块
// ============================================================
// 整个待办功能都装在 TodoApp 这个对象里。
// 这样所有变量、函数都挂在 TodoApp 下,不会污染全局。
//
// 对外暴露:TodoApp.init() 启动,TodoApp.render() 重绘
// 内部状态:TodoApp.state.* 所有可变状态
// ============================================================

const TodoApp = {

  // ─── 状态(所有会变的数据)──────────────────────────────
  state: {
    allTasks: {},        // { 'YYYY-MM-DD': [{id, text, done, ...}] }
    weekOffset: 0,       // 当前显示的是哪一周(0=本周,-1=上周,+1=下周)
    expandedDay: null,   // 当前展开的那一天(日期字符串或 null)
    openMenu: null,      // 当前打开的右键菜单 {date, idx}
    moveMode: false,     // 移动任务模式
    _dragIdx: null,      // 拖拽:被拖的索引
    _dragOverIdx: null   // 拖拽:经过的索引
  },

  // ─── 初始化 ─────────────────────────────────────────────
  init() {
    this.state.expandedDay = todayStr();
    this.loadData();
    // 点页面其他地方关菜单
    document.addEventListener('click', e => {
      if (this.state.openMenu && !e.target.closest('.menu-btn')) {
        this.state.openMenu = null;
        this.state.moveMode = false;
        this.render();
      }
    });
  },

  // ─── 数据加载与同步 ─────────────────────────────────────
  loadData() {
    // 先用本地缓存渲染(快)
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TODO);
      if (raw) this.state.allTasks = JSON.parse(raw);
    } catch (e) {}

    // 然后从云端拉数据(慢)
    this._syncWithServer();
    this.carryOver();
  },

  async _syncWithServer() {
    // 先尝试新版 id 'todo'
    let serverData = await syncLoad(SB_ID_TODO);

    // 如果新版没数据,尝试旧版 'all'(首次迁移)
    if (!serverData) {
      const legacyData = await syncLoad(SB_ID_TODO_LEGACY);
      if (legacyData) {
        // 把旧数据写到新 id 上
        await syncSave(SB_ID_TODO, legacyData);
        serverData = legacyData;
      }
    }

    if (serverData) {
      // 比较云端和本地哪个数据多,用多的
      const sc = Object.values(serverData).flat().length;
      const lc = Object.values(this.state.allTasks).flat().length;
      if (sc >= lc) {
        this.state.allTasks = serverData;
      } else {
        await syncSave(SB_ID_TODO, this.state.allTasks);
      }
    } else if (Object.keys(this.state.allTasks).length > 0) {
      // 云端啥都没有但本地有,把本地推上去
      await syncSave(SB_ID_TODO, this.state.allTasks);
    }

    this.carryOver();
    this.render();
    setSyncDot('#4a9c6d');
  },

  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY_TODO, JSON.stringify(this.state.allTasks));
    } catch (e) {}
    syncSave(SB_ID_TODO, this.state.allTasks);
  },

  // 把昨天及以前没完成的任务自动顺延到今天
  carryOver() {
    const today = todayStr();
    let changed = false;
    const tasks = this.state.allTasks;

    for (const [dateStr, list] of Object.entries(tasks)) {
      if (dateStr < today) {
        const unfinished = list.filter(t => !t.done);
        const finished = list.filter(t => t.done);
        if (unfinished.length > 0) {
          const todayTasks = tasks[today] || [];
          const existing = new Set(todayTasks.map(t => t.text));
          for (const t of unfinished) {
            if (!existing.has(t.text)) {
              todayTasks.push({ ...t, carriedFrom: t.carriedFrom || dateStr });
            }
          }
          tasks[today] = todayTasks;
          tasks[dateStr] = finished;
          changed = true;
        }
      }
    }
    if (changed) this.saveData();
  },

  // ─── 渲染 ───────────────────────────────────────────────
  render() {
    const s = this.state;
    const monday = getMonday(addDays(new Date(), s.weekOffset * 7));
    const weekDays = Array.from({length: 7}, (_, i) => ds(addDays(monday, i)));
    const weekLabel = `${fmt(ds(monday))} — ${fmt(ds(addDays(monday, 6)))}`;
    const today = todayStr();

    let html = `
    <div class="header">
      <div class="header-top">
        <span class="app-title">待办</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span id="sync-dot" style="width:8px;height:8px;border-radius:50%;background:#999" title="同步状态"></span>
          <button class="today-chip ${s.weekOffset !== 0 ? 'show' : ''}" onclick="TodoApp.goToday()">回到本周</button>
        </div>
      </div>
      <div class="week-nav">
        <button class="nav-arrow" onclick="TodoApp.goWeek(-1)">‹</button>
        <span class="week-label">${weekLabel}</span>
        <button class="nav-arrow" onclick="TodoApp.goWeek(1)">›</button>
      </div>
    </div>
    <div class="input-bar">
      <input id="taskInput" placeholder="${s.expandedDay ? `添加到 ${fmt(s.expandedDay)} ${DAY_NAMES[new Date(s.expandedDay+'T00:00:00').getDay()]}...` : '请先展开某一天...'}" ${s.expandedDay ? '' : 'disabled'} onkeydown="if(event.key==='Enter')TodoApp.addTask()">
      <button class="add-btn" onclick="TodoApp.addTask()"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div class="day-list">`;

    for (const dateStr of weekDays) {
      const tasks = s.allTasks[dateStr] || [];
      const undone = tasks.filter(t => !t.done).length;
      const total = tasks.length;
      const isExp = s.expandedDay === dateStr;
      const isToday = dateStr === today;
      const past = isPast(dateStr);
      const d = new Date(dateStr + 'T00:00:00');

      const cls = ['day-block'];
      if (isExp) cls.push('expanded');

      const rowCls = ['day-row'];
      if (isToday) rowCls.push('today');
      if (past && !isToday) rowCls.push('past');
      if (isExp) rowCls.push('expanded');

      let countText = '';
      if (total > 0) countText = undone > 0 ? `${undone}项待办` : `${total}项已完成`;

      html += `<div class="${cls.join(' ')}">
        <button class="${rowCls.join(' ')}" onclick="TodoApp.toggleDay('${dateStr}')">
          <div class="day-left">
            <span class="day-name">${DAY_NAMES[d.getDay()]}</span>
            <span class="day-date">${fmt(dateStr)}</span>
            ${isToday ? '<span class="today-dot">今天</span>' : ''}
          </div>
          <div class="day-right">
            ${countText ? `<span class="task-count">${countText}</span>` : ''}
            <span class="chevron">›</span>
          </div>
        </button>`;

      if (isExp) {
        html += `<div class="task-list">`;
        if (tasks.length === 0) {
          html += `<div class="empty-day">暂无任务,在上方输入框添加</div>`;
        } else {
          const sorted = [...tasks].sort((a, b) => a.done === b.done ? 0 : a.done ? 1 : -1);
          for (let idx = 0; idx < sorted.length; idx++) {
            const t = sorted[idx];
            const realIdx = tasks.indexOf(t);
            html += `<div class="task-row ${t.done ? 'done' : ''}" draggable="true" ondragstart="TodoApp.dragStart(${re
