// app/api/gas/route.ts
export const runtime = "nodejs"; // 或 "edge" 也行

const GAS = process.env.GAS_EXEC_URL!;

function passthroughHeaders(res: Response) {
  const headers = new Headers(res.headers);
  // 確保瀏覽器可讀
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return headers;
}

export async function OPTIONS() {
  // 回覆預檢（雖然我們前端已用 x-www-form-urlencoded 會避開，但保險）
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  // 把 ?xxx 全貼到 GAS
  const gasUrl = new URL(GAS);
  url.searchParams.forEach((v, k) => gasUrl.searchParams.set(k, v));

  const res = await fetch(gasUrl.toString(), { method: "GET" });
  const body = await res.text();
  return new Response(body, { status: res.status, headers: passthroughHeaders(res) });
}

export async function POST(req: Request) {
  // 我們前端用 application/x-www-form-urlencoded；這裡照轉
  const contentType = req.headers.get("content-type") || "";
  let body: BodyInit | null = null;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    body = await req.text();
  } else if (contentType.includes("application/json")) {
    const json = await req.json();
    body = new URLSearchParams(json as Record<string, string>).toString();
  } else {
    // 其他類型就原樣 pass（例如 text/plain）
    body = await req.text();
  }

  const res = await fetch(GAS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  return new Response(text, { status: res.status, headers: passthroughHeaders(res) });
}
