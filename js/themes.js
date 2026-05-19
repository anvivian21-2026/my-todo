/* ============================================================
   themes.css — 主题变量声明 + 换肤按钮样式
   ============================================================
   这个文件做两件事:
     1. 给 :root 设置 6 个主题 CSS 变量的"默认值"
        (避免 themes.js 加载之前页面是白板)
     2. 提供换肤按钮的样式
   ============================================================ */


/* ─── 主题变量:默认值(themes.js 启动后会覆盖)──────────────
   这套默认值用的是"周一果园绿",所以即使 JS 没加载完,
   页面也能正常显示,不会刺眼地白屏。
   ─────────────────────────────────────────────────────────── */

:root {
  --theme-primary-dark:  #468432;
  --theme-primary-light: #5FA047;
  --theme-background:    #FFFDF0;
  --theme-card:          #FFFFFF;
  --theme-accent:        #FFA02E;
  --theme-text:          #2A4A1F;
}


/* ─── 换肤按钮 ─────────────────────────────────────────────
   位置:贴在 header 右上角同步状态点旁边。
   长相:小药丸,显示当前主题名,点一下跳到下一套。
   ─────────────────────────────────────────────────────────── */

.theme-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, .15);
  border: 1px solid rgba(255, 255, 255, .25);
  color: #fff;
  font-size: 12px;
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  letter-spacing: 0.5px;
  transition: background 0.15s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.theme-switch-btn:hover {
  background: rgba(255, 255, 255, .25);
}

.theme-switch-btn:active {
  transform: scale(0.96);
}

.theme-switch-btn svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.theme-switch-btn #theme-name {
  font-size: 11px;
  white-space: nowrap;
}
