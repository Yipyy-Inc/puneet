import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DetailsModalProps {
  title: string;
  badges: React.ReactNode[];
  children: React.ReactNode;
  linkHref?: string;
  linkText?: string;
}

export function DetailsModal({
  title,
  badges,
  children,
  linkHref,
  linkText,
}: DetailsModalProps) {
  return (
    <div className="space-y-3 pb-2">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-lg font-bold">{title}</h3>
          <div className="flex items-center gap-2">{badges}</div>
        </div>
      </div>
      <Separator className="my-2" />
      {children}
      {linkHref && linkText && (
        <div className="mt-3 flex justify-end border-t pt-3">
          <Link href={linkHref}>
            <Button size="sm">{linkText}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
