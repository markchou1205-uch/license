// api/gas.js
const GAS = process.env.GAS_EXEC_URL;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!GAS) return res.status(500).json({ ok:false, error:"GAS_EXEC_URL not configured" });

  try {
    let upstream;
    if (req.method === "GET") {
      const url = new URL(GAS);
      Object.entries(req.query || {}).forEach(([k, v]) => {
        url.searchParams.set(k, Array.isArray(v) ? v.join(",") : (v ?? ""));
      });
      upstream = await fetch(url.toString(), { method: "GET" });
    } else if (req.method === "POST") {
      const ct = req.headers["content-type"] || "";
      let body = "";
      if (ct.includes("application/x-www-form-urlencoded")) {
        body = typeof req.body === "string" ? req.body : new URLSearchParams(req.body).toString();
      } else if (ct.includes("application/json")) {
        body = new URLSearchParams(req.body || {}).toString();
      } else {
        body = typeof req.body === "string" ? req.body : "";
      }
      upstream = await fetch(GAS, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
    } else {
      res.setHeader("Allow", "GET,POST,OPTIONS");
      return res.status(405).json({ ok:false, error:"Method Not Allowed" });
    }

    const text = await upstream.text();
    const t = text.trim();
    const looksJson = t.startsWith("{") || t.startsWith("[");
    if (looksJson) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(upstream.status).send(text);
    } else {
      // 將 HTML/字串包成 JSON，前端永遠可 .json() 解析
      return res.status(upstream.status).json({
        ok: false,
        as: "html",
        status: upstream.status,
        body: text.slice(0, 4000)
      });
    }
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || "proxy error" });
  }
}
