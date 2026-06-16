"use client";

import { useParams } from "next/navigation";
import { ReviewSurvey } from "./_components/review-survey";

export default function ReviewPage() {
  const params = useParams();
  const token = (params.token as string) ?? "";
  return <ReviewSurvey token={token} />;
}
