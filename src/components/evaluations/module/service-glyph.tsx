import { Bed, GraduationCap, PawPrint, Scissors, Sun } from "lucide-react";

// A service's glyph from the icon map (§5b1): daycare and boarding are
// objects there, grooming and training their nav areas; a facility's own
// service takes the pet record's paw.
const GLYPH = {
  daycare: Sun,
  boarding: Bed,
  grooming: Scissors,
  training: GraduationCap,
} as const;

export function ServiceGlyph({ service }: { service: string }) {
  const Icon = GLYPH[service as keyof typeof GLYPH] ?? PawPrint;
  return <Icon aria-hidden />;
}
