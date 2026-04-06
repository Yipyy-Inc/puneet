"use client";

import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiGenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  size?: "sm" | "xs";
  label?: string;
  className?: string;
}

export function AiGenerateButton({
  onClick,
  isGenerating,
  size = "sm",
  label = "AI",
  className,
}: AiGenerateButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isGenerating}
      onClick={onClick}
      className={cn(
        "gap-1.5 text-xs",
        size === "xs" && "h-6 px-2 text-[10px]",
        className,
      )}
    >
      {isGenerating ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Sparkles className="size-3" />
      )}
      {isGenerating ? "Generating..." : label}
    </Button>
  );
}
