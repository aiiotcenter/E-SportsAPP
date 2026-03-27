"use client";

import { use, useState, useMemo, type ReactNode } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import Link from "next/link";
import { ArrowLeft, ChevronRight, MapPin, Trophy, Swords, Users } from "lucide-react";
import { GameIcon } from "@/components/shared/game-icon";
import { motion } from "framer-motion";
import { useTeam, useTeamMatches, useTeamTournaments } from "@/lib/api/teams";
import { MatchCard } from "@/components/match/match-card";
import { TierBadge } from "@/components/shared/tier-badge";
import { ProfileSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/shared/animated-container";
import { useLocale } from "@/hooks/use-locale";
import { cn, formatDate, sortMatchesByRecency } from "@/lib/utils";
import type { Team, Match } from "@/lib/api/types";

type ResultFilter = "finished" | "canceled" | "all";

function computeStats(matches: Match[] | undefined, teamId: number) {
  if (!matches?.length) return { wins: 0, losses: 0, recentForm: [] as ("W" | "L")[] };
  let wins = 0, losses = 0;
  const recentForm: ("W" | "L")[] = [];
  for (const m of matches) {
    if (m.status !== "finished") continue;
    const won = m.winner_id === teamId;
    if (won) wins++; else losses++;
    if (recentForm.length < 10) recentForm.push(won ? "W" : "L");
  }
  return { wins, losses, recentForm };
}

function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3">
      <span className={cn("text-2xl font-extrabold tabular-nums tracking-tight", accent ? "text-accent" : "text-text-0")}>{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-text-2">{label}</span>
    </div>
  );
}

function FormStrip({ results }: { results: ("W" | "L")[] }) {
  if (!results.length) return null;
  return (
    <div className="flex items-center gap-1">
      {results.map((r, i) => (
        <div key={i} className={cn("h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold", r === "W" ? "bg-win/10 text-win" : "bg-loss/10 text-loss")}>{r}</div>
      ))}
    </div>
  );
}

export default function TeamProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t } = useLocale();
  const [tab, setTab] = useState<string>("overview");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("finished");

  const { data: team, isLoading, isError, refetch } = useTeam(slug);
  const matches = useTeamMatches(slug);
  const tournaments = useTeamTournaments(slug);

  const sortedMatches = useMemo(() => sortMatchesByRecency(matches.data), [matches.data]);
  const filteredMatches = useMemo(() => {
    if (resultFilter === "all") return sortedMatches;
    return sortedMatches.filter((m) => m.status === resultFilter);
  }, [resultFilter, sortedMatches]);

  const stats = useMemo(() => computeStats(sortedMatches, team?.id ?? 0), [sortedMatches, team?.id]);
  const winRate = stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) : 0;

  const resultFilters: Array<{ key: ResultFilter; label: string; count: number }> = [
    { key: "finished", label: t("matches.filter.finished"), count: sortedMatches.filter((m) => m.status === "finished").length },
    { key: "canceled", label: t("matches.filter.canceled"), count: sortedMatches.filter((m) => m.status === "canceled").length },
    { key: "all", label: t("matches.filter.all"), count: sortedMatches.length },
  ];

  if (isLoading) return <ProfileSkeleton />;
  if (isError || !team) return <ErrorState message="Failed to load team." onRetry={() => refetch()} />;

  const tabItems = [
    { key: "overview", label: t("team.overview") },
    { key: "roster", label: t("team.roster"), count: team.players?.length },
    { key: "matches", label: t("team.matches"), count: sortedMatches.length },
    { key: "tournaments", label: t("team.tournaments"), count: tournaments.data?.length },
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1200px] px-5 py-8">
        {/* Back */}
        <Link href="/teams" className="inline-flex items-center gap-1.5 text-xs text-text-2 hover:text-text-0 transition-colors mb-6">
          <ArrowLeft size={13} /> {t("back")}
        </Link>

        {/* ─── Header ─── */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Identity */}
          <div className="flex gap-5 items-start flex-1 min-w-0">
            <div className="h-20 w-20 shrink-0 rounded-xl border border-border bg-surface-1 overflow-hidden flex items-center justify-center">
              {team.image_url ? (
                <SafeImage src={team.image_url} alt={team.name} width={56} height={56} className="object-contain p-1" fallbackText={team.acronym?.[0] || "?"} fallbackClassName="text-2xl font-bold text-text-2" />
              ) : (
                <span className="text-2xl font-bold text-text-2">{team.acronym?.[0] || "?"}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                {team.acronym && (
                  <span className="text-[10px] font-semibold text-text-2 bg-surface-2 rounded px-1.5 py-0.5">{team.acronym}</span>
                )}
                {team.current_videogame && (
                  <span className="flex items-center gap-1 text-[10px] text-text-2">
                    <GameIcon slug={team.current_videogame.slug || ""} size={11} className="text-text-2" />
                    {team.current_videogame.name}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-0 leading-tight">{team.name}</h1>
              {team.location && (
                <p className="text-xs text-text-2 mt-1 flex items-center gap-1">
                  <MapPin size={11} /> {team.location.toUpperCase()}
                </p>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex items-center rounded-lg border border-border bg-surface-1 divide-x divide-border shrink-0 self-start">
            <StatPill label={t("team.stats.matches")} value={stats.wins + stats.losses} />
            <StatPill label={t("team.stats.winrate")} value={`${winRate}%`} accent />
            <StatPill label="W" value={stats.wins} />
            <StatPill label="L" value={stats.losses} />
          </div>
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

          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent form */}
                {stats.recentForm.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-3">{t("team.stats.recent")}</h2>
                    <FormStrip results={stats.recentForm} />
                  </section>
                )}

                {/* Recent matches */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-text-2 uppercase tracking-wider">{t("recent_matches")}</h2>
                    <button onClick={() => setTab("matches")} className="text-[11px] text-text-2 hover:text-accent transition-colors">{t("view_all")} →</button>
                  </div>
                  {matches.isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-lg skeleton-shimmer" />)}</div>
                  ) : sortedMatches.length ? (
                    <div className="space-y-1.5">
                      {sortedMatches.slice(0, 6).map((m) => {
                        const won = m.status === "finished" && m.winner_id === team.id;
                        const lost = m.status === "finished" && m.winner_id !== team.id;
                        const mt1 = m.opponents?.[0]?.opponent as Team | undefined;
                        const mt2 = m.opponents?.[1]?.opponent as Team | undefined;
                        const opponent = mt1?.id === team.id ? mt2 : mt1;
                        const sc1 = m.results?.[0]?.score ?? 0;
                        const sc2 = m.results?.[1]?.score ?? 0;

                        return (
                          <Link key={m.id} href={`/matches/${m.id}`}>
                            <div className={cn(
                              "flex items-center gap-3 rounded-lg border bg-surface-1 px-4 py-2.5 transition-all card-hover",
                              won ? "border-win/15 hover:border-win/30" : lost ? "border-loss/15 hover:border-loss/30" : "border-border hover:border-border-hover"
                            )}>
                              <div className={cn("h-8 w-1 rounded-full shrink-0", won ? "bg-win" : lost ? "bg-loss" : "bg-border")} />
                              <div className="h-6 w-6 rounded img-container overflow-hidden flex items-center justify-center shrink-0">
                                {opponent?.image_url ? <SafeImage src={opponent.image_url} alt="" width={18} height={18} className="object-contain" fallbackText={opponent?.acronym?.[0] || "?"} fallbackClassName="text-[8px] font-bold text-text-2" /> :
                                  <span className="text-[8px] font-bold text-text-2">{opponent?.acronym?.[0] || "?"}</span>}
                              </div>
                              <span className="text-xs text-text-0 font-medium flex-1 truncate">{opponent?.name || "TBD"}</span>
                              <span className="font-display text-sm font-bold text-text-0 tabular-nums shrink-0">
                                {sc1}<span className="text-text-2/40 mx-0.5">:</span>{sc2}
                              </span>
                              <span className="text-[10px] text-text-2 shrink-0 hidden sm:block">{formatDate(m.scheduled_at)}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : <EmptyState title={t("team.no_matches")} />}
                </section>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Roster preview */}
                {team.players && team.players.length > 0 && (
                  <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-surface-2/50 flex items-center justify-between">
                      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-2">{t("team.roster")}</h3>
                      <button onClick={() => setTab("roster")} className="text-[10px] text-text-2 hover:text-accent transition-colors">{t("view_all")}</button>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {team.players.slice(0, 7).map((p) => (
                        <Link key={p.id} href={`/players/${p.slug}`} className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-surface-2 transition-colors group/p">
                          <div className="h-7 w-7 shrink-0 rounded-full img-container overflow-hidden flex items-center justify-center">
                            {p.image_url ? <SafeImage src={p.image_url} alt={p.name} width={28} height={28} className="object-cover" fallbackText={p.name[0]} fallbackClassName="text-[9px] font-bold text-text-2" /> :
                              <span className="text-[9px] font-bold text-text-2">{p.name[0]}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-0 truncate group-hover/p:text-accent transition-colors">{p.name}</p>
                            {p.first_name && <p className="text-[10px] text-text-2 truncate">{p.first_name} {p.last_name}</p>}
                          </div>
                          {p.role && <span className="text-[9px] text-accent bg-accent/10 rounded px-1.5 py-0.5 capitalize font-semibold shrink-0">{p.role}</span>}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tournaments */}
                <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-surface-2/50 flex items-center justify-between">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-2">{t("team.tournaments")}</h3>
                    {(tournaments.data?.length ?? 0) > 4 && (
                      <button onClick={() => setTab("tournaments")} className="text-[10px] text-text-2 hover:text-accent transition-colors">{t("view_all")}</button>
                    )}
                  </div>
                  {tournaments.isLoading ? (
                    <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 rounded-lg skeleton-shimmer" />)}</div>
                  ) : tournaments.data?.length ? (
                    <div className="p-2 space-y-0.5">
                      {tournaments.data.slice(0, 5).map((tr) => (
                        <Link key={tr.id} href={`/tournaments/${tr.id}`} className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-surface-2 transition-colors group/t">
                          <div className="h-6 w-6 shrink-0 rounded img-container overflow-hidden flex items-center justify-center">
                            {tr.league?.image_url ? <SafeImage src={tr.league.image_url} alt="" width={16} height={16} className="object-contain" fallbackText={tr.league?.name?.[0] || ""} fallbackClassName="text-[8px] font-bold text-text-2" /> :
                              <span className="text-[8px] font-bold text-text-2">{tr.league?.name?.[0]}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-0 truncate group-hover/t:text-accent transition-colors">{tr.name}</p>
                            <p className="text-[10px] text-text-2">{formatDate(tr.begin_at)}</p>
                          </div>
                          <TierBadge tier={tr.tier} />
                        </Link>
                      ))}
                    </div>
                  ) : <div className="p-4"><p className="text-xs text-text-2 text-center">{t("team.no_tournaments")}</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* ROSTER */}
          {tab === "roster" && (
            team.players && team.players.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {team.players.map((p) => (
                  <Link key={p.id} href={`/players/${p.slug}`}>
                    <div className="relative rounded-lg border border-border bg-surface-1 p-4 card-hover hover:border-border-hover">
                      {p.role && (
                        <span className="absolute top-2 right-2 text-[9px] text-accent bg-accent/10 rounded px-1.5 py-0.5 capitalize font-semibold">{p.role}</span>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full img-container overflow-hidden flex items-center justify-center shrink-0">
                          {p.image_url ? <SafeImage src={p.image_url} alt={p.name} width={48} height={48} className="object-cover" fallbackText={p.name[0]} fallbackClassName="text-sm font-bold text-text-2" /> :
                            <span className="text-sm font-bold text-text-2">{p.name[0]}</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-0 truncate">{p.name}</p>
                          {p.first_name && <p className="text-[11px] text-text-2 truncate">{p.first_name} {p.last_name}</p>}
                          {p.nationality && <p className="text-[10px] text-text-2 uppercase mt-0.5">{p.nationality}</p>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <EmptyState title={t("team.no_roster")} />
          )}

          {/* MATCHES */}
          {tab === "matches" && (
            matches.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-lg skeleton-shimmer" />)}</div>
            ) : sortedMatches.length ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {resultFilters.map((filter) => (
                    <button key={filter.key} onClick={() => setResultFilter(filter.key)}
                      className={cn("tab-pill", resultFilter === filter.key && "tab-pill-active")}>
                      {filter.label}
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ml-1",
                        resultFilter === filter.key ? "bg-white/20 text-white" : "bg-surface-2 text-text-2")}>{filter.count}</span>
                    </button>
                  ))}
                </div>
                {filteredMatches.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredMatches.map((m) => <MatchCard key={m.id} match={m} />)}
                  </div>
                ) : <EmptyState title={t("team.no_matches")} description={t("try_filters")} />}
              </div>
            ) : <EmptyState title={t("team.no_matches")} />
          )}

          {/* TOURNAMENTS */}
          {tab === "tournaments" && (
            tournaments.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-lg skeleton-shimmer" />)}</div>
            ) : tournaments.data?.length ? (
              <div className="space-y-1.5">
                {tournaments.data.map((tr) => (
                  <Link key={tr.id} href={`/tournaments/${tr.id}`} className="block group">
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3 transition-all card-hover hover:border-border-hover">
                      <div className="h-8 w-8 shrink-0 rounded-lg img-container overflow-hidden flex items-center justify-center">
                        {tr.league?.image_url ? <SafeImage src={tr.league.image_url} alt="" width={20} height={20} className="object-contain" fallbackText={tr.league?.name?.[0] || "?"} fallbackClassName="text-[8px] font-bold text-text-2" /> :
                          <span className="text-[8px] font-bold text-text-2">{tr.league?.name?.[0]}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-0 truncate group-hover:text-accent transition-colors">{tr.name}</p>
                        <p className="text-[10px] text-text-2 truncate">{tr.serie?.full_name}</p>
                      </div>
                      <TierBadge tier={tr.tier} />
                      <span className="text-[10px] text-text-2 shrink-0 hidden sm:block">{formatDate(tr.begin_at)}</span>
                      <ChevronRight size={14} className="text-text-2 shrink-0 group-hover:text-accent transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : <EmptyState title={t("team.no_tournaments")} />
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
}
