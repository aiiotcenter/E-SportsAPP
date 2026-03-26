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
  Sparkles,
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
import { StatCard, WinRateCard, RecentFormCard } from "@/components/shared/stat-card";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/shared/animated-container";
import { useLocale } from "@/hooks/use-locale";
import { cn, formatDate, sortMatchesByRecency } from "@/lib/utils";
import { usePlayer, usePlayerMatches, usePlayerTournaments } from "@/lib/api/players";
import type { Match, Opponent, Player, Team, Tournament } from "@/lib/api/types";

type ResultFilter = "finished" | "canceled" | "all";

function resolvePlayerMatchOutcome(match: Match, playerId: number, teamId?: number | null): "W" | "L" | null {
  if (match.status !== "finished" || match.draw || !match.winner_id) return null;

  if (match.winner_type === "Player") {
    return match.winner_id === playerId ? "W" : "L";
  }

  if (
    teamId &&
    match.opponents.some((entry) => entry.type === "Team" && (entry.opponent as Team | undefined)?.id === teamId)
  ) {
    return match.winner_id === teamId ? "W" : "L";
  }

  if (
    match.opponents.some(
      (entry) => entry.type === "Player" && (entry.opponent as Player | undefined)?.id === playerId
    )
  ) {
    return match.winner_id === playerId ? "W" : "L";
  }

  return null;
}

function computePlayerStats(matches: Match[] | undefined, playerId: number | undefined, teamId: number | undefined) {
  if (!matches?.length || !playerId) return { wins: 0, losses: 0, recentForm: [] as ("W" | "L")[] };

  let wins = 0;
  let losses = 0;
  const recentForm: ("W" | "L")[] = [];

  for (const match of matches) {
    const outcome = resolvePlayerMatchOutcome(match, playerId, teamId);
    if (!outcome) continue;

    if (outcome === "W") wins++;
    else losses++;

    if (recentForm.length < 10) recentForm.push(outcome);
  }

  return { wins, losses, recentForm };
}

function HeroPill({ icon, label, accent = false }: { icon: ReactNode; label: string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium",
        accent
          ? "border-accent/25 bg-accent/10 text-accent"
          : "border-border bg-surface-0 text-text-1"
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function ProfilePanel({
  title,
  icon,
  children,
  href,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  href?: string;
}) {
  const card = (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface-1 p-4 transition-all hover:-translate-y-0.5 hover:border-border-hover">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_42%)] opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-2">{title}</span>
          <span className="text-text-2">{icon}</span>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block">
      {card}
    </Link>
  );
}

function DetailRow({ icon, value, accent = false }: { icon: ReactNode; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
        accent ? "bg-accent/10 text-accent" : "bg-surface-0 text-text-0"
      )}
    >
      <span className={cn("shrink-0", accent ? "text-accent" : "text-text-2")}>{icon}</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </div>
  );
}

function MatchParticipant({
  entry,
  highlighted = false,
  align = "left",
}: {
  entry?: Opponent;
  highlighted?: boolean;
  align?: "left" | "right";
}) {
  const entity = entry?.opponent as Team | Player | undefined;
  const isPlayer = entry?.type === "Player";
  const detail = entry?.type === "Team" ? (entity as Team | undefined)?.acronym : null;

  return (
    <div className={cn("flex items-center gap-3 min-w-0", align === "right" && "flex-row-reverse text-right")}>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden ring-1",
          isPlayer ? "rounded-full" : "rounded-xl",
          highlighted ? "bg-accent/10 ring-accent/20" : "img-container"
        )}
      >
        {entity?.image_url ? (
          <SafeImage
            src={entity.image_url}
            alt={entity.name}
            width={44}
            height={44}
            className={cn("h-full w-full", isPlayer ? "object-cover" : "object-contain p-1.5")}
            fallbackText={entity.name[0] || "?"}
            fallbackClassName="text-sm font-bold text-text-2"
          />
        ) : (
          <span className="text-sm font-bold text-text-2">{entity?.name?.[0] || "?"}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-semibold", highlighted ? "text-accent" : "text-text-0")}>
          {entity?.name || "TBD"}
        </p>
        {detail && <p className="truncate text-[10px] text-text-2 uppercase tracking-wide">{detail}</p>}
      </div>
    </div>
  );
}

function RecentMatchSpotlight({
  match,
  playerId,
  teamId,
}: {
  match: Match;
  playerId: number;
  teamId?: number | null;
}) {
  const left = match.opponents?.[0];
  const right = match.opponents?.[1];
  const leftEntity = left?.opponent as Team | Player | undefined;
  const rightEntity = right?.opponent as Team | Player | undefined;
  const leftHighlighted = left?.type === "Player" ? leftEntity?.id === playerId : leftEntity?.id === teamId;
  const rightHighlighted = right?.type === "Player" ? rightEntity?.id === playerId : rightEntity?.id === teamId;
  const outcome = resolvePlayerMatchOutcome(match, playerId, teamId);
  const leftScore = match.results?.[0]?.score ?? 0;
  const rightScore = match.results?.[1]?.score ?? 0;

  return (
    <Link href={`/matches/${match.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-1 p-4 transition-all hover:-translate-y-0.5 hover:border-border-hover">
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-80",
            outcome === "W"
              ? "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_40%)]"
              : outcome === "L"
                ? "bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.12),transparent_40%)]"
                : "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_40%)]"
          )}
        />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={match.status} />
            <div className="flex items-center gap-2 text-[10px] text-text-2">
              {match.videogame?.slug && <GameIcon slug={match.videogame.slug} size={12} className="text-text-2" />}
              <span>{match.videogame?.name}</span>
              <span className="text-text-2/40">|</span>
              <span>BO{match.number_of_games}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)] items-center gap-3">
            <MatchParticipant entry={left} highlighted={leftHighlighted} />

            <div className="rounded-xl border border-border/70 bg-surface-0 px-2 py-3 text-center">
              {match.status === "not_started" ? (
                <span className="text-[10px] font-semibold text-text-2">{formatDate(match.scheduled_at)}</span>
              ) : (
                <div className="flex items-center justify-center gap-1">
                  <span
                    className={cn(
                      "text-xl font-extrabold tabular-nums",
                      leftScore > rightScore ? "text-accent" : match.status === "finished" ? "text-text-2" : "text-text-0"
                    )}
                  >
                    {leftScore}
                  </span>
                  <span className="text-sm font-light text-text-2/40">-</span>
                  <span
                    className={cn(
                      "text-xl font-extrabold tabular-nums",
                      rightScore > leftScore ? "text-accent" : match.status === "finished" ? "text-text-2" : "text-text-0"
                    )}
                  >
                    {rightScore}
                  </span>
                </div>
              )}
            </div>

            <MatchParticipant entry={right} highlighted={rightHighlighted} align="right" />
          </div>

          <div className="mt-4 flex items-start justify-between gap-3 border-t border-border/50 pt-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-text-1">
                {match.league?.name || match.tournament?.name}
              </p>
              <p className="truncate text-[10px] text-text-2">
                {match.serie?.full_name || match.tournament?.name || match.name}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[10px] text-text-2">{formatDate(match.scheduled_at)}</p>
              {outcome && (
                <p className={cn("mt-1 text-[10px] font-semibold", outcome === "W" ? "text-win" : "text-loss")}>
                  {outcome}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TournamentShowcaseCard({ tournament }: { tournament: Tournament }) {
  return (
    <Link href={`/tournaments/${tournament.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-1 p-4 transition-all hover:-translate-y-0.5 hover:border-border-hover">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_40%)] opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] text-text-2">
                {tournament.league?.image_url && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md img-container">
                    <SafeImage
                      src={tournament.league.image_url}
                      alt={tournament.league.name || ""}
                      width={14}
                      height={14}
                      className="object-contain"
                      fallbackText={tournament.league?.name?.[0] || "?"}
                      fallbackClassName="text-[8px] font-bold text-text-2"
                    />
                  </div>
                )}
                <span className="truncate">{tournament.league?.name}</span>
              </div>

              <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-text-0">{tournament.name}</h3>

              {tournament.serie?.full_name && (
                <p className="mt-1 line-clamp-2 text-[11px] text-text-2">{tournament.serie.full_name}</p>
              )}
            </div>

            <TierBadge tier={tournament.tier} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded-lg border border-border/70 bg-surface-0 px-2 py-1 text-text-2">
              {formatDate(tournament.begin_at)} - {formatDate(tournament.end_at)}
            </span>

            {tournament.prizepool && (
              <span className="rounded-lg bg-accent/10 px-2 py-1 font-semibold text-accent">
                {tournament.prizepool}
              </span>
            )}

            {tournament.videogame?.slug && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface-0 px-2 py-1 text-text-2">
                <GameIcon slug={tournament.videogame.slug} size={12} className="text-text-2" />
                {tournament.videogame.name}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end text-text-2 transition-colors group-hover:text-accent">
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}

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
    return sortedMatches.filter((match) => match.status === resultFilter);
  }, [resultFilter, sortedMatches]);

  const stats = useMemo(
    () => computePlayerStats(sortedMatches, p?.id, p?.current_team?.id),
    [sortedMatches, p?.id, p?.current_team?.id]
  );

  const resultFilters = useMemo(
    () => [
      {
        key: "finished" as const,
        label: t("matches.filter.finished"),
        count: sortedMatches.filter((match) => match.status === "finished").length,
      },
      {
        key: "canceled" as const,
        label: t("matches.filter.canceled"),
        count: sortedMatches.filter((match) => match.status === "canceled").length,
      },
      {
        key: "all" as const,
        label: t("matches.filter.all"),
        count: sortedMatches.length,
      },
    ],
    [sortedMatches, t]
  );

  const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  const showFullName = Boolean(fullName) && fullName.toLowerCase() !== p?.name.toLowerCase();
  const overviewMatches = sortedMatches.slice(0, 4);
  const overviewTournaments = tournaments.data?.slice(0, 4) ?? [];

  if (isLoading) return <ProfileSkeleton />;
  if (isError || !p) return <ErrorState message="Failed to load player." onRetry={() => refetch()} />;

  const tabItems = [
    { key: "overview", label: t("player.overview") },
    { key: "matches", label: t("player.matches") },
    { key: "tournaments", label: t("player.tournaments") },
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1200px] px-5 py-10">
        <Link
          href="/players"
          className="mb-8 inline-flex items-center gap-1.5 text-xs text-text-2 transition-colors hover:text-text-0"
        >
          <ArrowLeft size={13} /> {t("back")}
        </Link>

        <div className="relative mb-8 overflow-hidden rounded-[28px] border border-border bg-surface-1 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_32%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[26px] bg-surface-0 ring-1 ring-border">
                {p.image_url ? (
                  <SafeImage
                    src={p.image_url}
                    alt={p.name}
                    width={112}
                    height={112}
                    className="h-full w-full object-cover"
                    fallbackText={p.name[0] || "?"}
                    fallbackClassName="text-3xl font-bold text-text-2"
                  />
                ) : (
                  <span className="text-3xl font-bold text-text-2">{p.name[0] || "?"}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {p.role && <HeroPill icon={<User size={12} />} label={p.role} accent />}
                  {p.current_videogame && (
                    <HeroPill
                      icon={<GameIcon slug={p.current_videogame.slug || ""} size={12} />}
                      label={p.current_videogame.name}
                    />
                  )}
                </div>

                <h1 className="mt-4 text-2xl font-bold tracking-tight text-text-0 sm:text-3xl">{p.name}</h1>

                {showFullName && <p className="mt-1 text-sm text-text-2">{fullName}</p>}

                <div className="mt-4 flex flex-wrap gap-2">
                  {p.nationality && <HeroPill icon={<Flag size={12} />} label={p.nationality.toUpperCase()} />}
                  {p.age && <HeroPill icon={<Sparkles size={12} />} label={String(p.age)} />}
                  {p.birthday && <HeroPill icon={<CalendarDays size={12} />} label={formatDate(p.birthday)} />}
                </div>

                {p.current_team && (
                  <Link
                    href={`/teams/${p.current_team.slug}`}
                    className="mt-5 inline-flex items-center gap-3 rounded-xl border border-border bg-surface-0 px-3 py-2 text-sm text-text-0 transition-all hover:border-border-hover hover:bg-surface-0"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg img-container">
                      {p.current_team.image_url ? (
                        <SafeImage
                          src={p.current_team.image_url}
                          alt={p.current_team.name}
                          width={24}
                          height={24}
                          className="object-contain"
                          fallbackText={p.current_team.name[0] || "?"}
                          fallbackClassName="text-[10px] font-bold text-text-2"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-text-2">{p.current_team.name[0] || "?"}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-2">{t("player.stats.team")}</p>
                      <p className="truncate font-medium text-text-0">{p.current_team.name}</p>
                    </div>

                    <ChevronRight size={14} className="ml-auto shrink-0 text-text-2" />
                  </Link>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[320px] lg:grid-cols-1">
              {p.current_team && (
                <div className="rounded-2xl border border-border bg-surface-0/70 p-4 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-2">{t("player.stats.team")}</p>
                  <p className="mt-2 truncate text-sm font-semibold text-text-0">{p.current_team.name}</p>
                  {p.current_team.acronym && <p className="text-[10px] text-text-2">{p.current_team.acronym}</p>}
                </div>
              )}

              {p.current_videogame && (
                <div className="rounded-2xl border border-border bg-surface-0/70 p-4 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-2">{t("games")}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-text-0">
                    <GameIcon slug={p.current_videogame.slug || ""} size={14} className="text-text-1" />
                    {p.current_videogame.name}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-surface-0/70 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-2">{t("player.career")}</p>
                <div className="mt-2 space-y-2">
                  {p.role && <DetailRow icon={<User size={13} />} value={p.role} accent />}
                  {p.nationality && <DetailRow icon={<Flag size={13} />} value={p.nationality.toUpperCase()} />}
                  {p.age && <DetailRow icon={<Sparkles size={13} />} value={String(p.age)} />}
                  {p.birthday && <DetailRow icon={<CalendarDays size={13} />} value={formatDate(p.birthday)} />}
                </div>
              </div>
            </div>
          </div>
        </div>

        <StaggerContainer className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StaggerItem>
            <StatCard label={t("player.stats.matches")} value={sortedMatches.length} icon={<Swords size={14} />} />
          </StaggerItem>
          <StaggerItem>
            <WinRateCard label={t("player.stats.winrate")} wins={stats.wins} losses={stats.losses} />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label={t("player.stats.tournaments")}
              value={tournaments.data?.length ?? 0}
              icon={<Trophy size={14} />}
              accent
            />
          </StaggerItem>
          <StaggerItem>
            <RecentFormCard label={t("team.stats.recent")} results={stats.recentForm} />
          </StaggerItem>
        </StaggerContainer>

        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border pb-px">
          {tabItems.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={cn(
                "whitespace-nowrap rounded-t-md px-4 py-2 text-xs font-medium transition-colors",
                tab === tb.key ? "border-b-2 border-accent bg-surface-2 text-text-0" : "text-text-2 hover:text-text-1"
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {tab === "overview" && (
            <div className="space-y-8">
              <section>
                <h2 className="mb-3 text-sm font-semibold text-text-0">{t("player.career")}</h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {p.current_team && (
                    <ProfilePanel title={t("player.stats.team")} icon={<Shield size={14} />} href={`/teams/${p.current_team.slug}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl img-container">
                          {p.current_team.image_url ? (
                            <SafeImage
                              src={p.current_team.image_url}
                              alt={p.current_team.name}
                              width={28}
                              height={28}
                              className="object-contain"
                              fallbackText={p.current_team.name[0] || "?"}
                              fallbackClassName="text-xs font-bold text-text-2"
                            />
                          ) : (
                            <span className="text-xs font-bold text-text-2">{p.current_team.name[0] || "?"}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-text-0">{p.current_team.name}</p>
                          {p.current_team.acronym && (
                            <p className="truncate text-[10px] uppercase tracking-wide text-text-2">{p.current_team.acronym}</p>
                          )}
                        </div>

                        <ChevronRight size={14} className="shrink-0 text-text-2 transition-colors group-hover:text-accent" />
                      </div>
                    </ProfilePanel>
                  )}

                  {p.current_videogame && (
                    <ProfilePanel title={t("games")} icon={<GameIcon slug={p.current_videogame.slug || ""} size={14} />}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl img-container text-text-1">
                          <GameIcon slug={p.current_videogame.slug || ""} size={18} className="text-text-1" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-0">{p.current_videogame.name}</p>
                          <p className="text-[10px] uppercase tracking-wide text-text-2">{p.current_videogame.slug}</p>
                        </div>
                      </div>
                    </ProfilePanel>
                  )}

                  {(p.role || p.nationality || p.age || p.birthday) && (
                    <ProfilePanel title={t("player.career")} icon={<Sparkles size={14} />}>
                      <div className="space-y-2">
                        {p.role && <DetailRow icon={<User size={14} />} value={p.role} accent />}
                        {p.nationality && <DetailRow icon={<Flag size={14} />} value={p.nationality.toUpperCase()} />}
                        {p.age && <DetailRow icon={<Sparkles size={14} />} value={String(p.age)} />}
                        {p.birthday && <DetailRow icon={<CalendarDays size={14} />} value={formatDate(p.birthday)} />}
                      </div>
                    </ProfilePanel>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-text-0">{t("recent_matches")}</h2>
                  <button
                    onClick={() => setTab("matches")}
                    className="text-[11px] text-text-2 transition-colors hover:text-accent"
                  >
                    {t("view_all")}
                  </button>
                </div>

                {matches.isLoading ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-40 rounded-2xl bg-surface-2 animate-pulse" />
                    ))}
                  </div>
                ) : overviewMatches.length ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {overviewMatches.map((match) => (
                      <RecentMatchSpotlight
                        key={match.id}
                        match={match}
                        playerId={p.id}
                        teamId={p.current_team?.id}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title={t("player.no_matches")} />
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-text-0">{t("tournament_history")}</h2>
                  <button
                    onClick={() => setTab("tournaments")}
                    className="text-[11px] text-text-2 transition-colors hover:text-accent"
                  >
                    {t("view_all")}
                  </button>
                </div>

                {tournaments.isLoading ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-40 rounded-2xl bg-surface-2 animate-pulse" />
                    ))}
                  </div>
                ) : overviewTournaments.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {overviewTournaments.map((tournament) => (
                      <TournamentShowcaseCard key={tournament.id} tournament={tournament} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title={t("player.no_tournaments")} />
                )}
              </section>
            </div>
          )}

          {tab === "matches" && (
            matches.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-surface-2 animate-pulse" />
                ))}
              </div>
            ) : sortedMatches.length ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {resultFilters.map((filter) => {
                    const active = resultFilter === filter.key;

                    return (
                      <button
                        key={filter.key}
                        onClick={() => setResultFilter(filter.key)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                          active
                            ? "border-accent/20 bg-accent/10 text-accent"
                            : "border-border bg-surface-1 text-text-2 hover:border-border-hover hover:text-text-1"
                        )}
                      >
                        <span>{filter.label}</span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                            active ? "bg-accent/10 text-accent" : "bg-surface-0 text-text-2"
                          )}
                        >
                          {filter.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {filteredMatches.length ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {filteredMatches.map((match) => (
                      <MatchCard key={match.id} match={match} />
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

          {tab === "tournaments" && (
            tournaments.isLoading ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-2xl bg-surface-2 animate-pulse" />
                ))}
              </div>
            ) : tournaments.data?.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {tournaments.data.map((tournament) => (
                  <TournamentShowcaseCard key={tournament.id} tournament={tournament} />
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
