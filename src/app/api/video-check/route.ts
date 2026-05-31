import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side video accessibility check for the homework "Video / resource
 * links" field. Proxies the provider's public oEmbed endpoint (server-side, so
 * there's no browser CORS issue — mirroring how the AI routes proxy external
 * calls) and maps the response to a coarse status:
 *
 *   ok          → publicly embeddable (public or unlisted)
 *   unavailable → private / deleted / embedding-disabled (oEmbed 401/403/404)
 *   unknown     → couldn't determine (network error, timeout, non-video URL) —
 *                 callers fail open and show NO warning so a flaky network
 *                 never produces a false "private video" alert.
 */
export type VideoCheckStatus = "ok" | "unavailable" | "unknown";

function oembedEndpoint(url: string): string | null {
  if (/youtube\.com|youtu\.be/i.test(url)) {
    return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  }
  if (/vimeo\.com/i.test(url)) {
    return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ status: "unknown" as VideoCheckStatus });
  }

  const endpoint = oembedEndpoint(url);
  if (!endpoint) {
    // Not a YouTube/Vimeo URL — we only verify embeddable video providers.
    return NextResponse.json({ status: "unknown" as VideoCheckStatus });
  }

  try {
    const res = await fetch(endpoint, {
      // Bounded so a slow provider can't hang the trainer's form.
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "Yipyy/1.0 (homework-video-check)" },
    });
    if (res.ok) {
      return NextResponse.json({ status: "ok" as VideoCheckStatus });
    }
    // oEmbed returns 401 (private), 403 (embedding disabled), 404 (deleted /
    // never existed) for links an owner won't be able to view.
    if ([401, 403, 404].includes(res.status)) {
      return NextResponse.json({ status: "unavailable" as VideoCheckStatus });
    }
    return NextResponse.json({ status: "unknown" as VideoCheckStatus });
  } catch {
    // Timeout / offline / DNS — inconclusive, never a false positive.
    return NextResponse.json({ status: "unknown" as VideoCheckStatus });
  }
}
