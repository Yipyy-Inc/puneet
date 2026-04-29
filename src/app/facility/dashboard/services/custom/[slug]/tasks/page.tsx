"use client";

import { useParams } from "next/navigation";
import { useCustomServices } from "@/hooks/use-custom-services";
import { ModuleTasksPage } from "@/components/tasks/ModuleTasksPage";

export default function CustomServiceTasksPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug } = useCustomServices();
  const serviceModule = getModuleBySlug(slug ?? "");

  if (!serviceModule) return null;

  return (
    <ModuleTasksPage
      moduleId={serviceModule.slug}
      moduleName={serviceModule.name}
    />
  );
}
