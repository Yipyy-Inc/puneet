import { afterEach, describe, expect, test } from "bun:test";

import { twilioProvider } from "../../src/lib/calling/provider/twilio";

// ============================================================================
// The adapter, against a stubbed carrier.
//
// URL, auth header, form encoding and error handling are the parts most likely
// to be wrong and the parts no e2e test can reach: `buyNumber` spends money at
// a real carrier, and `sendSms` texts a real handset. There were four
// hand-rolled copies of this request before the adapter and they did not agree
// — one carried no timeout at all.
// ============================================================================

const CREDS = { accountSid: "AC" + "0".repeat(32), authToken: "tok_secret" };

interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

let captured: Captured[] = [];
const realFetch = globalThis.fetch;

function stubFetch(status: number, body: string) {
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(
      (init?.headers ?? {}) as Record<string, string>,
    )) {
      headers[k.toLowerCase()] = v;
    }
    captured.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers,
      body: init?.body ? String(init.body) : "",
    });
    return new Response(body, { status });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  captured = [];
});

describe("every request is authenticated and bounded", () => {
  test("sendSms posts form-encoded to the account's Messages resource", async () => {
    stubFetch(201, JSON.stringify({ sid: "SM123" }));
    const result = await twilioProvider.sendSms(CREDS, {
      to: "+15145550100",
      from: "+15145550199",
      body: "hello",
    });

    expect(result.ok).toBe(true);
    expect(result.providerId).toBe("SM123");

    const [call] = captured;
    expect(call.url).toBe(
      `https://api.twilio.com/2010-04-01/Accounts/${CREDS.accountSid}/Messages.json`,
    );
    expect(call.method).toBe("POST");
    // Basic auth over sid:token — the credential never appears in the URL,
    // where it would be logged by every proxy in between.
    expect(call.headers.authorization).toBe(
      `Basic ${Buffer.from(`${CREDS.accountSid}:${CREDS.authToken}`).toString("base64")}`,
    );
    expect(call.url).not.toContain(CREDS.authToken);
    expect(call.headers["content-type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(call.body).toContain("To=%2B15145550100");
    expect(call.body).toContain("Body=hello");
  });

  test("a carrier refusal becomes a sentence, and carries the code", async () => {
    stubFetch(400, JSON.stringify({ code: 21610, message: "unsubscribed" }));
    const result = await twilioProvider.sendSms(CREDS, {
      to: "+15145550100",
      from: "+15145550199",
      body: "hello",
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(21610);
    // The STOP wording, not "SMS service said 400".
    expect(result.detail).toContain("STOP");
    expect(result.detail).not.toContain("400");
  });

  test("an HTML error page does not crash the parser", async () => {
    stubFetch(502, "<html>502 Bad Gateway</html>");
    const result = await twilioProvider.sendSms(CREDS, {
      to: "+15145550100",
      from: "+15145550199",
      body: "hello",
    });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBeNull();
    expect(result.detail).toBeTruthy();
  });

  test("a network failure is reported as one, not as a carrier verdict", async () => {
    globalThis.fetch = (async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    }) as unknown as typeof fetch;
    const result = await twilioProvider.sendSms(CREDS, {
      to: "+15145550100",
      from: "+15145550199",
      body: "hello",
    });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBeNull();
    expect(result.detail).toContain("Could not reach");
  });
});

describe("searchNumbers", () => {
  test("asks the right country, passes the area code, and caps the page", async () => {
    stubFetch(
      200,
      JSON.stringify({
        available_phone_numbers: [
          {
            phone_number: "+15145550100",
            locality: "Montreal",
            region: "QC",
            capabilities: { SMS: true, MMS: false, voice: true },
          },
        ],
      }),
    );

    const found = await twilioProvider.searchNumbers(CREDS, {
      country: "CA",
      areaCode: "514",
      limit: 500,
    });

    expect(found).toHaveLength(1);
    expect(found[0]).toEqual({
      phoneNumber: "+15145550100",
      locality: "Montreal",
      region: "QC",
      sms: true,
      mms: false,
      voice: true,
    });

    const [call] = captured;
    expect(call.url).toContain("/AvailablePhoneNumbers/CA/Local.json");
    expect(call.url).toContain("AreaCode=514");
    // A caller asking for 500 gets the carrier's maximum, not a rejected
    // request — the cap belongs here rather than at every call site.
    expect(call.url).toContain("PageSize=50");
  });

  test("a refusal is an empty list, not an exception", async () => {
    // Searching is a browse. A facility picking a number should see "none
    // available" rather than a stack trace.
    stubFetch(400, JSON.stringify({ code: 20404 }));
    const found = await twilioProvider.searchNumbers(CREDS, { country: "CA" });
    expect(found).toEqual([]);
  });
});

describe("the two that change the account", () => {
  test("createSubaccount refuses a 200 that carries no credentials", async () => {
    // Storing half a subaccount leaves a facility connected to nothing, and the
    // failure would not surface until somebody tried to place a call.
    stubFetch(201, JSON.stringify({ sid: "AC" + "1".repeat(32) }));
    await expect(
      twilioProvider.createSubaccount(CREDS, "Happy Paws"),
    ).rejects.toThrow(/without returning its credentials/);
  });

  test("createSubaccount returns both halves when the carrier sends them", async () => {
    stubFetch(
      201,
      JSON.stringify({
        sid: "AC" + "1".repeat(32),
        auth_token: "sub_token",
        friendly_name: "Happy Paws",
      }),
    );
    const account = await twilioProvider.createSubaccount(CREDS, "Happy Paws");
    expect(account.accountSid).toBe("AC" + "1".repeat(32));
    expect(account.authToken).toBe("sub_token");
  });

  test("buyNumber says money may have been spent when the id is missing", async () => {
    // The difference between "nothing happened" and "something happened and we
    // cannot see it" decides whether anybody checks the carrier's console.
    stubFetch(201, JSON.stringify({ phone_number: "+15145550100" }));
    await expect(
      twilioProvider.buyNumber(CREDS, { phoneNumber: "+15145550100" }),
    ).rejects.toThrow(/Check the account before retrying/);
  });

  test("buyNumber returns the number and its capabilities", async () => {
    stubFetch(
      201,
      JSON.stringify({
        sid: "PN" + "2".repeat(32),
        phone_number: "+15145550100",
        capabilities: { SMS: true, MMS: true, voice: true },
      }),
    );
    const bought = await twilioProvider.buyNumber(CREDS, {
      phoneNumber: "+15145550100",
      friendlyName: "Happy Paws main",
    });
    expect(bought.numberSid).toBe("PN" + "2".repeat(32));
    expect(bought.sms).toBe(true);
    expect(captured[0].body).toContain("FriendlyName=Happy+Paws+main");
  });

  test("releaseNumber DELETEs the number resource", async () => {
    stubFetch(204, "");
    await twilioProvider.releaseNumber(CREDS, "PN" + "2".repeat(32));
    expect(captured[0].method).toBe("DELETE");
    expect(captured[0].url).toContain(
      `/IncomingPhoneNumbers/PN${"2".repeat(32)}.json`,
    );
  });
});

describe("verifyCredentials", () => {
  test("passes the carrier's own words through, for the one screen that needs them", async () => {
    stubFetch(
      401,
      JSON.stringify({ code: 20003, message: "Authenticate: bad token" }),
    );
    const result = await twilioProvider.verifyCredentials(CREDS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // A platform admin has to tell a bad token from a suspended account; our
      // own map collapses both into one sentence on purpose.
      expect(result.error).toBe("Authenticate: bad token");
    }
  });

  test("reports the account status, because a suspended account authenticates fine", async () => {
    stubFetch(
      200,
      JSON.stringify({ friendly_name: "Yipyy", status: "suspended" }),
    );
    const result = await twilioProvider.verifyCredentials(CREDS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("suspended");
    }
  });
});
