"use client";

import { use, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Flag,
  Shield,
  Swords,
  Trophy,
  User,
} from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { GameIcon } from "@/components/shared/game-icon";
import { MatchCard } from "@/components/match/match-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TierBadge } from "@/components/shared/tier-badge";
import { ProfileSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/shared/animated-container";
import { useLocale } from "@/hooks/use-locale";
import { cn, formatDate, sortMatchesByRecency } from "@/lib/utils";
import { usePlayer, usePlayerMatches, usePlayerTournaments } from "@/lib/api/players";
import type { Match, Opponent, Player, Team, Tournament } from "@/lib/api/types";

type ResultFilter = "finished" | "canceled" | "all";

/* ─── Helpers ─── */

function resolvePlayerMatchOutcome(match: Match, playerId: number, teamId?: number | null): "W" | "L" | null {
  if (match.status !== "finished" || match.draw || !match.winner_id) return null;
  if (match.winner_type === "Player") return match.winner_id === playerId ? "W" : "L";
  if (teamId && match.opponents.some((e) => e.type === "Team" && (e.opponent as Team | undefined)?.id === teamId))
    return match.winner_id === teamId ? "W" : "L";
  if (match.opponents.some((e) => e.type === "Player" && (e.opponent as Player | undefined)?.id === playerId))
    return match.winner_id === playerId ? "W" : "L";
  return null;
}

function computePlayerStats(matches: Match[] | undefined, playerId: number | undefined, teamId: number | undefined) {
  if (!matches?.length || !playerId) return { wins: 0, losses: 0, recentForm: [] as ("W" | "L")[] };
  let wins = 0, losses = 0;
  const recentForm: ("W" | "L")[] = [];
  for (const match of matches) {
    const outcome = resolvePlayerMatchOutcome(match, playerId, teamId);
    if (!outcome) continue;
    if (outcome === "W") wins++; else losses++;
    if (recentForm.length < 10) recentForm.push(outcome);
  }
  return { wins, losses, recentForm };
}

/* ─── Stat Pill ─── */

function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3">
      <span className={cn("text-2xl font-extrabold tabular-nums tracking-tight", accent ? "text-accent" : "text-text-0")}>
        {value}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-text-2">{label}</span>
    </div>
  );
}

/* ─── Info Row ─── */

function InfoRow({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
  const inner = (
    <div className={cn("flex items-center gap-3 py-2.5 group/row", href && "cursor-pointer")}>
      <span className="text-text-2 shrink-0">{icon}</span>
      <span className="text-xs text-text-2 shrink-0 w-20">{label}</span>
      <span className={cn("text-sm font-medium text-text-0 truncate flex-1", href && "group-hover/row:text-accent transition-colors")}>
        {value}
      </span>
      {href && <ChevronRight size={13} className="text-text-2 shrink-0 group-hover/row:text-accent transition-colors" />}
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

/* ─── Recent Form ─── */

function FormStrip({ results }: { results: ("W" | "L")[] }) {
  if (!results.length) return <span className="text-xs text-text-2">—</span>;
  return (
    <div className="flex items-center gap-1">
      {results.map((r, i) => (
        <div
          key={i}
          className={cn(
            "h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold",
            r === "W" ? "bg-win/10 text-win" : "bg-loss/10 text-loss"
          )}
        >
          {r}
        </div>
      ))}
    </div>
  );
}

/* ─── Match Row (compact timeline style) ─── */

function MatchRow({ match, playerId, teamId }: { match: Match; playerId: number; teamId?: number | null }) {
  const left = match.opponents?.[0];
  const right = match.opponents?.[1];
  const leftEntity = left?.opponent as Team | Player | undefined;
  const rightEntity = right?.opponent as Team | Player | undefined;
  const outcome = resolvePlayerMatchOutcome(match, playerId, teamId);
  const s1 = match.results?.[0]?.score ?? 0;
  const s2 = match.results?.[1]?.score ?? 0;

  return (
    <Link href={`/matches/${match.id}`} className="block group">
      <div className={cn(
        "flex items-center gap-3 rounded-lg border bg-surface-1 px-4 py-3 transition-all card-hover",
        outcome === "W" ? "border-win/15 hover:border-win/30" :
        outcome === "L" ? "border-loss/15 hover:border-loss/30" :
        "border-border hover:border-border-hover"
      )}>
        {/* Outcome indicator */}
        <div className={cn(
          "h-8 w-1 rounded-full shrink-0",
          outcome === "W" ? "bg-win" : outcome === "L" ? "bg-loss" : "bg-border"
        )} />

        {/* Teams */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-7 w-7 shrink-0 rounded img-container overflow-hidden flex items-center justify-center">
            {leftEntity?.image_url ? (
              <SafeImage src={leftEntity.image_url} alt={leftEntity.name} width={20} height={20} className="object-contain" fallbackText={leftEntity.name[0]} fallbackClassName="text-[9px] font-bold text-text-2" />
            ) : <span className="text-[9px] font-bold text-text-2">{leftEntity?.name?.[0] || "?"}</span>}
          </div>
          <span className="text-xs font-medium text-text-0 truncate">{leftEntity?.name || "TBD"}</span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1 shrink-0 px-2">
          <span className={cn("text-sm font-extrabold tabular-nums", s1 > s2 ? "text-text-0" : "text-text-2")}>{s1}</span>
          <span className="text-text-2/40 text-xs">-</span>
          <span className={cn("text-sm font-extrabold tabular-nums", s2 > s1 ? "text-text-0" : "text-text-2")}>{s2}</span>
        </div>

        {/* Right team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-xs font-medium text-text-0 truncate text-right">{rightEntity?.name || "TBD"}</span>
          <div className="h-7 w-7 shrink-0 rounded img-container overflow-hidden flex items-center justify-center">
            {rightEntity?.image_url ? (
              <SafeImage src={rightEntity.image_url} alt={rightEntity.name} width={20} height={20} className="object-contain" fallbackText={rightEntity.name[0]} fallbackClassName="text-[9px] font-bold text-text-2" />
            ) : <span className="text-[9px] font-bold text-text-2">{rightEntity?.name?.[0] || "?"}</span>}
          </div>
        </div>

        {/* Meta */}
        <div className="hidden sm:flex flex-col items-end shrink-0 ml-2 gap-0.5">
          <span className="text-[10px] text-text-2 tabular-nums">{formatDate(match.scheduled_at)}</span>
          {match.videogame?.slug && (
            <span className="flex items-center gap-1 text-[10px] text-text-2">
              <GameIcon slug={match.videogame.slug} size={10} className="text-text-2" />
              BO{match.number_of_games}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── Tournament Card (compact) ─── */

function TournamentRow({ tournament }: { tournament: Tournament }) {
  return (
    <Link href={`/tournaments/${tournament.slug}`} className="block group">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3 transition-all card-hover hover:border-border-hover">
        <div className="h-9 w-9 shrink-0 rounded-lg img-container overflow-hidden flex items-center justify-center">
          {tournament.league?.image_url ? (
            <SafeImage src={tournament.league.image_url} alt="" width={24} height={24} className="object-contain" fallbackText={tournament.league?.name?.[0] || "?"} fallbackClassName="text-[9px] font-bold text-text-2" />
          ) : <span className="text-[9px] font-bold text-text-2">{tournament.league?.name?.[0]}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-0 truncate">{tournament.name}</p>
          <p className="text-[10px] text-text-2 truncate">{tournament.league?.name} · {tournament.serie?.full_name}</p>
        </div>

        <div className="hidden sm:flex flex-col items-end shrink-0 gap-0.5">
          <TierBadge tier={tournament.tier} />
          <span className="text-[10px] text-text-2 tabular-nums">{formatDate(tournament.begin_at)}</span>
        </div>

        {tournament.prizepool && (
          <span className="text-[10px] font-bold text-accent shrink-0 hidden md:block">{tournament.prizepool}</span>
        )}

        <ChevronRight size={14} className="text-text-2 shrink-0 group-hover:text-accent transition-colors" />
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════ */

export default function PlayerProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t } = useLocale();
  const [tab, setTab] = useState<string>("overview");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("finished");

  const { data: p, isLoading, isError, refetch } = usePlayer(slug);
  const matches = usePlayerMatches(slug);
  const tournaments = usePlayerTournaments(slug);

  const sortedMatches = useMemo(() => sortMatchesByRecency(matches.data), [matches.data]);

  const filteredMatches = useMemo(() => {
    if (resultFilter === "all") return sortedMatches;
    return sortedMatches.filter((m) => m.status === resultFilter);
  }, [resultFilter, sortedMatches]);

  const stats = useMemo(
    () => computePlayerStats(sortedMatches, p?.id, p?.current_team?.id),
    [sortedMatches, p?.id, p?.current_team?.id]
  );

  const resultFilters = useMemo(() => [
    { key: "finished" as const, label: t("matches.filter.finished"), count: sortedMatches.filter((m) => m.status === "finished").length },
    { key: "canceled" as const, label: t("matches.filter.canceled"), count: sortedMatches.filter((m) => m.status === "canceled").length },
    { key: "all" as const, label: t("matches.filter.all"), count: sortedMatches.length },
  ], [sortedMatches, t]);

  const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  const showFullName = Boolean(fullName) && fullName.toLowerCase() !== p?.name.toLowerCase();
  const winRate = stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) : 0;

  if (isLoading) return <ProfileSkeleton />;
  if (isError || !p) return <ErrorState message="Failed to load player." onRetry={() => refetch()} />;

  const tabItems = [
    { key: "overview", label: t("player.overview") },
    { key: "matches", label: t("player.matches"), count: sortedMatches.length },
    { key: "tournaments", label: t("player.tournaments"), count: tournaments.data?.length },
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1200px] px-5 py-8">
        {/* Breadcrumb */}
        <Link href="/players" className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-2 transition-colors hover:text-text-0">
          <ArrowLeft size={13} /> {t("back")}
        </Link>

        {/* ─── Profile Header ─── */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">

          {/* Left: Identity */}
          <div className="flex gap-5 items-start flex-1 min-w-0">
            {/* Avatar */}
            <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-2xl overflow-hidden bg-surface-1 border border-border">
              {p.image_url ? (
                <SafeImage
                  src={p.image_url} alt={p.name} width={112} height={112}
                  className="h-full w-full object-cover"
                  fallbackText={p.name[0] || "?"} fallbackClassName="text-3xl font-bold text-text-2"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-surface-2">
                  <span className="text-3xl font-bold text-text-2">{p.name[0] || "?"}</span>
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {p.role && (
                  <span className="text-[10px] font-semibold text-accent bg-accent/10 rounded px-1.5 py-0.5 uppercase">{p.role}</span>
                )}
                {p.current_videogame && (
                  <span className="flex items-center gap-1 text-[10px] text-text-2">
                    <GameIcon slug={p.current_videogame.slug || ""} size={11} className="text-text-2" />
                    {p.current_videogame.name}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-0 leading-tight">{p.name}</h1>
              {showFullName && <p className="text-sm text-text-2 mt-0.5">{fullName}</p>}

              {/* Quick info pills */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-text-2">
                {p.nationality && (
                  <span className="flex items-center gap-1">
                    <Flag size={11} /> {p.nationality.toUpperCase()}
                  </span>
                )}
                {p.age && <span>{p.age} yrs</span>}
                {p.birthday && (
                  <span className="flex items-center gap-1">
                    <CalendarDays size={11} /> {formatDate(p.birthday)}
                  </span>
                )}
              </div>

              {/* Team link */}
              {p.current_team && (
                <Link
                  href={`/teams/${p.current_team.slug}`}
                  className="mt-4 inline-flex items-center gap-2.5 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm transition-all hover:border-accent/30 hover:bg-surface-2 group/team"
                >
                  <div className="h-7 w-7 shrink-0 rounded img-container overflow-hidden flex items-center justify-center">
                    {p.current_team.image_url ? (
                      <SafeImage src={p.current_team.image_url} alt={p.current_team.name} width={20} height={20} className="object-contain" fallbackText={p.current_team.name[0]} fallbackClassName="text-[9px] font-bold text-text-2" />
                    ) : <span className="text-[9px] font-bold text-text-2">{p.current_team.name[0]}</span>}
                  </div>
                  <span className="font-medium text-text-0 group-hover/team:text-accent transition-colors">{p.current_team.name}</span>
                  <ChevronRight size={13} className="text-text-2 group-hover/team:text-accent transition-colors" />
                </Link>
              )}
            </div>
          </div>

          {/* Right: Stats strip */}
          <div className="flex items-center rounded-lg border border-border bg-surface-1 divide-x divide-border shrink-0 self-start">
            <StatPill label={t("player.stats.matches")} value={sortedMatches.length} />
            <StatPill label={t("player.stats.winrate")} value={`${winRate}%`} accent />
            <StatPill label="W" value={stats.wins} />
            <StatPill label="L" value={stats.losses} />
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {tabItems.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={cn("tab-pill", tab === tb.key && "tab-pill-active")}
            >
              {tb.label}
              {tb.count !== undefined && tb.count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ml-1",
                  tab === tb.key ? "bg-white/20 text-white" : "bg-surface-2 text-text-2"
                )}>
                  {tb.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* ─── OVERVIEW ─── */}
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
                    <button onClick={() => setTab("matches")} className="text-[11px] text-text-2 hover:text-accent transition-colors">
                      {t("view_all")} →
                    </button>
                  </div>
                  {matches.isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-lg skeleton-shimmer" />
                      ))}
                    </div>
                  ) : sortedMatches.length ? (
                    <div className="space-y-2">
                      {sortedMatches.slice(0, 6).map((match) => (
                        <MatchRow key={match.id} match={match} playerId={p.id} teamId={p.current_team?.id} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title={t("player.no_matches")} />
                  )}
                </section>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Player Info */}
                <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-surface-2/50">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-2">{t("player.career")}</h3>
                  </div>
                  <div className="px-4 py-1 divide-y divide-border/50">
                    {p.role && <InfoRow icon={<User size={13} />} label="Role" value={p.role} />}
                    {p.nationality && <InfoRow icon={<Flag size={13} />} label="Country" value={p.nationality.toUpperCase()} />}
                    {p.age && <InfoRow icon={<CalendarDays size={13} />} label="Age" value={`${p.age}`} />}
                    {p.birthday && <InfoRow icon={<CalendarDays size={13} />} label="Birthday" value={formatDate(p.birthday)} />}
                    {p.current_team && (
                      <InfoRow
                        icon={<Shield size={13} />}
                        label="Team"
                        value={p.current_team.name}
                        href={`/teams/${p.current_team.slug}`}
                      />
                    )}
                    {p.current_videogame && (
                      <InfoRow
                        icon={<GameIcon slug={p.current_videogame.slug || ""} size={13} />}
                        label="Game"
                        value={p.current_videogame.name}
                      />
                    )}
                  </div>
                </div>

                {/* Tournaments */}
                <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-surface-2/50 flex items-center justify-between">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-2">{t("tournament_history")}</h3>
                    {(tournaments.data?.length ?? 0) > 3 && (
                      <button onClick={() => setTab("tournaments")} className="text-[10px] text-text-2 hover:text-accent transition-colors">
                        {t("view_all")}
                      </button>
                    )}
                  </div>
                  {tournaments.isLoading ? (
                    <div className="p-4 space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 rounded-lg skeleton-shimmer" />
                      ))}
                    </div>
                  ) : tournaments.data?.length ? (
                    <div className="p-2 space-y-1">
                      {tournaments.data.slice(0, 5).map((t) => (
                        <Link key={t.id} href={`/tournaments/${t.slug}`} className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-surface-2 transition-colors group/t">
                          <div className="h-6 w-6 shrink-0 rounded img-container overflow-hidden flex items-center justify-center">
                            {t.league?.image_url ? (
                              <SafeImage src={t.league.image_url} alt="" width={16} height={16} className="object-contain" fallbackText={t.league?.name?.[0] || ""} fallbackClassName="text-[8px] font-bold text-text-2" />
                            ) : <span className="text-[8px] font-bold text-text-2">{t.league?.name?.[0]}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-0 truncate group-hover/t:text-accent transition-colors">{t.name}</p>
                            <p className="text-[10px] text-text-2 truncate">{formatDate(t.begin_at)}</p>
                          </div>
                          <TierBadge tier={t.tier} />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4">
                      <p className="text-xs text-text-2 text-center">{t("player.no_tournaments")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── MATCHES TAB ─── */}
          {tab === "matches" && (
            matches.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg skeleton-shimmer" />
                ))}
              </div>
            ) : sortedMatches.length ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {resultFilters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setResultFilter(filter.key)}
                      className={cn(
                        "tab-pill",
                        resultFilter === filter.key && "tab-pill-active"
                      )}
                    >
                      {filter.label}
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ml-1",
                        resultFilter === filter.key ? "bg-white/20 text-white" : "bg-surface-2 text-text-2"
                      )}>
                        {filter.count}
                      </span>
                    </button>
                  ))}
                </div>

                {filteredMatches.length ? (
                  <div className="space-y-2">
                    {filteredMatches.map((match) => (
                      <MatchRow key={match.id} match={match} playerId={p.id} teamId={p.current_team?.id} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title={t("player.no_matches")} description={t("try_filters")} />
                )}
              </div>
            ) : (
              <EmptyState title={t("player.no_matches")} />
            )
          )}

          {/* ─── TOURNAMENTS TAB ─── */}
          {tab === "tournaments" && (
            tournaments.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg skeleton-shimmer" />
                ))}
              </div>
            ) : tournaments.data?.length ? (
              <div className="space-y-2">
                {tournaments.data.map((tournament) => (
                  <TournamentRow key={tournament.id} tournament={tournament} />
                ))}
              </div>
            ) : (
              <EmptyState title={t("player.no_tournaments")} />
            )
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
}
