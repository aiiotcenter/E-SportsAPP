"use client";

import Link from "next/link";
import { SafeImage } from "@/components/shared/safe-image";
import { GameIcon } from "@/components/shared/game-icon";
import { TierBadge } from "@/components/shared/tier-badge";
import { formatDate } from "@/lib/utils";
import type { Tournament } from "@/lib/api/types";

function getProgress(begin: string | null, end: string | null): number {
  if (!begin || !end) return 0;
  const now = Date.now();
  const start = new Date(begin).getTime();
  const finish = new Date(end).getTime();
  if (now < start) return 0;
  if (now > finish) return 100;
  return Math.round(((now - start) / (finish - start)) * 100);
}

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const progress = getProgress(tournament.begin_at, tournament.end_at);
  const isOngoing = progress > 0 && progress < 100;

  return (
    <Link href={`/tournaments/${tournament.id}`} className="block h-full">
      <div className="rounded-xl border border-border bg-surface-1 p-4 transition-all card-hover hover:border-border-hover h-full flex flex-col">
        {/* Top: game + tier */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl img-container overflow-hidden flex items-center justify-center">
              {tournament.league?.image_url ? (
                <SafeImage src={tournament.league.image_url} alt="" width={28} height={28} className="object-contain" fallbackText={tournament.league?.name?.[0] || "?"} fallbackClassName="text-xs font-bold text-text-2" />
              ) : (
                <span className="text-xs font-bold text-text-2">{tournament.league?.name?.[0]}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-accent font-semibold uppercase tracking-wider flex items-center gap-1">
                {tournament.videogame?.slug && <GameIcon slug={tournament.videogame.slug} size={10} className="text-accent" />}
                {tournament.videogame?.name}
              </p>
              <p className="text-xs text-text-1 truncate">{tournament.league?.name}</p>
            </div>
          </div>
          <TierBadge tier={tournament.tier} />
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-bold text-text-0 leading-snug mb-1 line-clamp-2">
          {tournament.name}
        </h3>
        <p className="text-[10px] text-text-2 mb-3">{tournament.serie?.full_name}</p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Progress bar (if ongoing) */}
        {isOngoing && (
          <div className="mb-3">
            <div className="h-1 w-full rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full rounded-full tournament-progress transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[9px] text-text-2 mt-1">{progress}% complete</p>
          </div>
        )}

        {/* Bottom: dates + prizepool */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <span className="text-[10px] text-text-2">
            {formatDate(tournament.begin_at)}
            {tournament.end_at ? ` - ${formatDate(tournament.end_at)}` : ""}
          </span>
          {tournament.prizepool && (
            <span className="text-[10px] font-bold text-accent">{tournament.prizepool}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
