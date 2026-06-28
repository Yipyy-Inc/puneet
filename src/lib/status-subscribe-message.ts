// Pure builders for the status-subscription confirmation messages. No client or
// server-only imports, so both the API route and tests can use them.

const STATUS_URL = "https://status.yipyy.com";

export function buildStatusSubscribeEmail(): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "You're subscribed to Yipyy status updates";
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <h1 style="font-size:20px;margin:0 0 8px">Yipyy System Status</h1>
    <p style="font-size:14px;line-height:1.6;color:#334155">
      You're now subscribed to status updates. We'll email you when an incident is
      opened, updated, or resolved, and ahead of planned maintenance windows.
    </p>
    <p style="font-size:14px;line-height:1.6;color:#334155">
      You can view live status any time at
      <a href="${STATUS_URL}" style="color:#059669">${STATUS_URL}</a>.
    </p>
    <p style="font-size:12px;color:#94a3b8;margin-top:24px">
      You received this because someone subscribed this address on the Yipyy status page.
    </p>
  </div></body></html>`;
  const text = [
    "Yipyy System Status",
    "",
    "You're now subscribed to status updates. We'll notify you when an incident is opened, updated, or resolved, and ahead of planned maintenance windows.",
    "",
    `View live status any time at ${STATUS_URL}.`,
  ].join("\n");
  return { subject, html, text };
}

export function buildStatusSubscribeSms(): string {
  return "Yipyy: You're subscribed to status alerts. We'll text you about incidents & maintenance. Reply STOP to unsubscribe.";
}
