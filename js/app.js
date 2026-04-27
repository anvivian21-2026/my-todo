// ============================================================
// app.js — 应用启动 + 标签切换
// ============================================================
// 这个文件只做两件事:
//   1. 等所有模块加载完后,启动它们
//   2. 处理"待办"和"日历"两个标签页的切换
//
// 注意:它必须最后加载(因为要等其他模块都准备好)
// ============================================================

// ─── 标签切换 ────────────────────────────────────────────────
// 因为目前只有"待办"标签,所以这块逻辑暂时占位
// 第二阶段加入日历后,会启用真正的切换功能

function switchTab(which) {
  const todoView = document.getElementById('view-todo');
  const calView = document.getElementById('view-cal');
  const todoTab = document.getElementById('tab-todo');
  const calTab = document.getElementById('tab-cal');

  if (which === 'cal' && calView) {
    todoView.style.display = 'none';
    calView.style.display = 'block';
    if (calTab) calTab.classList.add('tab-active');
    if (todoTab) todoTab.classList.remove('tab-active');
  } else {
    todoView.style.display = 'block';
    if (calView) calView.style.display = 'none';
    if (todoTab) todoTab.classList.add('tab-active');
    if (calTab) calTab.classList.remove('tab-active');
  }
}

// ─── 应用启动 ────────────────────────────────────────────────
// 等 DOM 就绪后再启动各模块
window.addEventListener('DOMContentLoaded', () => {
  // 启动待办模块
  if (typeof TodoApp !== 'undefined') {
    TodoApp.init();
  }

  // 第二阶段会在这里启动日历模块
  // if (typeof CalendarApp !== 'undefined') {
  //   CalendarApp.init();
  // }

  // 绑定标签切换按钮(如果存在)
  const tabTodo = document.getElementById('tab-todo');
  const tabCal = document.getElementById('tab-cal');
  if (tabTodo) tabTodo.onclick = () => switchTab('todo');
  if (tabCal)  tabCal.onclick  = () => switchTab('cal');
});
