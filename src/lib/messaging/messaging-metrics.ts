import type { Message } from "@/types/communications";
import type { ThreadMeta, MessagingAnalytics } from "@/types/messaging";

/**
 * Messaging analytics derived from the real message store (communications-hub
 * `messages`) + thread metadata (`threadMeta`): channel mix, hourly volume,
 * response time, email open rate, and thread status/tags/staff. Conversion and
 * revenue are left at 0 — messages carry no booking or dollar linkage in the
 * seed, so there's no honest source for them (they stay 0 rather than fabricated).
 */

const CHANNEL: Record<string, string> = {
  sms: "SMS",
  email: "Email",
  "in-app": "Chat",
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const ms = (iso: string) => new Date(iso).getTime();

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/** Minutes between each inbound message and the next outbound reply in a conversation. */
function responsePairsMinutes(msgs: Message[]): number[] {
  const sorted = [...msgs].sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
  const out: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].direction !== "inbound") continue;
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].direction === "outbound") {
        out.push((ms(sorted[j].timestamp) - ms(sorted[i].timestamp)) / 60000);
        break;
      }
    }
  }
  return out;
}

export function buildMessagingAnalytics(
  messages: Message[],
  threads: ThreadMeta[],
): MessagingAnalytics {
  const outbound = messages.filter((m) => m.direction === "outbound");
  const totalSent = outbound.length;
  const smsSent = outbound.filter((m) => m.type === "sms").length;
  const emailSent = outbound.filter((m) => m.type === "email").length;
  const chatMessages = messages.filter((m) => m.type === "in-app").length;

  // Email open rate — outbound emails read.
  const outEmails = outbound.filter((m) => m.type === "email");
  const opened = outEmails.filter(
    (m) => m.status === "read" || m.hasRead,
  ).length;
  const emailOpenRate =
    outEmails.length > 0 ? round1((opened / outEmails.length) * 100) : 0;

  // Hourly volume (all messages, by local hour).
  const hourlyVolume = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    messages: 0,
  }));
  for (const m of messages) {
    const h = new Date(m.timestamp).getHours();
    if (h >= 0 && h < 24) hourlyVolume[h].messages += 1;
  }

  // Channel mix (all messages).
  const chCounts = new Map<string, number>();
  for (const m of messages) {
    const c = CHANNEL[m.type] ?? "Chat";
    chCounts.set(c, (chCounts.get(c) ?? 0) + 1);
  }
  const totalMsgs = messages.length;
  const channelBreakdown = [...chCounts.entries()]
    .map(([channel, count]) => ({
      channel,
      count,
      pct: totalMsgs > 0 ? round1((count / totalMsgs) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Group messages into conversations (thread, else client) for response/miss math.
  const byConv = new Map<string, Message[]>();
  const byThread = new Map<string, Message[]>();
  for (const m of messages) {
    push(byConv, String(m.threadId ?? m.clientId ?? m.id), m);
    if (m.threadId) push(byThread, m.threadId, m);
  }

  const allPairs: number[] = [];
  let missedChats = 0;
  for (const conv of byConv.values()) {
    allPairs.push(...responsePairsMinutes(conv));
    const chat = conv
      .filter((m) => m.type === "in-app")
      .sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
    if (chat.length > 0 && chat[chat.length - 1].direction === "inbound")
      missedChats += 1;
  }
  const avgResponseTimeMin =
    allPairs.length > 0
      ? round1(allPairs.reduce((s, v) => s + v, 0) / allPairs.length)
      : 0;

  // Resolution time — resolved threads: first message → status change.
  const resHours: number[] = [];
  for (const t of threads) {
    if (t.status !== "resolved" || !t.lastStatusChange) continue;
    const tm = byThread.get(t.threadId);
    if (!tm || tm.length === 0) continue;
    const first = Math.min(...tm.map((m) => ms(m.timestamp)));
    const end = ms(t.lastStatusChange);
    if (end > first) resHours.push((end - first) / 3_600_000);
  }
  const avgResolutionTimeHours =
    resHours.length > 0
      ? round1(resHours.reduce((s, v) => s + v, 0) / resHours.length)
      : 0;

  // Thread status + tags.
  const stCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  for (const t of threads) {
    stCounts.set(t.status, (stCounts.get(t.status) ?? 0) + 1);
    for (const tag of t.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const statusBreakdown = [...stCounts.entries()].map(([status, count]) => ({
    status,
    count,
  }));
  const topThreadTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // Staff performance — threads by assignee, with response time from those threads.
  const staffMap = new Map<
    string,
    { replied: number; resolved: number; respMins: number[] }
  >();
  for (const t of threads) {
    if (!t.assignedTo) continue;
    const s = staffMap.get(t.assignedTo) ?? {
      replied: 0,
      resolved: 0,
      respMins: [],
    };
    s.replied += 1;
    if (t.status === "resolved") s.resolved += 1;
    const tm = byThread.get(t.threadId);
    if (tm) s.respMins.push(...responsePairsMinutes(tm));
    staffMap.set(t.assignedTo, s);
  }
  const staffPerformance = [...staffMap.entries()]
    .map(([name, s]) => ({
      name,
      replied: s.replied,
      resolved: s.resolved,
      avgResponseMin:
        s.respMins.length > 0
          ? round1(s.respMins.reduce((a, v) => a + v, 0) / s.respMins.length)
          : 0,
    }))
    .sort((a, b) => b.replied - a.replied);

  return {
    period: "Last 30 days",
    totalSent,
    smsSent,
    emailSent,
    chatMessages,
    emailOpenRate,
    avgResponseTimeMin,
    avgResolutionTimeHours,
    conversionRate: 0,
    revenueInfluenced: 0,
    missedChats,
    hourlyVolume,
    channelBreakdown,
    topThreadTags,
    statusBreakdown,
    staffPerformance,
  };
}
