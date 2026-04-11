"use client";

import { useEffect } from "react";
import { useAppLocale } from "@/hooks/use-app-locale";
import { translateUiText } from "@/lib/ui-translations";

const IGNORED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION",
]);

function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;

  if (IGNORED_TAGS.has(parent.tagName)) return true;
  if (parent.closest("[data-no-auto-translate='true']")) return true;

  const value = node.nodeValue ?? "";
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.includes("@")) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;

  return false;
}

function translateTextNode(node: Text, locale: "en" | "fr") {
  if (shouldSkipTextNode(node)) return;

  const current = node.nodeValue ?? "";
  const translated = translateUiText(current, locale);
  if (translated !== current) {
    node.nodeValue = translated;
  }
}

function translateTextTree(root: Node, locale: "en" | "fr") {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    translateTextNode(current as Text, locale);
    current = walker.nextNode();
  }
}

function translateAttributes(root: Element, locale: "en" | "fr") {
  const targets = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const element of targets) {
    for (const attr of ["placeholder", "title", "aria-label"]) {
      const raw = element.getAttribute(attr);
      if (!raw) continue;
      const translated = translateUiText(raw, locale);
      if (translated !== raw) {
        element.setAttribute(attr, translated);
      }
    }
  }
}

export function RuntimeUiTranslator() {
  const locale = useAppLocale();

  useEffect(() => {
    if (locale !== "fr") return;

    let observer: MutationObserver | null = null;
    let timeoutId: number | null = null;
    let frameIdOne: number | null = null;
    let frameIdTwo: number | null = null;
    let cancelled = false;

    const applyTranslations = (root: Node) => {
      translateTextTree(root, locale);
      if (root instanceof Element) {
        translateAttributes(root, locale);
      } else if (document.body) {
        translateAttributes(document.body, locale);
      }
    };

    const startObserver = () => {
      if (cancelled || !document.body) return;

      applyTranslations(document.body);

      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "characterData") {
            translateTextNode(mutation.target as Text, locale);
            continue;
          }

          if (
            mutation.type === "attributes" &&
            mutation.target instanceof Element
          ) {
            const target = mutation.target;
            const attr = mutation.attributeName;
            if (!attr) continue;
            const value = target.getAttribute(attr);
            if (!value) continue;
            const translated = translateUiText(value, locale);
            if (translated !== value) {
              target.setAttribute(attr, translated);
            }
            continue;
          }

          if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
              applyTranslations(node);
            }
          }
        }
      });

      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["placeholder", "title", "aria-label"],
      });
    };

    const startWhenSafe = () => {
      // Run after load plus two animation frames to avoid mutating DOM before hydration settles.
      frameIdOne = window.requestAnimationFrame(() => {
        frameIdTwo = window.requestAnimationFrame(() => {
          startObserver();
        });
      });
    };

    const onLoad = () => {
      timeoutId = window.setTimeout(() => {
        startWhenSafe();
      }, 0);
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (frameIdOne !== null) window.cancelAnimationFrame(frameIdOne);
      if (frameIdTwo !== null) window.cancelAnimationFrame(frameIdTwo);
      window.removeEventListener("load", onLoad);
      observer?.disconnect();
    };
  }, [locale]);

  return null;
}
