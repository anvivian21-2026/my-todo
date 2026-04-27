// ============================================================
// sync.js — Supabase 同步通用层
// ============================================================
// 这里只做一件事:用同样的方式读/写 Supabase 数据。
// 待办用、日历用、未来新模块也用——只要传不同的 id。
//
// 数据存储约定:
//   tasks 表的每一行 { id, data, updated_at }
//   - id 区分模块('todo' / 'calendar' / 'courses')
//   - data 是一个 JSON 对象,里面装该模块的所有数据
// ============================================================

// 通用读取:从 Supabase 读取某个 id 对应的数据
// 失败返回 null(网络断了、id 不存在都算失败)
async function syncLoad(id) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/tasks?id=eq.${id}&select=data`, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY
      },
      signal: AbortSignal.timeout(5000)  // 5 秒超时,避免长时间转圈
    });
    if (r.ok) {
      const rows = await r.json();
      if (rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
    }
  } catch (e) {
    // 网络错误时静默失败,让调用方自己处理
  }
  return null;
}

// 通用写入:把数据写到 Supabase 的某个 id 行
// 用 upsert 语义,行不存在就插入,存在就更新
async function syncSave(id, data) {
  try {
    // 先尝试 PATCH(更新已有行)
    const patchRes = await fetch(`${SB_URL}/rest/v1/tasks?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        data: data,
        updated_at: new Date().toISOString()
      })
    });

    // 如果 PATCH 后没有任何行被更新(说明行不存在),则插入
    if (patchRes.ok) {
      const updated = await patchRes.json();
      if (Array.isArray(updated) && updated.length === 0) {
        await fetch(`${SB_URL}/rest/v1/tasks`, {
          method: 'POST',
          headers: {
            'apikey': SB_KEY,
            'Authorization': 'Bearer ' + SB_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            id: id,
            data: data,
            updated_at: new Date().toISOString()
          })
        });
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

// 同步状态点(右上角小圆点)的统一更新函数
// 颜色:绿=已同步,红=失败,灰=未连接
function setSyncDot(color) {
  const dot = document.getElementById('sync-dot');
  if (dot) dot.style.background = color;
}
