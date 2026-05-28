# Clip Studio — TikTok OAuth Relay

Vercel Edge Function kecil yang menerima callback OAuth TikTok dan **meneruskan auth code** ke instance [Clip Studio](https://github.com/) yang jalan di `localhost:8783`.

## Kenapa relay ini ada

TikTok **tidak menerima `localhost`** sebagai redirect URI di Login Kit, jadi OAuth dari aplikasi lokal langsung mentok. Relay ini memberi URL HTTPS publik yang sah, lalu **HTTP-redirect** browser ke localhost (browser pengguna sendiri yang punya akses ke localhost, bukan TikTok).

```
TikTok → https://<relay>.vercel.app/api/callback?code=XYZ
       → HTTP 302 → http://localhost:8783/oauth/tiktok/callback?code=XYZ
       → Clip Studio tukar code jadi access token (PKCE verifier ada di local)
```

Relay **tidak menyimpan** apa pun. Hanya pass-through.

## Endpoint

| Path | Fungsi |
|------|--------|
| `GET /api/callback` | Terima callback TikTok, redirect ke `localhost:8783/oauth/tiktok/callback` dengan parameter `code` + `state` |
| `POST /api/yt-resolve` | YouTube → direct MP4 URL. Body: `{"url":"..."}`. Resp: `{"url":"https://...googlevideo.com/...", "title":"...", "thumbnail":"...", "duration":123}`. Pakai IP Vercel yg bersih untuk lewat blokir YouTube ke IP server lokal. |

## Deploy ke Vercel

1. Push repo ini ke GitHub
2. Buka [vercel.com](https://vercel.com) → **Add New → Project** → **Import** repo
3. Framework Preset: **Other** (Vercel auto-detect Edge Function di `api/`)
4. Klik **Deploy** — selesai dalam ~30 detik
5. Catat URL deploy (mis. `https://clipstudio-relay.vercel.app`)

## Konfigurasi TikTok dev portal

Di [developers.tiktok.com](https://developers.tiktok.com/apps) → app kamu → Login Kit → Web:
- **Redirect URI**: `https://clipstudio-relay.vercel.app/api/callback`

## Konfigurasi Clip Studio

Di `main.ts`, ubah `TT_REDIRECT`:
```ts
const TT_REDIRECT = "https://clipstudio-relay.vercel.app/api/callback";
```

## Lisensi

MIT.
