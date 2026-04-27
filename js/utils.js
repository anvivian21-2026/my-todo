// ============================================================
// utils.js — 通用工具函数
// ============================================================
// 这里放"和业务无关、纯粹处理数据"的函数。
// 待办、日历都能用,所以独立出来,避免重复写。
// ============================================================

// ─── 日期工具 ────────────────────────────────────────────────

// 把 Date 对象格式化成 'YYYY-MM-DD' 字符串
function ds(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 今天的日期字符串(基于本机时区)
function todayStr() {
  return ds(new Date());
}

// 把 'YYYY-MM-DD' 显示成 'M/DD'(用于 UI 简化显示)
function fmt(s) {
  const d = new Date(s + 'T00:00:00');
  return `${d.getMonth()+1}/${String(d.getDate()).padStart(2,'0')}`;
}

// 在某个 Date 上加 n 天,返回新的 Date 对象
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// 找到某个 Date 所在那一周的周一(返回 Date 对象)
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// 判断某个日期字符串是否在过去
function isPast(s) {
  return s < todayStr();
}

// 中国时区的"今天"(给日历用,避免时区错位)
function todayCN() {
  const now = new Date();
  const cn = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 8 * 3600000);
  return { y: cn.getFullYear(), m: cn.getMonth(), d: cn.getDate() };
}

// 把 'YYYY-MM-DD' 拼成给日历用的格式(年-月-日 三个数字)
function fmtDate(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// 在 'HH:MM' 上加几小时,返回新的 'HH:MM'
function addHours(hhmm, hours) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + hours * 60;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
}

// ─── HTML 安全 ───────────────────────────────────────────────

// 转义用户输入,防止把任务文字当作 HTML 渲染
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
