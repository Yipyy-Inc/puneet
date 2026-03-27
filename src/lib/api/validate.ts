import { z } from "zod";

export function validated<T>(schema: z.ZodType<T>, data: unknown): T {
  if (process.env.NODE_ENV === "development") return schema.parse(data);
  return data as T;
}
