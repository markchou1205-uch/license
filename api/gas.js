// /api/gas.js - Vercel Serverless Proxy to Google Apps Script
export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_URL; // 在 Vercel 設成環境變數
  if (!GAS_URL) {
    res.status(500).json({ ok: false, error: 'GAS_URL is not set in env' });
    return;
  }

  // --- CORS 預檢 ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // 或改成你的網域
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 準備要轉發的 URL 與 body/query
    let target = GAS_URL;
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

    if (req.method === 'GET') {
      const qs = new URLSearchParams(req.query).toString();
      if (qs) target += (GAS_URL.includes('?') ? '&' : '?') + qs;
      const r = await fetch(target, { method: 'GET' });
      const txt = await r.text();
      res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8');
      res.status(r.status).send(txt);
      return;
    }

    if (req.method === 'POST') {
      // Vercel 會把 application/x-www-form-urlencoded 解析成物件；需轉回字串
      const bodyStr =
        typeof req.body === 'string'
          ? req.body
          : new URLSearchParams(req.body || {}).toString();

      const r = await fetch(target, {
        method: 'POST',
        headers,
        body: bodyStr
      });
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
