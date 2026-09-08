"use client";

import { useState, useEffect, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Edit } from "lucide-react";
import { useUiText } from "@/hooks/use-ui-text";

export function SettingsBlock<T>({
  title,
  description,
  data,
  onSave,
  children,
}: {
  title: string;
  description?: string;
  data: T;
  /**
   * May be async. If it returns a promise, the editor stays open and the save
   * button holds its loading state until it settles, and a rejection keeps the
   * editor open with the message rather than closing over a save that did not
   * happen.
   *
   * Existing synchronous callers are unaffected — awaiting `undefined` resolves
   * immediately and the behaviour is exactly what it was.
   */
  onSave: (data: T) => void | Promise<unknown>;
  children: (
    isEditing: boolean,
    localData: T,
    setLocalData: (d: T) => void,
  ) => ReactNode;
}) {
  const { t } = useUiText();
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState(data);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  if (!mounted) {
    return null;
  }

  // ── WHY THIS AWAITS ──────────────────────────────────────────────────────
  //
  // It used to call onSave and close the editor in the same breath. Every
  // section wrote to a fixture, so nothing could fail and the difference never
  // showed. Now that a section can write to the DATABASE, a refusal — a
  // receptionist without `settings_general`, RLS declining the row — would
  // close the editor and redisplay the OLD values as though they had just been
  // saved. The user's edit is gone and they were told it worked.
  const handleSave = async () => {
    setProblem(null);
    setSaving(true);
    try {
      await onSave(localData);
      setIsEditing(false);
    } catch (error) {
      // `check:ui-french` cannot see this one: it reads JSX text, and a string
      // handed to a setter is not that. It is still the sentence a French user
      // reads when RLS declines their row.
      setProblem(
        error instanceof Error ? error.message : t("Could not save changes."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalData(data);
    setProblem(null);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-muted-foreground mt-1 text-sm">
                {description}
              </p>
            )}
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              {/* ── THE LOADING CELL BELONGS TO Button (§5s) ──────────────
                  This hand-rolled it three ways, and each one is a cell of the
                  §5s matrix answered wrongly:

                  1. It swapped the label to "Saving…", which the matrix names
                     under Never — "it shifts layout and throws away the verb".
                  2. `disabled={saving}` made it RENDER disabled while loading.
                     Those are different cells: Button scopes its disabled fill
                     and ink to `:not([data-loading])` for exactly this reason,
                     so a loading button is unclickable without looking dead.
                  3. `t("Saving…")` is not in `ui-translations.ts` — `Save` is,
                     as `Enregistrer`, and `translateUiText` returns its input
                     unchanged on a miss. So a French user pressed Enregistrer
                     and watched it become the English word "Saving…".

                  Passing `loading` fixes all three and deletes the third
                  outright: the label never changes, so there is no second
                  string to translate. */}
              <Button onClick={handleSave} loading={saving}>
                <Save className="mr-2 size-4" />
                {t("Save")}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                {t("Cancel")}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 size-4" />
              {t("Edit")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {problem && (
          <p
            role="alert"
            className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300"
          >
            {problem}
          </p>
        )}
        {children(isEditing, localData, setLocalData)}
      </CardContent>
    </Card>
  );
}
