"use client";

import Link from "next/link";
import {
  Trophy, Users, MapPin, Calendar, Swords, Gamepad2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { CustomTournament } from "@/lib/api/custom-tournaments";

const GAME_COLORS: Record<string, string> = {
  "CS2": "text-yellow-400",
  "Valorant": "text-red-400",
  "League of Legends": "text-blue-400",
  "Dota 2": "text-red-500",
  "Overwatch 2": "text-orange-400",
  "Rainbow Six Siege": "text-sky-400",
  "Rocket League": "text-blue-300",
  "PUBG": "text-amber-400",
  "Apex Legends": "text-red-300",
  "Fortnite": "text-purple-400",
};

function getProgress(begin: string | null, end: string | null): number {
  if (!begin || !end) return 0;
  const now = Date.now();
  const start = new Date(begin).getTime();
  const finish = new Date(end).getTime();
  if (now < start) return 0;
  if (now > finish) return 100;
  return Math.round(((now - start) / (finish - start)) * 100);
}

export function CustomTournamentCard({ tournament }: { tournament: CustomTournament }) {
  const progress = getProgress(tournament.begin_at, tournament.end_at);
  const isOngoing = progress > 0 && progress < 100;
  const gameColor = GAME_COLORS[tournament.game] || "text-accent";

  return (
    <Link href={`/community/${tournament.id}`} className="block h-full">
      <div className="rounded-xl border border-border bg-surface-1 p-4 transition-all card-hover hover:border-border-hover h-full flex flex-col">
        {/* Top: game + region */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl img-container overflow-hidden flex items-center justify-center">
              <Gamepad2 size={20} className={gameColor} />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", gameColor)}>
                {tournament.game}
              </p>
              <p className="text-xs text-text-1 truncate flex items-center gap-1">
                <MapPin size={9} />
                {tournament.region}
              </p>
            </div>
          </div>
          <span className="rounded-md bg-accent/8 border border-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent shrink-0">
            {tournament.format}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-bold text-text-0 leading-snug mb-1 line-clamp-2">
          {tournament.name}
        </h3>
        {tournament.description && (
          <p className="text-[10px] text-text-2 mb-2 line-clamp-2">{tournament.description}</p>
        )}

        {/* Info pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-[10px] text-text-2 font-medium">
            <Users size={9} />
            {tournament.team_size}v{tournament.team_size}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-[10px] text-text-2 font-medium">
            <Swords size={9} />
            {tournament.max_teams} teams
          </span>
        </div>

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
          <span className="text-[10px] text-text-2 flex items-center gap-1">
            <Calendar size={9} />
            {formatDate(tournament.begin_at)}
            {tournament.end_at ? ` - ${formatDate(tournament.end_at)}` : ""}
          </span>
          {tournament.prizepool && (
            <span className="text-[10px] font-bold text-accent flex items-center gap-1">
              <Trophy size={9} />
              {tournament.prizepool}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
