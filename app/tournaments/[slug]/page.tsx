"use client";

import { use, useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { GameIcon } from "@/components/shared/game-icon";
import Link from "next/link";
import { ArrowLeft, Calendar, ChevronRight, ClipboardEdit, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import {
  useTournament, useTournamentStandings, useTournamentMatches,
  useTournamentTeams, useTournamentBrackets,
} from "@/lib/api/tournaments";
import { TierBadge } from "@/components/shared/tier-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { MatchCard } from "@/components/match/match-card";
import { PageSkeleton, TableSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTransition } from "@/components/shared/animated-container";
import { useLocale } from "@/hooks/use-locale";
import { cn, formatDate } from "@/lib/utils";
import type { Team, MatchStatus } from "@/lib/api/types";

export default function TournamentDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t } = useLocale();
  const [tab, setTab] = useState<string>("Standings");

  const { data: tournament, isLoading, isError, refetch } = useTournament(slug);
  const standings = useTournamentStandings(slug);
  const matches = useTournamentMatches(slug);
  const teams = useTournamentTeams(slug);
  const brackets = useTournamentBrackets(slug, tab === "Bracket");

  if (isLoading) return <PageSkeleton />;
  if (isError || !tournament) return <ErrorState message="Failed to load tournament." onRetry={() => refetch()} />;

  const tabItems = [
    { key: "Standings", label: t("standings") },
    { key: "Matches", label: t("matches_tab"), count: matches.data?.length },
    { key: "Teams", label: t("teams_tab"), count: teams.data?.length },
    ...(tournament.has_bracket ? [{ key: "Bracket", label: t("bracket") }] : []),
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1200px] px-5 py-8">
        {/* Back */}
        <Link href="/tournaments" className="inline-flex items-center gap-1.5 text-xs text-text-2 hover:text-text-0 transition-colors mb-6">
          <ArrowLeft size={13} /> {t("back")}
        </Link>

        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row gap-5 items-start mb-8">
          {/* Logo */}
          {tournament.league?.image_url && (
            <div className="h-16 w-16 shrink-0 rounded-xl border border-border bg-surface-1 overflow-hidden flex items-center justify-center">
              <SafeImage src={tournament.league.image_url} alt="" width={44} height={44} className="object-contain" fallbackText={tournament.league?.name?.[0] || "?"} fallbackClassName="text-lg font-bold text-text-2" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <TierBadge tier={tournament.tier} />
              <span className="text-[10px] text-text-2 flex items-center gap-1">
                {tournament.videogame?.slug && <GameIcon slug={tournament.videogame.slug} size={10} className="text-text-2" />}
                {tournament.videogame?.name}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-0 leading-tight">{tournament.name}</h1>
            <p className="text-xs text-text-2 mt-0.5">{tournament.league?.name} — {tournament.serie?.full_name}</p>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-text-2">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {formatDate(tournament.begin_at)} — {formatDate(tournament.end_at)}
              </span>
              {tournament.prizepool && (
                <span className="text-accent font-bold">{tournament.prizepool}</span>
              )}
            </div>
          </div>

          {/* Register Button */}
          <Link
            href={`/tournaments/${slug}/register`}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors shrink-0 btn-primary-shadow"
          >
            <ClipboardEdit size={14} />
            {t("register_now")}
          </Link>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {tabItems.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={cn("tab-pill", tab === tb.key && "tab-pill-active")}>
              {tb.label}
              {tb.count !== undefined && tb.count > 0 && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ml-1",
                  tab === tb.key ? "bg-white/20 text-white" : "bg-surface-2 text-text-2")}>{tb.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

          {/* STANDINGS */}
          {tab === "Standings" && (
            standings.isLoading ? <TableSkeleton rows={8} /> :
            standings.data?.length ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/50 text-[10px] text-text-2 uppercase tracking-wider">
                      <th className="text-left py-3 px-4 w-10">#</th>
                      <th className="text-left py-3 px-4">{t("teams_tab")}</th>
                      <th className="text-center py-3 px-4 w-14">{t("wins")}</th>
                      <th className="text-center py-3 px-4 w-14">{t("losses")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.data.map((s, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-surface-1 transition-colors">
                        <td className={cn("py-3 px-4 font-semibold tabular-nums", s.rank <= 3 ? "text-accent" : "text-text-2")}>{s.rank}</td>
                        <td className="py-3 px-4">
                          {s.team ? (
                            <Link href={`/teams/${s.team.slug}`} className="flex items-center gap-2 hover:text-accent transition-colors">
                              <div className="h-6 w-6 rounded img-container overflow-hidden flex items-center justify-center shrink-0">
                                {s.team.image_url ? <SafeImage src={s.team.image_url} alt="" width={18} height={18} className="object-contain" fallbackText={s.team.acronym?.[0] || "?"} fallbackClassName="text-[8px] font-bold text-text-2" /> :
                                  <span className="text-[8px] font-bold text-text-2">{s.team.acronym?.[0]}</span>}
                              </div>
                              <span className="text-text-0 font-medium">{s.team.name}</span>
                            </Link>
                          ) : <span className="text-text-2">TBD</span>}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-win tabular-nums">{s.wins}</td>
                        <td className="py-3 px-4 text-center font-semibold text-loss tabular-nums">{s.losses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title={t("standings")} description={t("nothing_here")} />
          )}

          {/* MATCHES */}
          {tab === "Matches" && (
            matches.isLoading ? <TableSkeleton /> :
            matches.data?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matches.data.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            ) : <EmptyState title={t("matches_tab")} description={t("nothing_here")} />
          )}

          {/* TEAMS */}
          {tab === "Teams" && (
            teams.isLoading ? <TableSkeleton /> :
            teams.data?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {teams.data.map((team) => (
                  <Link key={team.id} href={`/teams/${team.slug}`}>
                    <div className="rounded-lg border border-border bg-surface-1 p-4 text-center card-hover hover:border-border-hover">
                      <div className="h-10 w-10 mx-auto rounded-md img-container overflow-hidden flex items-center justify-center mb-2">
                        {team.image_url ? <SafeImage src={team.image_url} alt="" width={32} height={32} className="object-contain" fallbackText={team.acronym?.[0] || "?"} fallbackClassName="text-[10px] font-bold text-text-2" /> :
                          <span className="text-[10px] font-bold text-text-2">{team.acronym?.[0]}</span>}
                      </div>
                      <p className="text-xs font-medium text-text-0 truncate">{team.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <EmptyState title={t("teams_tab")} description={t("nothing_here")} />
          )}

          {/* BRACKET */}
          {tab === "Bracket" && (
            brackets.isLoading ? <TableSkeleton rows={6} /> :
            brackets.isError ? <ErrorState message="Failed to load bracket." onRetry={() => brackets.refetch()} /> :
            brackets.data?.length ? (
              <div className="space-y-2">
                {brackets.data.map((bm) => {
                  const bt1 = bm.opponents?.[0]?.opponent as Team | undefined;
                  const bt2 = bm.opponents?.[1]?.opponent as Team | undefined;
                  const bs1 = bm.results?.[0]?.score ?? 0;
                  const bs2 = bm.results?.[1]?.score ?? 0;
                  return (
                    <div key={bm.id} className="rounded-lg border border-border bg-surface-1 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-text-2 font-medium">{bm.name || `Match #${bm.id}`}</span>
                        <StatusBadge status={bm.status as MatchStatus} />
                      </div>
                      <div className="space-y-1.5">
                        {/* Team 1 */}
                        <div className={cn("flex items-center justify-between rounded-md px-3 py-2", bs1 > bs2 ? "bg-win/5" : "bg-surface-0")}>
                          <div className="flex items-center gap-2">
                            {bt1?.image_url && (
                              <div className="h-5 w-5 rounded img-container overflow-hidden flex items-center justify-center">
                                <SafeImage src={bt1.image_url} alt="" width={14} height={14} className="object-contain" fallbackText={bt1?.acronym?.[0] || "?"} fallbackClassName="text-[7px] font-bold text-text-2" />
                              </div>
                            )}
                            <span className="text-xs text-text-0 font-medium">{bt1?.name || "TBD"}</span>
                          </div>
                          <span className={cn("text-sm font-bold tabular-nums", bs1 > bs2 ? "text-accent" : "text-text-2")}>{bs1}</span>
                        </div>
                        {/* Team 2 */}
                        <div className={cn("flex items-center justify-between rounded-md px-3 py-2", bs2 > bs1 ? "bg-win/5" : "bg-surface-0")}>
                          <div className="flex items-center gap-2">
                            {bt2?.image_url && (
                              <div className="h-5 w-5 rounded img-container overflow-hidden flex items-center justify-center">
                                <SafeImage src={bt2.image_url} alt="" width={14} height={14} className="object-contain" fallbackText={bt2?.acronym?.[0] || "?"} fallbackClassName="text-[7px] font-bold text-text-2" />
                              </div>
                            )}
                            <span className="text-xs text-text-0 font-medium">{bt2?.name || "TBD"}</span>
                          </div>
                          <span className={cn("text-sm font-bold tabular-nums", bs2 > bs1 ? "text-accent" : "text-text-2")}>{bs2}</span>
                        </div>
                      </div>
                      {!!bm.previous_matches?.length && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-3">
                          {bm.previous_matches.map((prev) => (
                            <span key={`${bm.id}-${prev.match_id}-${prev.type}`} className="rounded bg-surface-0 px-2 py-1 text-[10px] font-medium text-text-2">
                              {prev.type === "winner" ? "Winner of" : "Loser of"} #{prev.match_id}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState title={t("bracket")} description={t("nothing_here")} />
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
}
