import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileSearch } from "lucide-react";

export default function StudentNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-2xl">
        <FileSearch className="text-muted-foreground size-6" />
      </div>
      <div>
        <h2 className="text-xl font-bold tracking-tight">Student not found</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          That pet doesn&apos;t have any training records, or the ID is
          invalid.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/facility/dashboard/services/training/students">
          <ArrowLeft className="mr-2 size-4" />
          Back to students
        </Link>
      </Button>
    </div>
  );
}
