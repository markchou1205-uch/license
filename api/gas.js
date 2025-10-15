// api/gas.js
const GAS = process.env.GAS_EXEC_URL;

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!GAS) return res.status(500).json({ ok:false, error:"GAS_EXEC_URL not configured" });

  try {
    let upstream;

    if (req.method === "GET") {
      const url = new URL(GAS);
      Object.entries(req.query || {}).forEach(([k,v])=>{
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
      res.setHeader("Allow","GET,POST,OPTIONS");
      return res.status(405).json({ ok:false, error:"Method Not Allowed" });
    }

    const text = await upstream.text();
    const trimmed = text.trim();
    const isJson = trimmed.startsWith("{") || trimmed.startsWith("[");

    res.status(upstream.status);
    res.setHeader("Content-Type", isJson ? "application/json; charset=utf-8"
                                         : "text/html; charset=utf-8");
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || "proxy error" });
  }
}
