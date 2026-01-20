"use client";

import { useRouter } from "next/navigation";
import { GlobalSearch, type GlobalSearchProps } from "@/components/search/GlobalSearch";

export function GlobalSearchNext(props: Omit<GlobalSearchProps, "navigate">) {
  const router = useRouter();
  return <GlobalSearch {...props} navigate={(to) => router.push(to)} />;
}

