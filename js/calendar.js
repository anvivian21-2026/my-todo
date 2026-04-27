// ============================================================
// calendar.js — 日历模块
// ============================================================

const CalendarApp = {

  state: {
    classes: {},
    courses: [],
    viewYear: 0,
    viewMonth: 0,
    selectedDate: null,
    sortMode: 'time',
    collapsedGroups: {}
  },

  init() {
    const t = todayCN();
    this.state.viewYear = t.y;
    this.state.viewMonth = t.m;
    this.loadData();
  },

  async loadData() {
    const courseData = await syncLoad(SB_ID_COURSES);
    if (courseData && courseData.list) {
      this.state.courses = courseData.list;
    } else {
      this.state.courses = [
        { id: 'c1', name: 'PU2 三年级', teacher: 'miranda' },
        { id: 'c2', name: 'PU2 二年级', teacher: 'vivian'  }
      ];
      await syncSave(SB_ID_COURSES, { list: this.state.courses });
    }

    const classData = await syncLoad(SB_ID_CALENDAR);
    if (classData) this.state.classes = classData;

    this.render();
  },

  async saveClasses() {
    await syncSave(SB_ID_CALENDAR, this.state.classes);
  },

  async saveCourses() {
    await syncSave(SB_ID_COURSES, { list: this.state.courses });
  },

  getCourse(id) {
    return this.state.courses.find(c => c.id === id);
  },

  _sortByStart(list) {
    return list.slice().sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  },

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
          <button class="cal-manage-btn" onclick="CalendarApp.openManage()">管理课程</button>
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

    for (let i = 0; i < offset; i++) {
      html += '<div class="cal-cell empty"></div>';
    }

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

    if (s.selectedDate) {
      html += this._renderDetail(s.selectedDate);
    }

    html += `</div>`;
    document.getElementById('view-cal').innerHTML = html;
  },

  _renderDetail(dStr) {
    const s = this.state;
    const [y, m, d] = dStr.split('-');
    const dowName = ['日','一','二','三','四','五','六'][new Date(+y, +m - 1, +d).getDay()];
    const holiday = HOLIDAYS[dStr];
    const workday = WORKDAYS[dStr];
    const list = s.classes[dStr] || [];

    let html = `<div class="cal-detail">
      <div class="cal-detail-head">
        <div>
          <span class="cal-detail-title">${y}年${+m}月${+d}日 周${dowName}</span>`;
    if (holiday) html += ` <span class="cal-detail-tag holiday-tag">放假 · ${esc(holiday)}</span>`;
    else if (workday) html += ` <span class="cal-detail-tag workday-tag">调休补班</span>`;
    html += `</div>`;

    if (list.length >= 2) {
      html += `<div class="cal-sort-toggle">
        <button class="cal-sort-btn ${s.sortMode === 'time' ? 'active' : ''}" onclick="CalendarApp.setSortMode('time')">🕐 时间</button>
        <button class="cal-sort-btn ${s.sortMode === 'teacher' ? 'active' : ''}" onclick="CalendarApp.setSortMode('teacher')">👤 老师</button>
      </div>`;
    }
    html += `</div>`;

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

  _renderByTime(dStr, list) {
    const sorted = this._sortByStart(list);
    let html = '';
    sorted.forEach(c => {
      html += this._renderClassItem(dStr, c);
    });
    return html;
  },

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

  _renderClassItem(dStr, c) {
    const course = this.getCourse(c.courseId);
    if (!course) {
      return `<div class="cal-class-item" style="background:#eee;color:#888;">(课程已删除)</div>`;
    }
    const teach = TEACHERS[course.teacher];
    const end = c.start ? addHours(c.start, 2) : '';
    const realIdx = (this.state.classes[dStr] || []).indexOf(c);
    return `<div class="cal-class-item" style="background:${teach.color};color:${teach.textColor}">
      <strong>${teach.letter}</strong>
      <span style="flex:1">${esc(course.name)}</span>
      <span class="cal-class-time">${c.start || ''}${end ? '-' + end : ''}</span>
      <button class="cal-class-del" onclick="event.stopPropagation();CalendarApp.deleteClass('${dStr}',${realIdx})" style="color:${teach.textColor}">删除</button>
    </div>`;
  },

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

  openAdd() {
    if (this.state.courses.length === 0) {
      alert('还没有课程,请先点"管理课程"添加一个');
      return;
    }
    const t = todayCN();
    const defaultDate = this.state.selectedDate || fmtDate(t.y, t.m, t.d);

    let courseOpts = this.state.courses.map(c => {
      const teach = TEACHERS[c.teacher];
      return `<option value="${c.id}">${esc(c.name)} — ${teach.name}</option>`;
    }).join('');

    const html = `<div class="cal-modal-bg" id="cal-modal-add" onclick="if(event.target===this)CalendarApp.closeModal()">
      <div class="cal-modal-box">
        <h3>添加课程</h3>
        <label>日期</label>
        <input type="date" id="cal-m-date" value="${defaultDate}">
        <label>课程</label>
        <select id="cal-m-course">${courseOpts}</select>
        <label>开始时间(默认 2 小时)</label>
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
    const m2 = document.getElementById('cal-modal-manage');
    if (m2) m2.remove();
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
    const name = course ? course.name : '(课程已删除)';
    if (!confirm(`确定删除这节课吗?\n\n${name} · ${c.start || ''}`)) return;
    s.classes[dStr].splice(idx, 1);
    if (s.classes[dStr].length === 0) delete s.classes[dStr];
    await this.saveClasses();
    this.render();
  },

  openManage() {
    let listHtml = '';
    if (this.state.courses.length === 0) {
      listHtml = '<div class="cal-empty">还没有课程</div>';
    } else {
      listHtml = this.state.courses.map(c => {
        const teach = TEACHERS[c.teacher];
        return `<div class="cal-class-item" style="background:${teach.color};color:${teach.textColor}">
          <strong>${teach.letter}</strong>
          <span style="flex:1">${esc(c.name)}</span>
          <button class="cal-class-del" onclick="CalendarApp.deleteCourse('${c.id}')" style="color:${teach.textColor}">删除</button>
        </div>`;
      }).join('');
    }

    const html = `<div class="cal-modal-bg" id="cal-modal-manage" onclick="if(event.target===this)CalendarApp.closeModal()">
      <div class="cal-modal-box">
        <h3>管理课程</h3>
        <p class="cal-course-tip">添加新课程后,在"添加课程"弹窗里就能选到。每个课程绑定一位老师。</p>
        <div class="cal-course-list">${listHtml}</div>
        <div class="cal-course-divider">
          <label>新课程名</label>
          <input type="text" id="cal-new-name" placeholder="例:PU2 三年级">
          <label>归属老师</label>
          <select id="cal-new-teacher">
            <option value="vivian">Vivian (蓝)</option>
            <option value="miranda">Miranda (橙)</option>
          </select>
          <button class="primary" style="width:100%;margin-top:10px;padding:9px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px;color:#fff;" onclick="CalendarApp.addCourse()">+ 添加这个课程</button>
        </div>
        <div class="cal-modal-actions">
          <button onclick="CalendarApp.closeModal()">关闭</button>
        </div>
      </div>
    </div>`;

    this._showModal(html);
  },

  async addCourse() {
    const name = document.getElementById('cal-new-name').value.trim();
    const teacher = document.getElementById('cal-new-teacher').value;
    if (!name) { alert('请输入课程名'); return; }
    this.state.courses.push({
      id: 'c' + Date.now(),
      name,
      teacher
    });
    await this.saveCourses();
    this.closeModal();
    this.openManage();
  },

  async deleteCourse(id) {
    const c = this.getCourse(id);
    if (!c) return;
    let used = 0;
    Object.values(this.state.classes).forEach(arr => arr.forEach(x => {
      if (x.courseId === id) used++;
    }));
    let msg = `确定删除课程"${c.name}"吗?`;
    if (used > 0) {
      msg += `\n\n注意:这个课程已经在日历上排了 ${used} 节课,删除后那些课会显示为"(课程已删除)"。`;
    }
    if (!confirm(msg)) return;
    this.state.courses = this.state.courses.filter(x => x.id !== id);
    await this.saveCourses();
    this.closeModal();
    this.openManage();
    this.render();
  }
};
