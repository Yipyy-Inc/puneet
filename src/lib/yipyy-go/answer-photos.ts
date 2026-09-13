import type { YipyyGoAnswers } from "@/lib/api/mappers/yipyy-go";
import type { CustomQuestion } from "@/types/yipyygo";

// ============================================================================
// The photos a pre-arrival form’s answers point at, held to the photos the
// form actually has.
//
// An answer keeps a photo by its yipyy_go_photos id: the belongings photo, a
// medication’s label, the answer to a facility’s photo question. A photo can
// be deleted after an answer took its id, and a request can name any id at
// all. So the form drops an id it no longer has when it opens, and the submit
// route drops one before validating — a required photo is then a photo the
// facility can open.
// ============================================================================

export function withKnownPhotos(
  answers: YipyyGoAnswers,
  known: ReadonlySet<string>,
  questions: CustomQuestion[],
): YipyyGoAnswers {
  const has = (id: string | undefined): id is string =>
    id !== undefined && known.has(id);
  const photoQuestions = new Set(
    questions
      .filter((question) => question.type === "file_upload")
      .map((question) => question.id),
  );
  const { belongingsPhotoId, customAnswers, belongings, medications, ...rest } =
    answers;
  const kept = Object.entries(customAnswers ?? {}).filter(
    ([questionId, value]) =>
      !photoQuestions.has(questionId) ||
      (typeof value === "string" && known.has(value)),
  );

  return {
    ...rest,
    belongings: belongings.map(({ photoId, ...item }) =>
      has(photoId) ? { ...item, photoId } : item,
    ),
    medications: medications.map(({ photoId, ...item }) =>
      has(photoId) ? { ...item, photoId } : item,
    ),
    ...(has(belongingsPhotoId) ? { belongingsPhotoId } : {}),
    ...(kept.length > 0 ? { customAnswers: Object.fromEntries(kept) } : {}),
  };
}
