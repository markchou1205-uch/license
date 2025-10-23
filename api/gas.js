// /api/gas.js - Vercel Serverless Proxy to Google Apps Script
export default async function handler(req, res) {
  // 1) 主要來源：環境變數
  let GAS_URL = process.env.GAS_URL;

  // 2) 臨時 fallback：允許用 ?_gas= 帶進來（限測試）
  if (!GAS_URL && typeof req.query?._gas === 'string' && req.query._gas.startsWith('https://')) {
    GAS_URL = req.query._gas;
  }

  if (!GAS_URL) {
    res.status(500).json({
      ok: false,
      error: 'GAS_URL is not set in env. Set it in Vercel → Project → Settings → Environment Variables, or pass ?_gas=... only for testing.'
    });
    return;
  }

  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // 如需鎖定網域，可改為你的 vercel 網域
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

    if (req.method === 'GET') {
      // 把原本的查詢參數（扣掉 _gas）轉給 Apps Script
      const { _gas, ...forwardQuery } = req.query || {};
      const qs = new URLSearchParams(forwardQuery).toString();
      const target = qs ? `${GAS_URL}${GAS_URL.includes('?') ? '&' : '?'}${qs}` : GAS_URL;

      const r = await fetch(target, { method: 'GET' });
      const txt = await r.text();
      res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8');
      res.status(r.status).send(txt);
      return;
    }

    if (req.method === 'POST') {
      // 將 body 轉成 x-www-form-urlencoded 字串
      const bodyStr = typeof req.body === 'string'
        ? req.body
        : new URLSearchParams(req.body || {}).toString();

      const r = await fetch(GAS_URL, { method: 'POST', headers, body: bodyStr });
      const txt = await r.text();
      res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8');
      res.status(r.status).send(txt);
      return;
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    res.status(502).json({ ok: false, error: String(err?.message || err) });
  }
}
