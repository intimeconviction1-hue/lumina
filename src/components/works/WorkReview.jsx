import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWorkMutations } from "@/hooks/useWorkMutations";

export default function WorkReview({ work }) {
  const { update } = useWorkMutations();
  const [draft, setDraft] = useState(null);
  const restoreFocus = useRef(false);
  const review = work.short_review?.trim() ?? "";

  const closeEditor = () => {
    restoreFocus.current = true;
    setDraft(null);
  };

  const saveReview = (event) => {
    event.preventDefault();
    if (update.isPending) return;
    const text = draft.trim();
    if (text === review) {
      closeEditor();
      return;
    }
    update.mutate(
      { id: work.id, patch: { short_review: text || null }, optimistic: false },
      { onSuccess: closeEditor }
    );
  };

  return (
    <section
      aria-labelledby="work-review-title"
      className="mt-5 rounded-xl border p-3 sm:p-4"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="work-review-title" className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Ma critique
        </h2>
        {draft === null && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            ref={(button) => {
              if (button && restoreFocus.current) {
                button.focus();
                restoreFocus.current = false;
              }
            }}
            onClick={() => {
              update.reset();
              setDraft(review);
            }}
          >
            <Pencil aria-hidden="true" />
            {review ? "Modifier ma critique" : "Écrire ma critique"}
          </Button>
        )}
      </div>
      {draft !== null ? (
        <form onSubmit={saveReview} className="mt-3 space-y-3">
          <Textarea
            aria-labelledby="work-review-title"
            className="resize-y"
            rows={6}
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={update.isPending}
          />
          {update.isError && (
            <p role="alert" className="text-sm" style={{ color: "var(--text-primary)" }}>
              La critique n’a pas été enregistrée. Tu peux réessayer.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="min-h-11" disabled={update.isPending}>
              {update.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={closeEditor} disabled={update.isPending}>
              Annuler
            </Button>
          </div>
        </form>
      ) : review && (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {review}
        </p>
      )}
    </section>
  );
}
