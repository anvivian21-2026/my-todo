// ============================================================
// calendar.js — 日历模块
// ============================================================
// 整个日历功能装在 CalendarApp 这个对象里。
// 与 todo.js / classes.js 完全独立,互不调用。
//
// 数据存储:
//   - 排课数据:Supabase id='calendar',结构 { 'YYYY-MM-DD': [{courseId, start}] }
//   - 课程库(只读):Supabase id='courses',由班级模块写入(ClassesApp 同步而来)
//
// 注意:从批次 8 开始,班级管理统一归 ClassesApp 管。
//      日历模块只**读取** courses,不再提供"管理课程"入口。
//
// 节假日数据来自 config.js 的 HOLIDAYS / WORKDAYS
// 老师配置来自 config.js 的 TEACHERS
// ============================================================

const CalendarApp = {

  // ─── 状态 ─────────────────────────────────────────────
  state: {
    classes: {},              // 排课数据
    courses: [],              // 课程库(由班级模块同步过来)
    viewYear: 0,              // 当前显示年份
    viewMonth: 0,             // 当前显示月份(0-11)
    selectedDate: null,       // 选中的日期(用于详情区显示)
    sortMode: 'time',         // 'time' 按时间排序 | 'teacher' 按老师分组
    collapsedGroups: {}       // 哪些老师组被收起了 { 'vivian': true, ... }
  },

  // ─── 初始化 ───────────────────────────────────────────
  init() {
    const t = todayCN();
    this.state.viewYear = t.y;
    this.state.viewMonth = t.m;
    this.loadData();
  },

  // ─── 数据加载 ─────────────────────────────────────────
  async loadData() {
    // 加载课程库(只读,由班级模块负责写入)
    let courseData = await syncLoad(SB_ID_COURSES);
    if (!courseData || !courseData.list || courseData.list.length === 0) {
      // fallback: 旧 courses key 空了,直接从 classes key 读
      const classesData = await syncLoad(SB_ID_CLASSES);
      if (classesData && classesData.list) {
        courseData = { list: classesData.list };
      }
    }
    if (courseData && courseData.list) {
      this.state.courses = courseData.list;
    }
    // 注:不再种入示例课程。如果没有课程,班级模块会引导用户去新建。

    // 加载排课数据
    const classData = await syncLoad(SB_ID_CALENDAR);
    if (classData) this.state.classes = classData;

    this.render();
  },

  async saveClasses() {
    await syncSave(SB_ID_CALENDAR, this.state.classes);
  },

  // ─── 工具:根据 id 找课程 ─────────────────────────────
  getCourse(id) {
    return this.state.courses.find(c => c.id === id);
  },

  _sortByStart(list) {
    return list.slice().sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  },

  // ─── 渲染日历主视图 ───────────────────────────────────
  render() {
    const s = this.state;
    const t = todayCN();
    const firstDay = new Date(s.viewYear, s.viewMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(s.viewYear, s.viewMonth + 1, 0).getDate();

    let html = `
    <div class="cal-wrap">

      <div class="cal-nav">
        <div class="cal-nav-left">
          <button onclick="CalendarApp.prevMonth()">‹</button>
          <span id="month-label">${s.viewYear}年 ${s.viewMonth + 1}月</span>
          <button onclick="CalendarApp.nextMonth()">›</button>
          <button class="cal-today-btn" onclick="CalendarApp.goToday()">今天</button>
        </div>
        <div class="cal-nav-right">
          <button class="cal-add-btn" onclick="CalendarApp.openAdd()">+ 添加课程</button>
        </div>
      </div>

      <div class="cal-legend">
        <span><i style="background:#6FA8DC"></i>Vivian</span>
        <span><i style="background:#FFCBA4"></i>Miranda</span>
        <span><i class="dot" style="background:#FCEBEB;border:1px solid #E24B4A"></i>节假日</span>
        <span><i class="dot" style="background:#FAEEDA;border:1px solid #BA7517"></i>调休</span>
      </div>

      <div class="cal-weekdays">
        <div>一</div><div>二</div><div>三</div><div>四</div>
        <div>五</div><div class="weekend">六</div><div class="weekend">日</div>
      </div>

      <div class="cal-grid">`;

    // 月份开头的占位空格
    for (let i = 0; i < offset; i++) {
      html += '<div class="cal-cell empty"></div>';
    }

    // 月份的每一天
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = fmtDate(s.viewYear, s.viewMonth, d);
      const dow = new Date(s.viewYear, s.viewMonth, d).getDay();
      const isWeekend = (dow === 0 || dow === 6);
      const isToday = (s.viewYear === t.y && s.viewMonth === t.m && d === t.d);
      const holiday = HOLIDAYS[dStr];
      const workday = WORKDAYS[dStr];
      const list = this._sortByStart(s.classes[dStr] || []);

      const cls = ['cal-cell'];
      if (isToday) cls.push('today');
      if (holiday) cls.push('holiday');
      else if (workday) cls.push('workday');

      let cellHtml = `<div class="${cls.join(' ')}" onclick="CalendarApp.selectDate('${dStr}')">
        <div class="cal-cell-head">
          <span class="cal-num ${isToday ? 'today-num' : ''} ${isWeekend ? 'weekend' : ''}">${d}</span>`;
      if (holiday) cellHtml += `<span class="cal-badge holiday-badge">休</span>`;
      else if (workday) cellHtml += `<span class="cal-badge workday-badge">班</span>`;
      cellHtml += `</div>`;

      // 横条(最多 3 条,超出显示 +N)
      cellHtml += `<div class="cal-bars">`;
      list.slice(0, 3).forEach(c => {
        const course = this.getCourse(c.courseId);
        if (!course) return;
        const teach = TEACHERS[course.teacher];
        if (!teach) return;
        const label = `${teach.letter}·${esc(course.name)}·${c.start || ''}`;
        cellHtml += `<div class="cal-bar" style="background:${teach.color};color:${teach.textColor}">${label}</div>`;
      });
      if (list.length > 3) {
        cellHtml += `<div class="cal-bar-more">+${list.length - 3} 节</div>`;
      }
      cellHtml += `</div></div>`;

      html += cellHtml;
    }

    html += `</div>`;

    // 详情区域
    if (s.selectedDate) {
      html += this._renderDetail(s.selectedDate);
    }

    html += `</div>`;
    document.getElementById('view-cal').innerHTML = html;
  },

  // ─── 渲染详情区(含排序切换器)─────────────────────
  _renderDetail(dStr) {
    const s = this.state;
    const [y, m, d] = dStr.split('-');
    const dowName = ['日','一','二','三','四','五','六'][new Date(+y, +m - 1, +d).getDay()];
    const holiday = HOLIDAYS[dStr];
    const workday = WORKDAYS[dStr];
    const list = s.classes[dStr] || [];

    // 头部:日期 + 节假日标记
    let html = `<div class="cal-detail">
      <div class="cal-detail-head">
        <div>
          <span class="cal-detail-title">${y}年${+m}月${+d}日 周${dowName}</span>`;
    if (holiday) html += ` <span class="cal-detail-tag holiday-tag">放假 · ${esc(holiday)}</span>`;
    else if (workday) html += ` <span class="cal-detail-tag workday-tag">调休补班</span>`;
    html += `</div>`;

    // 排序切换器(只有 2 节及以上才显示,1 节没必要分组)
    if (list.length >= 2) {
      html += `<div class="cal-sort-toggle">
        <button class="cal-sort-btn ${s.sortMode === 'time' ? 'active' : ''}" onclick="CalendarApp.setSortMode('time')">🕐 时间</button>
        <button class="cal-sort-btn ${s.sortMode === 'teacher' ? 'active' : ''}" onclick="CalendarApp.setSortMode('teacher')">👤 老师</button>
      </div>`;
    }
    html += `</div>`;

    // 主体:按当前模式渲染
    if (list.length === 0) {
      html += `<div class="cal-empty">这天还没排课</div>`;
    } else if (s.sortMode === 'teacher') {
      html += this._renderByTeacher(dStr, list);
    } else {
      html += this._renderByTime(dStr, list);
    }

    html += `</div>`;
    return html;
  },

  // 按时间渲染
  _renderByTime(dStr, list) {
    const sorted = this._sortByStart(list);
    let html = '';
    sorted.forEach(c => {
      html += this._renderClassItem(dStr, c);
    });
    return html;
  },

  // 按老师分组渲染
  _renderByTeacher(dStr, list) {
    let html = '';
    const teacherKeys = Object.keys(TEACHERS);
    teacherKeys.forEach(tKey => {
      const teach = TEACHERS[tKey];
      const courseIds = this.state.courses
        .filter(c => c.teacher === tKey)
        .map(c => c.id);
      const subList = list.filter(c => courseIds.includes(c.courseId));
      if (subList.length === 0) return;

      const sorted = this._sortByStart(subList);
      const isCollapsed = !!this.state.collapsedGroups[tKey];

      html += `<div class="cal-group-head ${isCollapsed ? 'collapsed' : ''}" onclick="CalendarApp.toggleGroup('${tKey}')">
        <span class="arrow">▼</span>
        <span style="color:${teach.textColor}">${teach.name}</span>
        <span class="cal-group-count">(${sorted.length} 节)</span>
      </div>`;

      if (!isCollapsed) {
        sorted.forEach(c => {
          html += this._renderClassItem(dStr, c);
        });
      }
    });
    return html;
  },

  // 渲染单节课
  _renderClassItem(dStr, c) {
    const course = this.getCourse(c.courseId);
    if (!course) {
      return `<div class="cal-class-item" style="background:#eee;color:#888;">(班级已删除)</div>`;
    }
    const teach = TEACHERS[course.teacher];
    const end = c.start ? addHours(c.start, DEFAULT_CLASS_DURATION) : '';
    const realIdx = (this.state.classes[dStr] || []).indexOf(c);
    return `<div class="cal-class-item" style="background:${teach.color};color:${teach.textColor}">
      <strong>${teach.letter}</strong>
      <span style="flex:1">${esc(course.name)}</span>
      <span class="cal-class-time">${c.start || ''}${end ? '-' + end : ''}</span>
      <button class="cal-class-del" onclick="event.stopPropagation();CalendarApp.deleteClass('${dStr}',${realIdx})" style="color:${teach.textColor}">删除</button>
    </div>`;
  },

  // ─── 排序模式切换 ─────────────────────────────────────
  setSortMode(mode) {
    this.state.sortMode = mode;
    if (mode === 'time') {
      this.state.collapsedGroups = {};
    }
    this.render();
  },

  toggleGroup(teacherKey) {
    const cg = this.state.collapsedGroups;
    cg[teacherKey] = !cg[teacherKey];
    this.render();
  },

  // ─── 月份导航 ─────────────────────────────────────────
  prevMonth() {
    const s = this.state;
    s.viewMonth--;
    if (s.viewMonth < 0) { s.viewMonth = 11; s.viewYear--; }
    this.render();
  },

  nextMonth() {
    const s = this.state;
    s.viewMonth++;
    if (s.viewMonth > 11) { s.viewMonth = 0; s.viewYear++; }
    this.render();
  },

  goToday() {
    const t = todayCN();
    this.state.viewYear = t.y;
    this.state.viewMonth = t.m;
    this.state.selectedDate = fmtDate(t.y, t.m, t.d);
    this.render();
  },

  selectDate(dStr) {
    this.state.selectedDate = dStr;
    this.render();
  },

  // ─── 添加课程(排课)弹窗 ─────────────────────────────
  openAdd() {
    if (this.state.courses.length === 0) {
      alert('还没有班级,请先在"班级"标签里新建一个');
      return;
    }
    const t = todayCN();
    const defaultDate = this.state.selectedDate || fmtDate(t.y, t.m, t.d);

    let courseOpts = this.state.courses.map(c => {
      const teach = TEACHERS[c.teacher];
      return `<option value="${c.id}">${esc(c.name)} — ${teach ? teach.name : '?'}</option>`;
    }).join('');

    const html = `<div class="cal-modal-bg" id="cal-modal-add" onclick="if(event.target===this)CalendarApp.closeModal()">
      <div class="cal-modal-box">
        <h3>添加课程</h3>
        <label>日期</label>
        <input type="date" id="cal-m-date" value="${defaultDate}">
        <label>班级</label>
        <select id="cal-m-course">${courseOpts}</select>
        <label>开始时间(默认 ${DEFAULT_CLASS_DURATION} 小时)</label>
        <input type="time" id="cal-m-start" value="19:00">
        <div class="cal-modal-actions">
          <button onclick="CalendarApp.closeModal()">取消</button>
          <button class="primary" onclick="CalendarApp.saveClass()">保存</button>
        </div>
      </div>
    </div>`;

    this._showModal(html);
  },

  closeModal() {
    const m = document.getElementById('cal-modal-add');
    if (m) m.remove();
  },

  _showModal(html) {
    this.closeModal();
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);
  },

  async saveClass() {
    const date = document.getElementById('cal-m-date').value;
    const courseId = document.getElementById('cal-m-course').value;
    const start = document.getElementById('cal-m-start').value;
    if (!date || !courseId || !start) return;

    const s = this.state;
    if (!s.classes[date]) s.classes[date] = [];
    s.classes[date].push({ courseId, start });
    await this.saveClasses();

    s.selectedDate = date;
    this.closeModal();
    this.render();
  },

  async deleteClass(dStr, idx) {
    const s = this.state;
    const c = s.classes[dStr][idx];
    const course = this.getCourse(c.courseId);
    const name = course ? course.name : '(班级已删除)';
    if (!confirm(`确定删除这节课吗?\n\n${name} · ${c.start || ''}`)) return;
    s.classes[dStr].splice(idx, 1);
    if (s.classes[dStr].length === 0) delete s.classes[dStr];
    await this.saveClasses();
    this.render();
  }
};
