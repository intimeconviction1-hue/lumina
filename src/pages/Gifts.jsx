import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WorksLoadError from "@/components/works/WorksLoadError";
import { useWorks } from "@/hooks/useWorks";
import { useWorkMutations } from "@/hooks/useWorkMutations";
import { isGiftTag } from "@/lib/gifts";

function GiftRow({ work, save, saving }) {
  const saved = work.gift_recipients || "";
  const [draft, setDraft] = useState(null);
  const recipients = draft ?? saved;

  return (
    <li className="rounded-xl border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
      <Link className="font-semibold underline-offset-4 hover:underline" to={`/WorkDetail?id=${encodeURIComponent(work.id)}`}>
        {work.title}
      </Link>
      <form className="mt-3" onSubmit={async event => {
        event.preventDefault();
        try {
          await save(recipients.trim());
          setDraft(null);
        } catch {
          // Le hook de mutation signale l’erreur. Le texte reste éditable.
        }
      }}>
        <label className="mb-1 block text-sm font-medium" htmlFor={`recipients-${work.id}`}>
          Destinataires
        </label>
        <div className="flex flex-wrap gap-2">
          <Input id={`recipients-${work.id}`} className="min-w-36 flex-1" value={recipients}
            placeholder="Ex. Léa, David" maxLength={300} disabled={saving}
            onChange={event => setDraft(event.target.value)} />
          <Button type="submit" variant="outline" disabled={saving || recipients.trim() === saved}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </li>
  );
}

export default function Gifts() {
  const { data: works = [], isLoading, isError, refetch, isFetching } = useWorks();
  const { update } = useWorkMutations();
  const gifts = works.filter(work => work.tags?.some(isGiftTag));

  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Gift className="h-6 w-6" aria-hidden="true" /> Cadeaux
      </h1>
      {isLoading && <p role="status">Chargement…</p>}
      {isError && <WorksLoadError retry={refetch} retrying={isFetching} />}
      {!isLoading && !isError && gifts.length === 0 && (
        <p style={{ color: "var(--text-secondary)" }}>Coche « Cadeau » dans une fiche pour la retrouver ici.</p>
      )}
      <ul className="space-y-3">
        {gifts.map(work => (
          <GiftRow key={work.id} work={work} saving={update.isPending}
            save={gift_recipients => update.mutateAsync({ id: work.id, patch: { gift_recipients } })} />
        ))}
      </ul>
    </section>
  );
}
