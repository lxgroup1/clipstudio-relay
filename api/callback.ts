// TikTok OAuth callback relay → meneruskan code ke Clip Studio yang jalan di localhost:8783.
// TikTok tidak mengizinkan localhost sebagai redirect URI, jadi relay ini jadi jembatan publik.
export const config = { runtime: "edge" };

const LOCAL_TARGET = "http://localhost:8783/oauth/tiktok/callback";

function page(body: string, status = 200): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Clip Studio — TikTok OAuth Relay</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:60px auto;padding:0 20px;background:#0a0d12;color:#e4e7eb;line-height:1.5}
  h1{color:#14c4d4;margin-bottom:8px}
  .card{background:#131820;border-radius:12px;padding:24px;margin:16px 0;border:1px solid #1f2937}
  .code{font-family:ui-monospace,monospace;background:#0a0d12;padding:12px;border-radius:8px;word-break:break-all;font-size:13px;color:#a5f3fc}
  a.btn{display:inline-block;background:#14c4d4;color:#0a0d12;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:12px}
  a.btn:hover{filter:brightness(1.1)}
  .err{color:#ff6b6b}
  .small{color:#8893a1;font-size:13px}
  code{background:#0a0d12;padding:2px 6px;border-radius:4px;font-size:13px}
</style>
</head>
<body>${body}</body>
</html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export default function handler(req: Request): Response {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  if (error) {
    return page(
      `<h1 class="err">❌ Login TikTok Gagal</h1>
      <div class="card">
        <p><b>Error:</b> ${escapeHtml(error)}</p>
        ${errorDesc ? `<p class="small">${escapeHtml(errorDesc)}</p>` : ""}
      </div>
      <p class="small">Tutup tab ini dan coba lagi dari Clip Studio.</p>`,
      400,
    );
  }

  if (!code) {
    return page(
      `<h1>Clip Studio — TikTok OAuth Relay</h1>
      <div class="card">
        <p>Halaman ini menerima callback OAuth TikTok dan meneruskan auth code ke instance Clip Studio lokal kamu di <code>localhost:8783</code>.</p>
        <p class="small">Kalau kamu sampai di sini tanpa parameter <code>code</code>, kemungkinan TikTok OAuth belum dimulai dari aplikasi. Buka Clip Studio dan klik "Hubungkan TikTok".</p>
      </div>`,
    );
  }

  // validasi format code TikTok (huruf, angka, dan beberapa karakter aman)
  if (!/^[A-Za-z0-9._*~-]+$/.test(code)) {
    return page(`<h1 class="err">Code tidak valid.</h1>`, 400);
  }

  const target = `${LOCAL_TARGET}?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ""}`;

  return page(
    `<h1>✅ TikTok Auth Berhasil</h1>
    <div class="card">
      <p>Mengarahkan kamu ke Clip Studio di komputer (1 detik)...</p>
      <p class="small">Pastikan Clip Studio sedang berjalan di <code>localhost:8783</code>.</p>
      <a class="btn" href="${target}">→ Buka Clip Studio sekarang</a>
    </div>
    <div class="card">
      <p class="small">Kalau auto-redirect tidak jalan, salin code ini lalu paste manual di Clip Studio:</p>
      <div class="code">${escapeHtml(code)}</div>
    </div>
    <script>setTimeout(function(){location.href=${JSON.stringify(target)};},1000);</script>`,
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
