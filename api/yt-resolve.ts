// YouTube → Direct MP4 URL resolver. Berjalan di Vercel (IP bersih) jadi lolos blokir YouTube.
// POST /api/yt-resolve  body:{url}  → {url, title, thumbnail, duration, format, quality}

import type { VercelRequest, VercelResponse } from "@vercel/node";
// pakai require untuk CommonJS interop yang stabil di Vercel
// deno-lint-ignore no-explicit-any
const ytdl: any = require("@distube/ytdl-core");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  let url = "";
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    url = (body.url || "").toString().trim();
    if (!url) return res.status(400).json({ error: "URL kosong" });
    if (!ytdl.validateURL(url)) return res.status(400).json({ error: "URL YouTube tidak valid: " + url });
  } catch (e) {
    return res.status(400).json({ error: "Body JSON gagal di-parse: " + ((e as Error)?.message || String(e)) });
  }

  try {
    const info = await ytdl.getInfo(url);
    // deno-lint-ignore no-explicit-any
    let format: any = null;
    try { format = ytdl.chooseFormat(info.formats, { quality: "18", filter: "audioandvideo" }); } catch (_e) {}
    if (!format) try { format = ytdl.chooseFormat(info.formats, { quality: "highest", filter: "audioandvideo" }); } catch (_e) {}
    if (!format) {
      // fallback: cari manual format mp4 dengan audio+video
      // deno-lint-ignore no-explicit-any
      format = (info.formats as any[]).find((f) => f.container === "mp4" && f.hasAudio && f.hasVideo);
    }
    if (!format || !format.url) {
      return res.status(502).json({ error: "Tidak ada format MP4 audio+video", formats_count: info.formats?.length || 0 });
    }
    return res.status(200).json({
      url: format.url,
      title: info.videoDetails?.title || "",
      thumbnail: info.videoDetails?.thumbnails?.[0]?.url || "",
      duration: Number(info.videoDetails?.lengthSeconds || 0),
      format: format.container || "mp4",
      quality: format.qualityLabel || "",
    });
  } catch (e) {
    const err = e as Error;
    const msg = err?.message || String(e);
    return res.status(502).json({
      error: "ytdl gagal: " + msg.slice(0, 400),
      stack: err?.stack?.split("\n").slice(0, 3).join(" | ") || "",
    });
  }
}
