// ============================================================
// app.js — 应用启动 + 标签切换
// ============================================================
// 这个文件做两件事:
//   1. 等 DOM 就绪后启动各模块(待办、日历)
//   2. 处理"待办"和"日历"两个标签页的切换
//
// 必须最后加载,因为它依赖前面所有模块
// ============================================================

// ─── 标签切换 ────────────────────────────────────────────────
function switchTab(which) {
  const todoView = document.getElementById('view-todo');
  const calView = document.getElementById('view-cal');
  const todoTab = document.getElementById('tab-todo');
  const calTab = document.getElementById('tab-cal');

  if (which === 'cal') {
    todoView.style.display = 'none';
    calView.style.display = 'block';
    calTab.classList.add('tab-active');
    todoTab.classList.remove('tab-active');
  } else {
    todoView.style.display = 'block';
    calView.style.display = 'none';
    todoTab.classList.add('tab-active');
    calTab.classList.remove('tab-active');
  }
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

  // 绑定标签切换
  const tabTodo = document.getElementById('tab-todo');
  const tabCal = document.getElementById('tab-cal');
  if (tabTodo) tabTodo.onclick = () => switchTab('todo');
  if (tabCal)  tabCal.onclick  = () => switchTab('cal');
});
