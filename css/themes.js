// ============================================================
// themes.js — 每日轮换主题模块
// ============================================================
// 这个文件存放整个 app 的"配色心情"——7 套主题,每天自动换一套。
//
// 设计原则:所有颜色都在这里集中管理。改某一天的某个颜色,
// 只需要在下面 THEMES 对象里找到那一天,改一行就行。
// css 和 js 的其他文件完全不用动。
//
// 数据流:
//   1. 启动时 ThemeApp.init() 读当前星期几
//   2. 从 THEMES 里选对应的一套
//   3. 把 6 个色值注入 :root 的 CSS 变量
//   4. 所有 css 里写 var(--theme-primary-dark) 等的地方自动变色
//
// 手动换肤:
//   - 点 header 上的换肤按钮 → 跳到下一套主题
//   - 选择记在 localStorage,带"覆盖日期"标记
//   - 第二天打开,日期不一样了,自动回归"按星期切换"逻辑
// ============================================================

// ─── 区块 1:7 套主题色值(改颜色就动这里)───────────────────
//
// 每套 6 个色值,角色固定:
//   primaryDark   主色深  → header 渐变起点 / 主按钮深色态
//   primaryLight  主色浅  → header 渐变终点 / 主按钮浅色态
//   background    背景色  → 整个页面的底色
//   card          卡片色  → 任务卡片 / 详情区 / 弹窗的背景
//   accent        强调色  → "今天"徽章 / 加号按钮 / 警告标红
//   text          文字色  → 主要文字颜色(深色,对比白卡片)
//
// 改色提示:
//   - 改完保存,刷新页面(Ctrl+Shift+R 清缓存)即生效
//   - 如果某套颜色在某些场景对比度不够(比如文字看不清),
//     主要调整 text 这个色值,让它和 card 形成强对比
// ─────────────────────────────────────────────────────────────

const THEMES = {

  monday: {
    name: '果园绿',
    mood: '启动 · 乐观',
    primaryDark:  '#468432',
    primaryLight: '#5FA047',
    background:   '#FFFDF0',
    card:         '#FFFFFF',
    accent:       '#FFA02E',
    text:         '#2A4A1F'
  },

  tuesday: {
    name: '海岛蓝',
    mood: '深度思考',
    primaryDark:  '#2D8FB5',
    primaryLight: '#5BB8D6',
    background:   '#F0FBFD',
    card:         '#FFFFFF',
    accent:       '#FF8C42',
    text:         '#1A4A5C'
  },

  wednesday: {
    name: '紫莓糖',
    mood: '创新想法',
    primaryDark:  '#9D5BC4',
    primaryLight: '#BC85DA',
    background:   '#FBF4FD',
    card:         '#FFFFFF',
    accent:       '#FFC93C',
    text:         '#4A2363'
  },

  thursday: {
    name: '番茄红',
    mood: '紧迫细节 · 冲刺',
    primaryDark:  '#E54B45',
    primaryLight: '#F47872',
    background:   '#FFF5F2',
    card:         '#FFFFFF',
    accent:       '#3DA968',
    text:         '#5C1F1C'
  },

  friday: {
    name: '蜜桃橙',
    mood: '友好动力',
    primaryDark:  '#F08247',
    primaryLight: '#FFA978',
    background:   '#FFF8F0',
    card:         '#FFFFFF',
    accent:       '#C44A6E',
    text:         '#5C3014'
  },

  saturday: {
    name: '焦糖棕',
    mood: '沉稳长期',
    primaryDark:  '#B57339',
    primaryLight: '#D49860',
    background:   '#FFF8EE',
    card:         '#FFFFFF',
    accent:       '#5FA047',
    text:         '#4A2D14'
  },

  sunday: {
    name: '薄荷绿',
    mood: '减压抗淹没',
    primaryDark:  '#4FB39C',
    primaryLight: '#7CCFBC',
    background:   '#F0FBF7',
    card:         '#FFFFFF',
    accent:       '#E89A3C',
    text:         '#1F4A3C'
  }

};


// ─── 区块 2:星期→主题 的映射(一般不用改)─────────────────
//
// JavaScript 的 Date.getDay() 返回 0-6,顺序固定:
//   0 = 周日, 1 = 周一, 2 = 周二, ..., 6 = 周六
// 下面的数组按这个顺序排列,索引值刚好对应。
// ─────────────────────────────────────────────────────────────

const DAY_TO_THEME = [
  'sunday',     // 0 周日
  'monday',     // 1 周一
  'tuesday',    // 2 周二
  'wednesday',  // 3 周三
  'thursday',   // 4 周四
  'friday',     // 5 周五
  'saturday'    // 6 周六
];


// ─── 区块 3:手动覆盖切换顺序(一般不用改)──────────────────
//
// 点"换肤"按钮时,按这个顺序循环:周一→周二→...→周日→周一
// 如果将来要加第 8 套主题,在 THEMES 里加一项,
// 然后在这个数组里加对应的 key 就行。
// ─────────────────────────────────────────────────────────────

const THEME_CYCLE = ['monday', 'tuesday', 'wednesday', 'thursday',
                     'friday', 'saturday', 'sunday'];


// ─── 区块 4:本地存储 key ──────────────────────────────────

const STORAGE_KEY_THEME = 'todo-theme-override';


// ─── 区块 5:主题应用核心(一般不用改)──────────────────────

const ThemeApp = {

  // 当前正在显示的主题 key(用于换肤按钮的循环判断)
  currentKey: null,

  // ─── 初始化:启动时调用一次 ─────────────────────────────
  init() {
    const todayStr = this._todayStr();

    // 看看 localStorage 里有没有"今天的临时覆盖"
    let overrideKey = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_THEME);
      if (raw) {
        const obj = JSON.parse(raw);
        // 只有日期还是今天的覆盖才生效;过期了就清掉
        if (obj && obj.date === todayStr && obj.themeKey && THEMES[obj.themeKey]) {
          overrideKey = obj.themeKey;
        } else {
          localStorage.removeItem(STORAGE_KEY_THEME);
        }
      }
    } catch (e) {}

    // 决定用哪套:有覆盖用覆盖的,没有就按星期几自动选
    const key = overrideKey || this._themeOfToday();
    this.apply(key);
  },

  // ─── 应用某套主题 ────────────────────────────────────────
  apply(themeKey) {
    const t = THEMES[themeKey];
    if (!t) return;

    this.currentKey = themeKey;

    // 把 6 个色值注入到 :root 的 CSS 变量
    const root = document.documentElement;
    root.style.setProperty('--theme-primary-dark',  t.primaryDark);
    root.style.setProperty('--theme-primary-light', t.primaryLight);
    root.style.setProperty('--theme-background',    t.background);
    root.style.setProperty('--theme-card',          t.card);
    root.style.setProperty('--theme-accent',        t.accent);
    root.style.setProperty('--theme-text',          t.text);

    // 更新换肤按钮上显示的主题名(如果按钮已经渲染了)
    const label = document.getElementById('theme-name');
    if (label) label.textContent = t.name;
  },

  // ─── 手动切换到下一套主题(换肤按钮点击) ───────────────
  cycle() {
    const i = THEME_CYCLE.indexOf(this.currentKey);
    const next = THEME_CYCLE[(i + 1) % THEME_CYCLE.length];
    this.apply(next);

    // 把覆盖记到 localStorage,带今天日期
    try {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify({
        date: this._todayStr(),
        themeKey: next
      }));
    } catch (e) {}
  },

  // ─── 工具:按今天星期几查映射表 ──────────────────────────
  _themeOfToday() {
    return DAY_TO_THEME[new Date().getDay()];
  },

  // ─── 工具:今天的日期字符串(同 utils.js 的 todayStr)────
  // 这里独立写一份是为了不依赖加载顺序——themes.js 加载时
  // utils.js 可能还没准备好。
  _todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

};
