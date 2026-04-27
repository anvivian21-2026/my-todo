// ============================================================
// classes.js — 班级模块
// ============================================================
// 整个班级功能装在 ClassesApp 这个对象里。
// 与 todo.js / calendar.js 完全独立,不直接调用。
//
// 数据存储(账本式):
//   - 班级:Supabase id='classes',{ list: [{id, name, teacher, studentIds}] }
//   - 学生:Supabase id='students',{ list: [{id, name, classId, ...}] }(批次 9 启用)
//   - 出勤+课时变动账本:Supabase id='attendance',{ list: [...] }(批次 10 启用)
//
// 老师配置来自 config.js 的 TEACHERS
// 各种常量来自 config.js 的"区块 5:班级模块配置"
//
// 当前批次(批次 8):只做班级 CRUD 骨架,学生/出勤暂不实现
// ============================================================

const ClassesApp = {

  // ─── 状态 ─────────────────────────────────────────────
  state: {
    classes: [],            // 班级列表 [{id, name, teacher, studentIds}]
    students: [],           // 学生列表(批次 9 启用,先占位)
    view: 'list',           // 'list' = 班级列表, 'detail' = 班级详情, 'unassigned' = 未分班
    selectedClassId: null,  // 当前查看的班级 id
    _migrated: false        // 是否已经从旧 courses 迁移过
  },

  // ─── 初始化 ───────────────────────────────────────────
  init() {
    this.loadData();
  },

  // ─── 数据加载(含旧数据迁移)───────────────────────
  async loadData() {
    // 1. 先尝试读新的 classes
    let classData = await syncLoad(SB_ID_CLASSES);

    if (classData && classData.list) {
      // 已经有新版数据,直接用
      this.state.classes = classData.list;
      this.state._migrated = true;
    } else {
      // 没有新版数据,尝试从旧 courses 迁移
      const oldCourses = await syncLoad(SB_ID_COURSES);
      if (oldCourses && oldCourses.list) {
        // 把旧课程升级为班级:加 studentIds 空数组
        this.state.classes = oldCourses.list.map(c => ({
          id: c.id,
          name: c.name,
          teacher: c.teacher,
          studentIds: []      // 班级模块新加的字段
        }));
        // 写入新 id,但保留旧 courses 不动(让日历继续工作)
        await syncSave(SB_ID_CLASSES, { list: this.state.classes });
        this.state._migrated = true;
      } else {
        // 啥都没有,空数组
        this.state.classes = [];
      }
    }

    // 2. 加载学生(批次 9 启用,这里先准备好)
    const studentData = await syncLoad(SB_ID_STUDENTS);
    if (studentData && studentData.list) {
      this.state.students = studentData.list;
    }

    this.render();
  },

  async saveClasses() {
    await syncSave(SB_ID_CLASSES, { list: this.state.classes });
    // 同时同步回旧 courses(让日历模块继续工作)
    // 注:旧 courses 数据格式是 { list: [{id, name, teacher}] },没有 studentIds
    const coursesFormat = this.state.classes.map(c => ({
      id: c.id,
      name: c.name,
      teacher: c.teacher
    }));
    await syncSave(SB_ID_COURSES, { list: coursesFormat });
  },

  async saveStudents() {
    await syncSave(SB_ID_STUDENTS, { list: this.state.students });
  },

  // ─── 工具:按 id 查班级 ───────────────────────────────
  getClass(id) {
    return this.state.classes.find(c => c.id === id);
  },

  // 统计某班学生数(批次 9 完整启用)
  countStudentsInClass(classId) {
    return this.state.students.filter(s => s.classId === classId).length;
  },

  // 未分班学生数
  countUnassigned() {
    return this.state.students.filter(s => !s.classId).length;
  },

  // ─── 主渲染入口 ───────────────────────────────────────
  render() {
    const target = document.getElementById('view-classes');
    if (!target) return;

    if (this.state.view === 'detail' && this.state.selectedClassId) {
      target.innerHTML = this._renderDetail();
    } else if (this.state.view === 'unassigned') {
      target.innerHTML = this._renderUnassigned();
    } else {
      target.innerHTML = this._renderList();
    }
  },

  // ─── 班级列表页 ───────────────────────────────────────
  _renderList() {
    const s = this.state;
    const unassignedCount = this.countUnassigned();

    let html = `<div class="cls-wrap">
      <div class="cls-nav">
        <div class="cls-nav-left">
          <span class="cls-title">班级</span>
          <span class="cls-subtitle">${s.classes.length} 个班</span>
        </div>
        <div class="cls-nav-right">
          ${unassignedCount > 0
            ? `<button class="cls-unassigned-btn" onclick="ClassesApp.openUnassigned()">未分班 ${unassignedCount}</button>`
            : ''}
          <button class="cls-add-btn" onclick="ClassesApp.openAdd()">+ 新建班级</button>
        </div>
      </div>`;

    if (s.classes.length === 0) {
      html += `<div class="cls-empty-state">
        <div class="icon">📚</div>
        <div class="tip">还没有班级<br>点下面的按钮新建第一个班</div>
        <button class="cls-add-btn" onclick="ClassesApp.openAdd()">+ 新建班级</button>
      </div>`;
    } else {
      html += `<div class="cls-card-list">`;
      for (const c of s.classes) {
        html += this._renderCard(c);
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  },

  // 单张班级卡片
  _renderCard(c) {
    const teach = TEACHERS[c.teacher];
    if (!teach) {
      // 老师配置丢了(理论不会发生),给个兜底显示
      return `<div class="cls-card" style="border-left-color:#999">
        <div class="cls-card-head">
          <span class="cls-card-name">${esc(c.name)}</span>
          <span class="cls-card-teacher" style="background:#eee;color:#888">老师未知</span>
        </div>
      </div>`;
    }
    const studentCount = this.countStudentsInClass(c.id);
    return `<div class="cls-card" style="border-left-color:${teach.color}" onclick="ClassesApp.openDetail('${c.id}')">
      <div class="cls-card-head">
        <span class="cls-card-name">${esc(c.name)}</span>
        <span class="cls-card-teacher" style="background:${teach.color};color:${teach.textColor}">${teach.letter} ${teach.name}</span>
      </div>
      <div class="cls-card-meta">
        ${studentCount > 0
          ? `${studentCount} 名学生`
          : `<span class="empty-tip">还没有学生(批次 9 上线后可添加)</span>`}
      </div>
    </div>`;
  },

  // ─── 班级详情页 ───────────────────────────────────────
  _renderDetail() {
    const c = this.getClass(this.state.selectedClassId);
    if (!c) {
      // 班级被删了,回列表
      this.state.view = 'list';
      this.state.selectedClassId = null;
      return this._renderList();
    }
    const teach = TEACHERS[c.teacher];
    const studentCount = this.countStudentsInClass(c.id);

    return `<div class="cls-detail-wrap">
      <div class="cls-detail-head">
        <button class="cls-back-btn" onclick="ClassesApp.backToList()">‹</button>
        <div class="cls-detail-info">
          <div class="cls-detail-name">${esc(c.name)}</div>
          <div class="cls-detail-teacher">老师:${teach ? teach.name : '未知'} · ${studentCount} 名学生</div>
        </div>
        <button class="cls-detail-edit-btn" onclick="ClassesApp.openEdit('${c.id}')">编辑</button>
      </div>

      <div class="cls-students-section">
        <div class="cls-students-head">
          <span class="cls-students-title">学生</span>
        </div>
        <div class="cls-coming-soon">
          🚧 学生管理功能将在批次 9 上线<br>
          届时可以添加学生、管理课时、查看出勤
        </div>
      </div>

      <div class="cls-detail-danger-zone">
        <button class="cls-delete-class-btn" onclick="ClassesApp.deleteClass('${c.id}')">删除这个班级</button>
      </div>
    </div>`;
  },

  // ─── 未分班页(占位)──────────────────────────────────
  _renderUnassigned() {
    return `<div class="cls-detail-wrap">
      <div class="cls-detail-head">
        <button class="cls-back-btn" onclick="ClassesApp.backToList()">‹</button>
        <div class="cls-detail-info">
          <div class="cls-detail-name">未分班</div>
          <div class="cls-detail-teacher">没有班级归属的学生</div>
        </div>
      </div>
      <div class="cls-coming-soon">
        🚧 学生管理功能将在批次 9 上线
      </div>
    </div>`;
  },

  // ─── 操作 ─────────────────────────────────────────────
  openDetail(classId) {
    this.state.view = 'detail';
    this.state.selectedClassId = classId;
    this.render();
  },

  backToList() {
    this.state.view = 'list';
    this.state.selectedClassId = null;
    this.render();
  },

  openUnassigned() {
    this.state.view = 'unassigned';
    this.render();
  },

  // ─── 新建班级弹窗 ─────────────────────────────────────
  openAdd() {
    let teacherOpts = Object.keys(TEACHERS).map(tKey => {
      const t = TEACHERS[tKey];
      return `<option value="${tKey}">${t.name}</option>`;
    }).join('');

    const html = `<div class="cls-modal-bg" id="cls-modal" onclick="if(event.target===this)ClassesApp.closeModal()">
      <div class="cls-modal-box">
        <h3>新建班级</h3>
        <label>班级名</label>
        <input type="text" id="cls-m-name" placeholder="例:PU2 三年级" autofocus>
        <label>归属老师</label>
        <select id="cls-m-teacher">${teacherOpts}</select>
        <div class="cls-modal-actions">
          <button onclick="ClassesApp.closeModal()">取消</button>
          <button class="primary" onclick="ClassesApp.saveNewClass()">创建</button>
        </div>
      </div>
    </div>`;

    this._showModal(html);
    setTimeout(() => {
      const inp = document.getElementById('cls-m-name');
      if (inp) inp.focus();
    }, 50);
  },

  // ─── 编辑班级弹窗 ─────────────────────────────────────
  openEdit(classId) {
    const c = this.getClass(classId);
    if (!c) return;

    let teacherOpts = Object.keys(TEACHERS).map(tKey => {
      const t = TEACHERS[tKey];
      return `<option value="${tKey}" ${tKey === c.teacher ? 'selected' : ''}>${t.name}</option>`;
    }).join('');

    const html = `<div class="cls-modal-bg" id="cls-modal" onclick="if(event.target===this)ClassesApp.closeModal()">
      <div class="cls-modal-box">
        <h3>编辑班级</h3>
        <label>班级名</label>
        <input type="text" id="cls-m-name" value="${esc(c.name)}">
        <label>归属老师</label>
        <select id="cls-m-teacher">${teacherOpts}</select>
        <div class="cls-modal-actions">
          <button onclick="ClassesApp.closeModal()">取消</button>
          <button class="primary" onclick="ClassesApp.saveEditClass('${c.id}')">保存</button>
        </div>
      </div>
    </div>`;

    this._showModal(html);
  },

  closeModal() {
    const m = document.getElementById('cls-modal');
    if (m) m.remove();
  },

  _showModal(html) {
    this.closeModal();
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);
  },

  // ─── 保存新班级 ───────────────────────────────────────
  async saveNewClass() {
    const name = document.getElementById('cls-m-name').value.trim();
    const teacher = document.getElementById('cls-m-teacher').value;
    if (!name) { alert('请输入班级名'); return; }

    this.state.classes.push({
      id: 'cls_' + Date.now(),
      name,
      teacher,
      studentIds: []
    });
    await this.saveClasses();
    this.closeModal();
    this.render();
  },

  // ─── 保存编辑 ─────────────────────────────────────────
  async saveEditClass(classId) {
    const c = this.getClass(classId);
    if (!c) return;
    const name = document.getElementById('cls-m-name').value.trim();
    const teacher = document.getElementById('cls-m-teacher').value;
    if (!name) { alert('请输入班级名'); return; }

    c.name = name;
    c.teacher = teacher;
    await this.saveClasses();
    this.closeModal();
    this.render();
  },

  // ─── 删除班级 ─────────────────────────────────────────
  async deleteClass(classId) {
    const c = this.getClass(classId);
    if (!c) return;

    // 检查这个班是否有学生(批次 9 用上)
    const studentCount = this.countStudentsInClass(classId);

    let msg = `确定删除班级"${c.name}"吗?`;
    if (studentCount > 0) {
      msg += `\n\n这个班有 ${studentCount} 名学生,删除后他们会变成"未分班"状态(资料和出勤记录都保留)。`;
    }

    // 检查日历里是否还在用这个班(原 courseId)
    const calendarData = await syncLoad(SB_ID_CALENDAR) || {};
    let usedInCalendar = 0;
    Object.values(calendarData).forEach(arr => {
      if (Array.isArray(arr)) {
        arr.forEach(x => { if (x.courseId === classId) usedInCalendar++; });
      }
    });
    if (usedInCalendar > 0) {
      msg += `\n\n注意:日历上有 ${usedInCalendar} 节这个班的课,删除后那些课会显示为"(课程已删除)"。`;
    }

    if (!confirm(msg)) return;

    // 把这个班里的学生改成"未分班"
    this.state.students.forEach(s => {
      if (s.classId === classId) s.classId = null;
    });
    if (studentCount > 0) await this.saveStudents();

    // 删除班级本身
    this.state.classes = this.state.classes.filter(x => x.id !== classId);
    await this.saveClasses();

    // 回到列表
    this.state.view = 'list';
    this.state.selectedClassId = null;
    this.render();
  }
};
