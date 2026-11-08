import React from "react";
import { Button } from "@/components/ui/button";

export default function WorksLoadError({ retry, retrying }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center" role="alert">
      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Chargement impossible</p>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Les données n’ont pas pu être chargées.
      </p>
      <Button type="button" variant="outline" onClick={() => retry()} disabled={retrying}>
        {retrying ? "Chargement…" : "Réessayer"}
      </Button>
    </div>
  );
}
