// ============================================================
// app.js — 应用启动 + 标签切换 + 换肤按钮注入
// ============================================================
// 这个文件做四件事:
//   1. 启动主题模块(必须最先,免得页面闪一下旧色)
//   2. 启动 TodoApp / CalendarApp / ClassesApp
//   3. 在 header 注入换肤按钮(等 TodoApp 首次渲染后)
//   4. 处理"待办 / 日历 / 班级"三标签切换
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


// ─── 换肤按钮:注入到 header 的同步点旁边 ─────────────────────
//
// 因为 TodoApp.render() 会重新生成 header 的 HTML,导致按钮丢失,
// 所以每次 render 后都要重新注入。
//
// 做法:包装 TodoApp.render,让它在原渲染后顺带注入按钮。
// 这样不需要改 todo.js 一行代码。
// ─────────────────────────────────────────────────────────────

function injectThemeButton() {
  // header 里的同步点容器
  const dot = document.getElementById('sync-dot');
  if (!dot) return;

  // 如果按钮已经在,跳过
  if (document.getElementById('theme-switch-btn')) return;

  // 获取当前主题名,用于按钮标签
  const themeName = (typeof ThemeApp !== 'undefined' && ThemeApp.currentKey
                     && typeof THEMES !== 'undefined' && THEMES[ThemeApp.currentKey])
    ? THEMES[ThemeApp.currentKey].name
    : '换肤';

  const btn = document.createElement('button');
  btn.id = 'theme-switch-btn';
  btn.className = 'theme-switch-btn';
  btn.title = '点击切换主题(明天自动恢复)';
  btn.innerHTML =
    '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.37-.61-.37-.99 0-.83.67-1.5 1.5-1.5H14c2.21 0 4-1.79 4-4 0-3.87-3.58-7-8-7zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S3.67 8 4.5 8 6 8.67 6 9.5 5.33 11 4.5 11zm3-4C6.67 7 6 6.33 6 5.5S6.67 4 7.5 4 9 4.67 9 5.5 8.33 7 7.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S11.67 4 12.5 4s1.5.67 1.5 1.5S13.33 7 12.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S14.67 8 15.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/>' +
    '</svg>' +
    '<span id="theme-name">' + themeName + '</span>';

  btn.onclick = function(e) {
    e.stopPropagation();
    if (typeof ThemeApp !== 'undefined') ThemeApp.cycle();
  };

  // 把按钮插到同步点之前(让换肤按钮在左、同步点在右)
  dot.parentElement.insertBefore(btn, dot);
}


// 包装 TodoApp.render,让它每次渲染后都重新注入按钮
function hookTodoRender() {
  if (typeof TodoApp === 'undefined' || !TodoApp.render) return;
  const originalRender = TodoApp.render.bind(TodoApp);
  TodoApp.render = function() {
    originalRender();
    injectThemeButton();
  };
}


// ─── 应用启动 ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {

  // 1. 先启动主题(必须最先,避免闪烁)
  if (typeof ThemeApp !== 'undefined') {
    ThemeApp.init();
  }

  // 2. 挂钩 TodoApp.render(必须在 TodoApp.init 之前包装)
  hookTodoRender();

  // 3. 启动待办模块
  if (typeof TodoApp !== 'undefined') {
    TodoApp.init();
  }

  // 4. 启动日历模块
  if (typeof CalendarApp !== 'undefined') {
    CalendarApp.init();
  }

  // 5. 启动班级模块
  if (typeof ClassesApp !== 'undefined') {
    ClassesApp.init();
  }

  // 6. 绑定标签切换
  const tabTodo    = document.getElementById('tab-todo');
  const tabCal     = document.getElementById('tab-cal');
  const tabClasses = document.getElementById('tab-classes');

  if (tabTodo)    tabTodo.onclick    = () => switchTab('todo');
  if (tabCal)     tabCal.onclick     = () => switchTab('cal');
  if (tabClasses) tabClasses.onclick = () => switchTab('classes');
});
