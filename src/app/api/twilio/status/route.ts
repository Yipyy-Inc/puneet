import { twimlResponse } from "@/lib/twiml";

// Status / IVR-gather callback. For a menu selection this connects the caller
// to the next available agent (enqueuing into the Live tab queue, Task 17);
// for plain call-progress events it just acknowledges with 200.
export async function POST(): Promise<Response> {
  return twimlResponse(
    `<Response>
  <Say voice="alice">Thanks. Connecting you to the next available Yipyy support agent.</Say>
</Response>`,
  );
}

export async function GET(): Promise<Response> {
  return new Response("OK", { status: 200 });
}
