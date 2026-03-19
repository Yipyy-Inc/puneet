"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CustomServiceWizard } from "@/components/custom-services/wizard/CustomServiceWizard";
import { useCustomServices } from "@/hooks/use-custom-services";

export default function EditCustomServicePage() {
  const { slug } = useParams<{ slug: string }>();
  const { getModuleBySlug } = useCustomServices();
  const module = getModuleBySlug(slug);

  if (!module) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold">Module not found</h2>
          <p className="text-sm text-muted-foreground">
            No custom service with slug &quot;{slug}&quot; exists.
          </p>
          <Link
            href="/facility/dashboard/services/custom"
            className="text-sm text-primary hover:underline"
          >
            Back to Custom Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto max-w-4xl flex items-center gap-2">
          <Link
            href={`/facility/dashboard/services/custom/${slug}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {module.name}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">Edit Module</span>
        </div>
      </div>

      <CustomServiceWizard initialData={module} />
    </div>
  );
}
