import type {
  WaiverCategory,
  WaiverServiceTag,
} from "@/data/additional-features";

const SERVICE_LABEL: Record<WaiverServiceTag, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  vet: "Vet",
  retail: "Retail",
  general: "General",
};

export const UNCATEGORIZED_ID = "__uncategorized";

export function serviceCategoryId(tag: WaiverServiceTag): string {
  return `svc-${tag}`;
}

/** Build the merged list of categories: one per facility service (in order),
 *  followed by custom categories. The "general" service is always included so
 *  cross-service waivers have a home. */
export function resolveCategories(
  facilityServices: WaiverServiceTag[],
  customCategories: WaiverCategory[],
): WaiverCategory[] {
  const tags: WaiverServiceTag[] = Array.from(
    new Set<WaiverServiceTag>([...facilityServices, "general"]),
  );
  const serviceCategories: WaiverCategory[] = tags.map((tag) => ({
    id: serviceCategoryId(tag),
    name: `${SERVICE_LABEL[tag]} Waivers`,
    kind: "service",
    serviceTag: tag,
    createdAt: "1970-01-01T00:00:00Z",
  }));
  return [...serviceCategories, ...customCategories];
}

interface Bucketable {
  categoryId?: string;
  type: WaiverServiceTag;
  services?: WaiverServiceTag[];
}

/** Group items into category buckets. An item with an explicit `categoryId`
 *  goes there; otherwise it falls into the first matching service category;
 *  otherwise into "Uncategorized". */
export function bucketByCategory<T extends Bucketable>(
  items: T[],
  categories: WaiverCategory[],
): { categoryId: string; categoryName: string; items: T[] }[] {
  const byId = new Map<string, T[]>();
  for (const cat of categories) byId.set(cat.id, []);
  byId.set(UNCATEGORIZED_ID, []);

  const serviceCategoryByTag = new Map<WaiverServiceTag, string>();
  for (const cat of categories) {
    if (cat.kind === "service" && cat.serviceTag) {
      serviceCategoryByTag.set(cat.serviceTag, cat.id);
    }
  }

  for (const item of items) {
    let target: string | undefined;
    if (item.categoryId && byId.has(item.categoryId)) {
      target = item.categoryId;
    } else {
      const tags = item.services && item.services.length > 0
        ? item.services
        : [item.type];
      for (const tag of tags) {
        const id = serviceCategoryByTag.get(tag);
        if (id) {
          target = id;
          break;
        }
      }
    }
    byId.get(target ?? UNCATEGORIZED_ID)!.push(item);
  }

  const ordered: { categoryId: string; categoryName: string; items: T[] }[] = [];
  for (const cat of categories) {
    ordered.push({
      categoryId: cat.id,
      categoryName: cat.name,
      items: byId.get(cat.id) ?? [],
    });
  }
  const uncat = byId.get(UNCATEGORIZED_ID) ?? [];
  if (uncat.length > 0) {
    ordered.push({
      categoryId: UNCATEGORIZED_ID,
      categoryName: "Uncategorized",
      items: uncat,
    });
  }
  return ordered;
}
