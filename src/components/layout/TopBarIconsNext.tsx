"use client";

import { useRouter } from "next/navigation";
import { TopBarIcons, type TopBarIconsProps } from "@/components/layout/TopBarIcons";

export function TopBarIconsNext(props: Omit<TopBarIconsProps, "navigate">) {
  const router = useRouter();
  return <TopBarIcons {...props} navigate={(to) => router.push(to)} />;
}

