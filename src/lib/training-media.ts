/**
 * Video URL helpers for homework media / resource links.
 *
 * Trainers paste YouTube / Vimeo links into the homework "Video / resource
 * links" field. The customer portal embeds them in an <iframe>, so a watch
 * URL, a typo, or a private/deleted video produces a broken embed. These
 * helpers parse a pasted URL into its provider + id + canonical embed URL, and
 * back the on-blur accessibility check (see /api/video-check).
 */

export type VideoProvider = "youtube" | "vimeo" | "other";

export interface ParsedVideoUrl {
  /** Recognised video host, or "other" for any non-video/unknown link. */
  provider: VideoProvider;
  /** Extracted video id, or null when the host matches but no valid id could
   *  be parsed (a malformed/incomplete video link). */
  id: string | null;
  /** Canonical embeddable URL the customer portal iframe should use. */
  embedUrl: string | null;
}

// YouTube ids are exactly 11 chars from [A-Za-z0-9_-]. Cover watch, youtu.be,
// already-embed, shorts, and live forms.
const YOUTUBE_PATTERNS: RegExp[] = [
  /youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{11})/i,
  /youtu\.be\/([\w-]{11})/i,
  /youtube\.com\/embed\/([\w-]{11})/i,
  /youtube\.com\/shorts\/([\w-]{11})/i,
  /youtube\.com\/live\/([\w-]{11})/i,
];

const VIMEO_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/i;

// Single-video YouTube forms (watch?v=, youtu.be, shorts, live) ALWAYS carry an
// exactly-11-char video id, so a token in that slot that isn't 11 valid chars
// is a definitively broken/typo'd link we can flag offline (no network needed)
// without false-positiving. `embed/` is intentionally excluded (embed/
// videoseries is a valid playlist embed), and channel / playlist / user URLs
// have no such slot — both defer to the network oEmbed check instead.
const YOUTUBE_VIDEO_ID_SLOT =
  /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/)|youtu\.be\/)([^&?#/\s]+)/i;

/** True when the URL points at a recognised video host (YouTube or Vimeo). */
export function isVideoUrl(url: string): boolean {
  return parseVideoUrl(url).provider !== "other";
}

/**
 * True only for a YouTube single-video URL whose id is unmistakably malformed
 * (the `watch?v=`/`youtu.be`/`shorts`/`live` slot is present but not a valid
 * 11-char id) — a typo'd / truncated link that can never resolve. Lets the
 * validator warn offline without a false positive: valid ids, `/live/`,
 * playlists, channels, and all Vimeo URLs return false and defer to the network
 * accessibility check instead.
 */
export function looksLikeBrokenVideoUrl(raw: string): boolean {
  const m = raw.trim().match(YOUTUBE_VIDEO_ID_SLOT);
  return m ? !/^[\w-]{11}$/.test(m[1]!) : false;
}

/**
 * Parse a pasted URL into provider + id + canonical embed URL. A YouTube/Vimeo
 * host with no extractable id returns `{ provider, id: null }` — i.e. the link
 * looks like a video link but is malformed, which the validator surfaces as a
 * warning.
 */
export function parseVideoUrl(raw: string): ParsedVideoUrl {
  const url = raw.trim();
  if (/youtube\.com|youtu\.be/i.test(url)) {
    for (const re of YOUTUBE_PATTERNS) {
      const m = url.match(re);
      if (m) {
        return {
          provider: "youtube",
          id: m[1]!,
          embedUrl: `https://www.youtube.com/embed/${m[1]}`,
        };
      }
    }
    return { provider: "youtube", id: null, embedUrl: null };
  }
  if (/vimeo\.com/i.test(url)) {
    const m = url.match(VIMEO_PATTERN);
    if (m) {
      return {
        provider: "vimeo",
        id: m[1]!,
        embedUrl: `https://player.vimeo.com/video/${m[1]}`,
      };
    }
    return { provider: "vimeo", id: null, embedUrl: null };
  }
  return { provider: "other", id: null, embedUrl: null };
}
