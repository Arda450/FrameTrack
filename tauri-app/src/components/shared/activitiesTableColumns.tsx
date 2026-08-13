import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { AppIcon } from "./AppIcon";
import type { ActivityRow } from "./activitiesTableTypes";

/** Definiert Spalten und Sortierkopf für die Aktivitätstabelle. */
export function createActivitiesTableColumns(): ColumnDef<ActivityRow>[] {
  return [
    {
      id: "context",
      accessorKey: "context",
      header: "Kontext",
      enableSorting: false,
    },
    {
      id: "date",
      accessorKey: "date",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        const isOldestFirst = sorted === "asc";
        return (
          <button
            type="button"
            className="activitiesTableSortButton"
            onClick={column.getToggleSortingHandler()}
            title={
              isOldestFirst
                ? "Älteste zuerst (klicken für neueste zuerst)"
                : "Neueste zuerst (klicken für älteste zuerst)"
            }
            aria-label={
              isOldestFirst
                ? "Nach Datum sortieren: älteste zuerst"
                : "Nach Datum sortieren: neueste zuerst"
            }
          >
            <span>Datum</span>
            <AppIcon icon={isOldestFirst ? ArrowUp : ArrowDown} size={14} />
          </button>
        );
      },
      enableSorting: true,
      sortDescFirst: true,
    },
    {
      id: "time",
      accessorKey: "time",
      header: "Uhrzeit",
      enableSorting: false,
    },
    {
      id: "project",
      accessorKey: "project",
      header: "Projekt",
      enableSorting: false,
    },
  ];
}
