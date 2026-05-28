// YouTube → Direct MP4 URL resolver. Berjalan di Vercel (IP bersih) jadi lolos blokir YouTube.
// Clip-studio lokal panggil endpoint ini → dapat URL googlevideo.com → download langsung.
//
// POST /api/yt-resolve
//   body: { "url": "https://www.youtube.com/watch?v=..." }
//   resp: { "url": "https://...googlevideo.com/...", "title": "...", "thumbnail": "...", "duration": 123 }
//   error: { "error": "..." }  with HTTP 4xx/5xx

import type { VercelRequest, VercelResponse } from "@vercel/node";
import ytdl from "@distube/ytdl-core";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — biar clip-studio dari localhost bisa panggil
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const url: string = (body.url || "").toString().trim();
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: "URL YouTube tidak valid" });
    }
    // ambil metadata + format. quality "18" = 360p mp4 dengan audio (combined).
    const info = await ytdl.getInfo(url);
    let format = ytdl.chooseFormat(info.formats, { quality: "18", filter: "audioandvideo" });
    if (!format) format = ytdl.chooseFormat(info.formats, { quality: "highest", filter: "audioandvideo" });
    if (!format || !format.url) {
      return res.status(502).json({ error: "Tidak ada format MP4 audio+video tersedia" });
    }
    return res.status(200).json({
      url: format.url,
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails?.[0]?.url || "",
      duration: Number(info.videoDetails.lengthSeconds || 0),
      format: format.container || "mp4",
      quality: format.qualityLabel || "",
    });
  } catch (e: unknown) {
    const msg = (e as Error)?.message || String(e);
    return res.status(502).json({ error: "ytdl gagal: " + msg.slice(0, 240) });
  }
}
