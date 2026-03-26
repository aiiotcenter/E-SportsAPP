"use client";

import { use } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { GameIcon } from "@/components/shared/game-icon";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useMatch } from "@/lib/api/matches";
import { StatusBadge } from "@/components/shared/status-badge";
import { TierBadge } from "@/components/shared/tier-badge";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { PageTransition } from "@/components/shared/animated-container";
import { useLocale } from "@/hooks/use-locale";
import { cn, formatDateTime } from "@/lib/utils";
import type { Team } from "@/lib/api/types";

function Side({ team, score, won, align }: { team?: Team; score: number; won: boolean; align: "l" | "r" }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 flex-1", align === "l" ? "md:items-end" : "md:items-start")}>
      <Link href={team ? `/teams/${team.slug}` : "#"} className="group flex flex-col items-center gap-2">
        <div className={cn(
          "h-20 w-20 rounded-2xl img-container overflow-hidden flex items-center justify-center transition-all",
          won ? "ring-accent/30 shadow-lg shadow-accent/10" : ""
        )}>
          {team?.image_url ? (
            <SafeImage src={team.image_url} alt={team.name} width={56} height={56} className="object-contain p-1" fallbackText={team?.acronym?.[0] || "?"} fallbackClassName="text-xl font-bold text-text-2" />
          ) : (
            <span className="text-xl font-bold text-text-2">{team?.acronym?.[0] || "?"}</span>
          )}
        </div>
        <span className={cn("text-sm font-bold group-hover:text-accent transition-colors", won ? "text-accent" : "text-text-0")}>
          {team?.name || "TBD"}
        </span>
      </Link>
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className={cn("text-5xl font-extrabold tabular-nums", won ? "text-accent neon-text" : "text-text-2")}
      >
        {score}
      </motion.span>
    </div>
  );
}

export default function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLocale();
  const { data: m, isLoading, isError, refetch } = useMatch(id);

  if (isLoading) return <PageSkeleton />;
  if (isError || !m) return <ErrorState message={t("error")} onRetry={() => refetch()} />;

  const t1 = m.opponents?.[0]?.opponent as Team | undefined;
  const t2 = m.opponents?.[1]?.opponent as Team | undefined;
  const s1 = m.results?.[0]?.score ?? 0;
  const s2 = m.results?.[1]?.score ?? 0;
  const fin = m.status === "finished";
  const w1 = fin && m.winner_id === t1?.id;
  const w2 = fin && m.winner_id === t2?.id;
  const stream = m.streams_list?.find((s) => s.main);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[900px] px-5 py-10">
        <Link href="/matches" className="inline-flex items-center gap-1.5 text-xs text-text-2 hover:text-accent transition-colors mb-8">
          <ArrowLeft size={13} /> {t("back")}
        </Link>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <StatusBadge status={m.status} />
          <TierBadge tier={m.tournament?.tier ?? null} />
          <span className="text-[11px] text-text-2 font-medium flex items-center gap-1">
            {m.videogame?.slug && <GameIcon slug={m.videogame.slug} size={12} className="text-text-2" />}
            {m.videogame?.name}
          </span>
          <span className="text-[11px] text-text-2">BO{m.number_of_games}</span>
          {stream && (
            <a href={stream.raw_url} target="_blank" rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 text-[11px] text-accent hover:text-accent-hover transition-colors font-medium rounded-lg bg-accent/8 border border-accent/20 px-3 py-1">
              <ExternalLink size={11} /> Watch
            </a>
          )}
        </div>

        {/* VS */}
        <div className="rounded-2xl border border-border bg-surface-1 backdrop-blur-sm p-8 featured-gradient mb-8">
          <div className="flex items-center justify-center gap-8">
            <Side team={t1} score={s1} won={w1} align="l" />
            <span className="text-text-2/40 text-sm font-bold uppercase tracking-widest shrink-0">vs</span>
            <Side team={t2} score={s2} won={w2} align="r" />
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <div className="rounded-xl border border-border bg-surface-1 p-5">
            <p className="text-[10px] text-text-2 uppercase tracking-wider font-semibold mb-2">{t("schedule")}</p>
            <p className="text-sm text-text-0 font-medium">{formatDateTime(m.scheduled_at)}</p>
            {m.end_at && <p className="text-[10px] text-text-2 mt-1">Ended {formatDateTime(m.end_at)}</p>}
          </div>
          <Link href={`/tournaments/${m.tournament?.id}`} className="rounded-xl border border-border bg-surface-1 p-5 hover:bg-surface-2/30 hover:border-border-hover transition-all">
            <p className="text-[10px] text-text-2 uppercase tracking-wider font-semibold mb-2">{t("tournament")}</p>
            <p className="text-sm text-text-0 font-medium">{m.league?.name}</p>
            <p className="text-[10px] text-text-2 mt-1">{m.serie?.full_name} - {m.tournament?.name}</p>
          </Link>
        </div>

        {/* Games */}
        {m.games?.length > 0 && (() => {
          // Build a map of team_id -> team for quick winner lookup
          const teamMap = new Map<number, Team>();
          m.opponents?.forEach((o) => {
            if (o.opponent && 'id' in o.opponent) {
              teamMap.set(o.opponent.id, o.opponent as Team);
            }
          });

          return (
            <div>
              <h3 className="text-sm font-bold text-text-0 mb-4">{t("games")}</h3>
              <div className="space-y-2">
                {m.games.sort((a, b) => a.position - b.position).map((g) => {
                  const winnerTeam = g.winner?.id ? teamMap.get(g.winner.id) : null;
                  const duration = g.length != null
                    ? `${Math.floor(g.length / 60)}m`
                    : g.begin_at && g.end_at
                      ? `${Math.round((new Date(g.end_at).getTime() - new Date(g.begin_at).getTime()) / 60000)}m`
                      : null;

                  return (
                    <div key={g.id} className="flex items-center justify-between rounded-xl border border-border bg-surface-1 px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-text-1 font-semibold shrink-0">Game {g.position}</span>
                        {winnerTeam && (
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-text-2">—</span>
                            {winnerTeam.image_url && (
                              <div className="h-4 w-4 shrink-0 rounded img-container overflow-hidden flex items-center justify-center">
                                <SafeImage src={winnerTeam.image_url} alt={winnerTeam.name} width={14} height={14} className="object-contain" fallbackText={winnerTeam.acronym?.[0] || "?"} fallbackClassName="text-[7px] font-bold text-text-2" />
                              </div>
                            )}
                            <span className="text-[11px] text-accent font-semibold truncate">{winnerTeam.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {g.forfeit && (
                          <span className="text-[9px] font-bold text-text-2/60 uppercase tracking-wider">FF</span>
                        )}
                        {duration && <span className="text-[10px] text-text-2 tabular-nums">{duration}</span>}
                        <span className={cn(
                          "text-[10px] font-semibold rounded-full px-2.5 py-0.5 border",
                          g.finished
                            ? "bg-win/10 text-win border-win/20"
                            : g.status === "running"
                              ? "bg-live/10 text-live border-live/20 animate-pulse"
                              : "bg-surface-2 text-text-2 border-border"
                        )}>
                          {g.finished ? (winnerTeam ? "Winner" : "Done") : g.status === "running" ? "LIVE" : "Pending"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </PageTransition>
  );
}
