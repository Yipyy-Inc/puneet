"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CustomServiceWizard } from "@/components/custom-services/wizard/CustomServiceWizard";
import { useCustomServices } from "@/hooks/use-custom-services";

export default function EditCustomServicePage() {
  const { slug } = useParams<{ slug: string }>();
  const { getModuleBySlug } = useCustomServices();
  const serviceModule = getModuleBySlug(slug);

  if (!serviceModule) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="space-y-2 text-center">
          <h2 className="text-lg font-semibold">Module not found</h2>
          <p className="text-muted-foreground text-sm">
            No custom service with slug &quot;{slug}&quot; exists.
          </p>
          <Link
            href="/facility/dashboard/services/custom"
            className="text-primary text-sm hover:underline"
          >
            Back to Custom Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="border-border bg-card border-b px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Link
            href={`/facility/dashboard/services/custom/${slug}`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            <ChevronLeft className="size-4" />
            {serviceModule.name}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">Edit Module</span>
        </div>
      </div>

      <CustomServiceWizard initialData={serviceModule} />
    </div>
  );
}
