// api/gas.js  (Vercel Serverless Function)
// 代理轉送到 Apps Script /exec，處理 GET/POST 與 CORS
const GAS = process.env.GAS_EXEC_URL; // 在 Vercel 專案設定 Environment Variables

export default async function handler(req, res) {
  // CORS 預設放行同源，也可改成你的網域
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (!GAS) {
    return res.status(500).json({ ok: false, error: "GAS_EXEC_URL not configured" });
  }

  try {
    let fetchRes;

    if (req.method === "GET") {
      // 把 ?query 轉給 GAS
      const url = new URL(GAS);
      for (const [k, v] of Object.entries(req.query || {})) {
        url.searchParams.set(k, Array.isArray(v) ? v.join(",") : v ?? "");
      }
      fetchRes = await fetch(url.toString(), { method: "GET" });
    } else if (req.method === "POST") {
      // 轉成 x-www-form-urlencoded 再送給 GAS
      let bodyStr = "";
      const ct = req.headers["content-type"] || "";
      if (ct.includes("application/x-www-form-urlencoded")) {
        // req.body 可能已是字串或物件
        bodyStr = typeof req.body === "string" ? req.body : new URLSearchParams(req.body).toString();
      } else if (ct.includes("application/json")) {
        bodyStr = new URLSearchParams(req.body || {}).toString();
      } else {
        bodyStr = typeof req.body === "string" ? req.body : "";
      }
      fetchRes = await fetch(GAS, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: bodyStr,
      });
    } else {
      res.setHeader("Allow", "GET,POST,OPTIONS");
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    const text = await fetchRes.text();

    // Apps Script 回來本來就是 JSON 字串，我們直接透傳
    // 若 GAS 出錯回 HTML，我們也照狀態碼透傳，前端可看訊息
    res.status(fetchRes.status).send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "proxy error" });
  }
}
