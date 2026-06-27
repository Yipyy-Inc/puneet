import { Suspense } from "react";

import { KbArticleEditor } from "../_components/kb-article-editor";

export default function KbEditorPage() {
  return (
    <Suspense fallback={null}>
      <KbArticleEditor />
    </Suspense>
  );
}
