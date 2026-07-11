"use client";

import Image from "next/image";
import { Smartphone, Mail, Bell, ImageIcon } from "lucide-react";
import {
  type ReportCardNotificationData,
  reportCardSmsBody,
  reportCardPushTitle,
  reportCardPushBody,
  reportCardEmailSubject,
} from "@/lib/report-cards/report-notifications";

/** Email teaser (Table 63): 3 thumbnails + AI excerpt + "Read Full Report" CTA. */
export function ReportCardEmailTeaser({
  data,
}: {
  data: ReportCardNotificationData;
}) {
  const thumbs = data.photos.slice(0, 3);
  return (
    <div className="overflow-hidden rounded-xl border bg-white text-slate-800 shadow-sm">
      <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <Mail className="size-3.5" />
        <span className="truncate font-medium">
          {reportCardEmailSubject(data)}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm font-semibold">
          {data.facilityName} sent {data.petName}&apos;s {data.serviceType}{" "}
          report {data.moodEmoji}
        </p>

        {/* 3 thumbnail photos */}
        <div className="grid grid-cols-3 gap-2">
          {thumbs.length > 0
            ? thumbs.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
              ))
            : [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-lg bg-slate-100 text-slate-300"
                >
                  <ImageIcon className="size-5" />
                </div>
              ))}
        </div>

        {/* AI summary excerpt (teaser only) */}
        <p className="text-sm text-slate-600 italic">“{data.summaryExcerpt}”</p>

        <a
          href={data.portalUrl}
          className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          Read {data.petName}&apos;s Full Report →
        </a>
        <p className="text-[11px] text-slate-400">
          This is a preview — the full report opens securely in your portal.
        </p>
      </div>
    </div>
  );
}

/** SMS preview (Table 64). */
export function ReportCardSmsPreview({
  data,
}: {
  data: ReportCardNotificationData;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <Smartphone className="size-3.5" />
        SMS
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800">
        {reportCardSmsBody(data)}
      </div>
    </div>
  );
}

/** Push notification preview (Table 64): mood emoji + one-line + tap-to-open. */
export function ReportCardPushPreview({
  data,
}: {
  data: ReportCardNotificationData;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <Bell className="size-3.5" />
        Push
      </div>
      <a
        href={data.portalUrl}
        className="flex items-start gap-3 rounded-xl bg-slate-100 px-3 py-2.5"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm">
          {data.moodEmoji}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            {reportCardPushTitle(data)}
          </p>
          <p className="line-clamp-1 text-xs text-slate-600">
            {reportCardPushBody(data)}
          </p>
        </div>
      </a>
    </div>
  );
}

/** All three previews stacked — shown in the facility report-card viewer. */
export function ReportCardNotificationPreviews({
  data,
}: {
  data: ReportCardNotificationData;
}) {
  return (
    <div className="space-y-3">
      <ReportCardEmailTeaser data={data} />
      <ReportCardSmsPreview data={data} />
      <ReportCardPushPreview data={data} />
    </div>
  );
}
