"use client";

import Link from "next/link";
import { SafeImage } from "@/components/shared/safe-image";
import { GameIcon } from "@/components/shared/game-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn, formatDateTime, timeUntil } from "@/lib/utils";
import type { Match, Team } from "@/lib/api/types";

function TeamLogo({ team, side }: { team?: Team; side: "l" | "r" }) {
  return (
    <div className={cn("flex items-center gap-3 flex-1 min-w-0", side === "r" && "flex-row-reverse text-right")}>
      <div className="h-10 w-10 shrink-0 rounded-xl img-container overflow-hidden flex items-center justify-center">
        {team?.image_url ? (
          <SafeImage src={team.image_url} alt={team.name} width={32} height={32} className="object-contain" fallbackText={team?.acronym?.[0] || "?"} fallbackClassName="text-[11px] font-bold text-text-2" />
        ) : (
          <span className="text-[11px] font-bold text-text-2">{team?.acronym?.[0] || "?"}</span>
        )}
      </div>
      <span className="text-[13px] font-semibold text-text-0 truncate">{team?.name || "TBD"}</span>
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const t1 = match.opponents?.[0]?.opponent as Team | undefined;
  const t2 = match.opponents?.[1]?.opponent as Team | undefined;
  const s1 = match.results?.[0]?.score ?? 0;
  const s2 = match.results?.[1]?.score ?? 0;
  const isLive = match.status === "running";
  const isFinished = match.status === "finished";
  const w1 = isFinished && match.winner_id === t1?.id;
  const w2 = isFinished && match.winner_id === t2?.id;

  return (
    <Link href={`/matches/${match.id}`} className="block h-full">
      <div
        className={cn(
          "group flex h-full flex-col rounded-xl border bg-surface-1 p-4 transition-all card-hover",
          isLive ? "live-card" : "border-border hover:border-border-hover"
        )}
      >
        {/* Top bar: status + meta */}
        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={match.status} />
          <div className="flex items-center gap-2">
            {match.videogame?.slug && <GameIcon slug={match.videogame.slug} size={12} className="text-text-2" />}
            <span className="text-[10px] text-text-2 font-medium">{match.videogame?.name}</span>
            <span className="text-[10px] text-text-2/50">|</span>
            <span className="text-[10px] text-text-2">BO{match.number_of_games}</span>
          </div>
        </div>

        {/* Matchup */}
        <div className="flex items-center gap-2">
          <TeamLogo team={t1} side="l" />
          <div className="shrink-0 w-20 text-center">
            {match.status === "not_started" ? (
              <div className="flex flex-col items-center">
                <span className="text-[11px] text-text-2 font-medium">{timeUntil(match.scheduled_at || "")}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1">
                <span className={cn(
                  "text-xl font-extrabold tabular-nums",
                  w1 ? "text-accent" : isFinished ? "text-text-2" : "text-text-0"
                )}>{s1}</span>
                <span className="text-text-2/40 text-sm font-light mx-0.5">-</span>
                <span className={cn(
                  "text-xl font-extrabold tabular-nums",
                  w2 ? "text-accent" : isFinished ? "text-text-2" : "text-text-0"
                )}>{s2}</span>
              </div>
            )}
          </div>
          <TeamLogo team={t2} side="r" />
        </div>

        {/* Bottom: league + time */}
        <div className="mt-auto pt-3 flex items-center gap-2">
          {match.league?.image_url && (
            <div className="h-4 w-4 rounded img-container overflow-hidden flex items-center justify-center shrink-0">
              <SafeImage src={match.league.image_url} alt="" width={12} height={12} className="object-contain" fallbackText={match.league?.name?.[0] || "?"} fallbackClassName="text-[8px] font-bold text-text-2" />
            </div>
          )}
          <span className="text-[10px] text-text-2 truncate flex-1">
            {match.league?.name}{match.serie?.full_name ? ` - ${match.serie.full_name}` : ""}
          </span>
          {match.status === "not_started" && match.scheduled_at && (
            <span className="text-[10px] text-text-2 shrink-0 tabular-nums">{formatDateTime(match.scheduled_at)}</span>
          )}
          {isLive && (
            <span className="text-[10px] text-live font-semibold shrink-0 flex items-center gap-1">
              <span className="live-dot h-1 w-1 rounded-full bg-live" />
              LIVE
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
