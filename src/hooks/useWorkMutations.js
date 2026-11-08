import { useMutation, useQueryClient } from "@tanstack/react-query";
import { worksApi } from "@/api/works";
import { WORKS_KEY } from "@/hooks/useWorks";
import { toast } from "@/components/ui/use-toast";

// Hook de mutations partagé pour les œuvres.
// Chaque mutation applique une mise à jour optimiste, ANNULE proprement en cas
// d'échec (rollback + toast) et réinvalide le cache une fois réglée.
// Remplace le pattern setQueryData/await/invalidate copié dans chaque page.

function patchCaches(queryClient, id, patch) {
  queryClient.setQueryData(WORKS_KEY, (old) =>
    old?.map((w) => (w.id === id ? { ...w, ...patch } : w))
  );
  queryClient.setQueryData(["work", id], (old) => (old ? { ...old, ...patch } : old));
}

export function useWorkMutations() {
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: ({ id, patch }) => worksApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: WORKS_KEY }),
        queryClient.cancelQueries({ queryKey: ["work", id], exact: true }),
      ]);
      const prevWork = queryClient.getQueryData(WORKS_KEY)?.find((work) => work.id === id);
      const prevDetail = queryClient.getQueryData(["work", id]);
      patchCaches(queryClient, id, patch);
      return { prevWork, prevDetail };
    },
    onSuccess: (work, { id, patch }) => {
      const saved = Object.fromEntries(Object.keys(patch).map((key) => [key, work[key]]));
      patchCaches(queryClient, id, { ...saved, updated_date: work.updated_date });
    },
    onError: (err, { id, patch }, ctx) => {
      const rollback = (current, previous) => {
        if (!current || !previous) return current;
        const restored = { ...current };
        for (const key of Object.keys(patch)) {
          if (Object.is(current[key], patch[key])) restored[key] = previous[key];
        }
        return restored;
      };
      queryClient.setQueryData(WORKS_KEY, (old) =>
        old?.map((work) => work.id === id ? rollback(work, ctx?.prevWork) : work)
      );
      queryClient.setQueryData(["work", id], (old) => rollback(old, ctx?.prevDetail));
      toast({ title: "Échec de la mise à jour", description: String(err?.message || err) });
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: WORKS_KEY });
      if (vars?.id) queryClient.invalidateQueries({ queryKey: ["work", vars.id] });
    },
  });

  const remove = useMutation({
    mutationFn: (id) => worksApi.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: WORKS_KEY });
      const prevList = queryClient.getQueryData(WORKS_KEY);
      queryClient.setQueryData(WORKS_KEY, (old = []) => old.filter((w) => w.id !== id));
      return { prevList };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prevList !== undefined) queryClient.setQueryData(WORKS_KEY, ctx.prevList);
      toast({ title: "Échec de la suppression", description: String(err?.message || err) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: WORKS_KEY }),
  });

  const create = useMutation({
    mutationFn: (data) => worksApi.create(data),
    onError: (err) => {
      toast({ title: "Échec de la création", description: String(err?.message || err) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: WORKS_KEY }),
  });

  return {
    update,
    remove,
    create,
    // Wrappers renvoyant une promesse (compatibles avec l'ancien code en await).
    // Le .catch swallow évite les rejets non gérés : l'échec est déjà signalé
    // par le toast dans onError et le cache est déjà revenu à son état initial.
    updateWork: (id, patch) => update.mutateAsync({ id, patch }).catch(() => {}),
    removeWork: (id) => remove.mutateAsync(id).catch(() => {}),
    createWork: (data) => create.mutateAsync(data).catch(() => {}),
  };
}
