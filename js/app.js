// ============================================================
// app.js — 应用启动 + 标签切换
// ============================================================
// 这个文件做两件事:
//   1. 等 DOM 就绪后启动各模块(待办、日历、班级)
//   2. 处理"待办 / 日历 / 班级"三个标签页的切换
//
// 必须最后加载,因为它依赖前面所有模块
// ============================================================


// ─── 标签切换 ────────────────────────────────────────────────
// 三个视图任选其一显示,其他两个隐藏
function switchTab(which) {
  const views = {
    todo:    document.getElementById('view-todo'),
    cal:     document.getElementById('view-cal'),
    classes: document.getElementById('view-classes')
  };
  const tabs = {
    todo:    document.getElementById('tab-todo'),
    cal:     document.getElementById('tab-cal'),
    classes: document.getElementById('tab-classes')
  };

  // 隐藏所有视图、移除所有 active
  Object.keys(views).forEach(key => {
    if (views[key])  views[key].style.display = 'none';
    if (tabs[key])   tabs[key].classList.remove('tab-active');
  });

  // 显示选中的视图、加 active
  if (views[which]) views[which].style.display = 'block';
  if (tabs[which])  tabs[which].classList.add('tab-active');
}


// ─── 应用启动 ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // 启动待办模块
  if (typeof TodoApp !== 'undefined') {
    TodoApp.init();
  }

  // 启动日历模块
  if (typeof CalendarApp !== 'undefined') {
    CalendarApp.init();
  }

  // 启动班级模块
  if (typeof ClassesApp !== 'undefined') {
    ClassesApp.init();
  }

  // 绑定标签切换
  const tabTodo    = document.getElementById('tab-todo');
  const tabCal     = document.getElementById('tab-cal');
  const tabClasses = document.getElementById('tab-classes');

  if (tabTodo)    tabTodo.onclick    = () => switchTab('todo');
  if (tabCal)     tabCal.onclick     = () => switchTab('cal');
  if (tabClasses) tabClasses.onclick = () => switchTab('classes');
});
