/**
 * SMS character counting and segment calculation.
 * GSM-7 vs UCS-2 encoding detection.
 */

// GSM 03.38 basic character set (single byte)
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "ÄÖÑÜabcdefghijklmnopqrstuvwxyz§äöñüà";

// GSM extended characters (2 bytes — count as 2)
const GSM_EXTENDED = "^{}\\[~]|€";

export type SmsEncoding = "GSM-7" | "UCS-2";

export interface SmsCountResult {
  characterCount: number;
  encoding: SmsEncoding;
  charsPerSegment: number;
  charsPerConcatSegment: number;
  segmentCount: number;
  remainingInSegment: number;
  maxSegments: number;
  isOverLimit: boolean;
}

function isGsmChar(char: string): boolean {
  return GSM_BASIC.includes(char) || GSM_EXTENDED.includes(char);
}

function isGsmExtended(char: string): boolean {
  return GSM_EXTENDED.includes(char);
}

export function detectEncoding(text: string): SmsEncoding {
  for (const char of text) {
    if (!isGsmChar(char)) return "UCS-2";
  }
  return "GSM-7";
}

export function countGsmChars(text: string): number {
  let count = 0;
  for (const char of text) {
    count += isGsmExtended(char) ? 2 : 1;
  }
  return count;
}

export function countSms(
  text: string,
  type: "regular" | "mass_text" = "regular",
): SmsCountResult {
  if (!text) {
    return {
      characterCount: 0,
      encoding: "GSM-7",
      charsPerSegment: 160,
      charsPerConcatSegment: 153,
      segmentCount: 0,
      remainingInSegment: 160,
      maxSegments: type === "mass_text" ? 4 : 6,
      isOverLimit: false,
    };
  }

  const encoding = detectEncoding(text);
  const characterCount =
    encoding === "GSM-7" ? countGsmChars(text) : text.length;

  const charsPerSegment = encoding === "GSM-7" ? 160 : 70;
  const charsPerConcatSegment = encoding === "GSM-7" ? 153 : 67;
  const maxSegments = type === "mass_text" ? 4 : 6;

  let segmentCount: number;
  let remainingInSegment: number;

  if (characterCount <= charsPerSegment) {
    segmentCount = characterCount === 0 ? 0 : 1;
    remainingInSegment = charsPerSegment - characterCount;
  } else {
    segmentCount = Math.ceil(characterCount / charsPerConcatSegment);
    remainingInSegment = segmentCount * charsPerConcatSegment - characterCount;
  }

  const maxChars = maxSegments * charsPerConcatSegment;
  const isOverLimit = characterCount > maxChars;

  return {
    characterCount,
    encoding,
    charsPerSegment,
    charsPerConcatSegment,
    segmentCount,
    remainingInSegment,
    maxSegments,
    isOverLimit,
  };
}
