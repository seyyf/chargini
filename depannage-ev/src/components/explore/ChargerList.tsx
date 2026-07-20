"use client";

import { useTranslations } from "next-intl";
import type { Charger } from "@/types/database";
import { ChargerCard } from "./ChargerCard";

interface ChargerListProps {
  chargers: Charger[];
  /** Currently selected charger id (synced with map). */
  selectedId?: string | null;
  /** Called when the user selects a charger from the list. */
  onSelect?: (id: string) => void;
}

export function ChargerList({ chargers, selectedId, onSelect }: ChargerListProps) {
  const t = useTranslations("explore");

  if (chargers.length === 0) {
    return (
      <p className="py-16 text-center text-slate-500">{t("empty")}</p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2" role="list">
      {chargers.map((charger) => (
        <li key={charger.id}>
          <ChargerCard
            charger={charger}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}
