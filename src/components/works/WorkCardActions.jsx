import React from "react";
import { ArrowRightLeft, Heart, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { effectiveStatus, STATUS_ACTIONS, STATUS_CONFIG, STATUSES } from "@/lib/statusActions";

export default function WorkCardActions({ work, onEdit, onDelete, onStatusChange, onToggleFavorite }) {
  const actions = STATUS_ACTIONS[effectiveStatus(work)] || [];
  const primary = actions.find(action => action.variant === "primary") || actions[0];
  const availableStatuses = STATUSES.filter(status =>
    work.type === "livre" ? status !== "À voir" : status !== "Envie de lire"
  );

  return (
    <div className="flex items-center gap-1">
      {primary && onStatusChange && (
        <button type="button" onClick={() => onStatusChange(work, primary.targetStatus)}
          className="min-h-11 min-w-0 rounded-lg px-2.5 text-xs font-bold hover:opacity-80"
          style={{ color: "var(--text-primary)", backgroundColor: "var(--accent-soft)" }}>
          {primary.label}
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`Actions pour ${work.title}`}
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}>
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onToggleFavorite && (
            <DropdownMenuItem onSelect={() => onToggleFavorite(work)}>
              <Heart className="mr-2 h-4 w-4" /> {work.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onSelect={() => onEdit(work)}>
              <Pencil className="mr-2 h-4 w-4" /> Modifier
            </DropdownMenuItem>
          )}
          {onStatusChange && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft className="mr-2 h-4 w-4" /> Statut
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {availableStatuses.map(status => {
                  const label = STATUS_CONFIG[effectiveStatus({ ...work, status })].label;
                  return <DropdownMenuItem key={status} onSelect={() => onStatusChange(work, status)}>{label}</DropdownMenuItem>;
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onDelete(work)} className="text-red-500 focus:text-red-500">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
