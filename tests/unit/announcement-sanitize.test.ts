import { describe, expect, test } from "bun:test";

import {
  announcementPlainText,
  sanitizeAnnouncementHtml as clean,
} from "@/lib/announcements/sanitize-html";

// The body of a platform announcement is rendered as HTML in every facility's
// portal and on the public status page. Each case is a known way past a
// hand-written filter.

describe("sanitizeAnnouncementHtml", () => {
  test("keeps the formatting the composer writes", () => {
    expect(
      clean(
        "<p>Hello <strong>you</strong> <em>there</em></p><ul><li>a</li></ul>",
      ),
    ).toBe(
      "<p>Hello <strong>you</strong> <em>there</em></p><ul><li>a</li></ul>",
    );
  });

  test("drops a script and everything in it", () => {
    expect(clean("<p>a</p><script>alert(1)</script><p>b</p>")).toBe(
      "<p>a</p><p>b</p>",
    );
    expect(clean("<SCRIPT >alert(1)</script >x")).toBe("x");
  });

  test("drops every attribute it did not write", () => {
    expect(clean('<p style="color:red" onclick="alert(1)">x</p>')).toBe(
      "<p>x</p>",
    );
    expect(clean('<div onmouseover="alert(1)">x</div>')).toBe("<div>x</div>");
  });

  test("drops tags outside the list, including media", () => {
    expect(clean('<img src=x onerror="alert(1)">')).toBe("");
    expect(clean('<svg onload="alert(1)"><circle/></svg>ok')).toBe("ok");
    expect(clean('<video src="blob:x"></video>')).toBe("");
  });

  test("a link keeps only a safe href", () => {
    expect(clean('<a href="https://yipyy.com/x">y</a>')).toBe(
      '<a href="https://yipyy.com/x" target="_blank" rel="noopener noreferrer">y</a>',
    );
    expect(clean('<a href="javascript:alert(1)">y</a>')).toBe("<a>y</a>");
    expect(clean('<a href="jav&#x61;script:alert(1)">y</a>')).toBe("<a>y</a>");
    expect(clean('<a href="java\tscript:alert(1)">y</a>')).toBe("<a>y</a>");
    expect(clean('<a href="//evil.example">y</a>')).toBe("<a>y</a>");
    expect(clean('<a href="data:text/html,x">y</a>')).toBe("<a>y</a>");
    expect(clean('<a href="/facility/settings">y</a>')).toBe(
      '<a href="/facility/settings" target="_blank" rel="noopener noreferrer">y</a>',
    );
  });

  test("an attribute value cannot break out of its quotes", () => {
    expect(clean('<a href="https://x.example/?a=&quot;><script>">y</a>')).toBe(
      '<a href="https://x.example/?a=&quot;&gt;&lt;script&gt;" target="_blank" rel="noopener noreferrer">y</a>',
    );
  });

  test("an iframe survives only as an exact YouTube or Vimeo embed", () => {
    expect(
      clean(
        '<div style="x"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" onload="alert(1)"></iframe></div>',
      ),
    ).toBe(
      '<div><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Embedded video" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>',
    );
    expect(clean('<iframe src="https://evil.example/embed/x"></iframe>')).toBe(
      "",
    );
    expect(
      clean(
        '<iframe src="https://www.youtube.com/embed/abcdef?x=javascript:"></iframe>',
      ),
    ).toBe("");
    expect(clean('<iframe srcdoc="<script>alert(1)</script>"></iframe>')).toBe(
      "",
    );
  });

  test("text cannot become markup", () => {
    expect(clean("1 < 2 & 3 > 2")).toBe("1 &lt; 2 &amp; 3 &gt; 2");
    expect(clean("caf&eacute; &amp; co")).toBe("caf&eacute; &amp; co");
    expect(clean("<!-- <script>alert(1)</script> -->x")).toBe("x");
    expect(clean("a <p unterminated")).toBe("a ");
  });

  test("unbalanced tags are closed, stray closers are ignored", () => {
    expect(clean("<p><strong>x")).toBe("<p><strong>x</strong></p>");
    expect(clean("</p>x</div>")).toBe("x");
  });
});

describe("announcementPlainText", () => {
  test("is the words, never markup", () => {
    expect(
      announcementPlainText(
        "<p>Maintenance on <strong>Saturday</strong></p><script>x</script>",
      ),
    ).toBe("Maintenance on Saturday");
    expect(announcementPlainText("<p>Fish &amp; chips</p>")).toBe(
      "Fish & chips",
    );
  });
});
