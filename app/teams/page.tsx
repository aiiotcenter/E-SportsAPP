"use client";

import { Suspense, useState, useMemo } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/shared/safe-image";
import { GameIcon } from "@/components/shared/game-icon";
import { useTeamsPaginated } from "@/lib/api/teams";
import { GameFilter } from "@/components/shared/game-filter";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/shared/animated-container";
import { useGameFilter } from "@/hooks/use-game-filter";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocale } from "@/hooks/use-locale";
import type { QueryParams, Team } from "@/lib/api/types";

const PAGE_SIZE = 30;

function Content() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 400);
  const { activeGame } = useGameFilter();

  const params: QueryParams = {
    ...(q ? { "search[name]": q } : {}),
  };

  const { data, isLoading, isError, refetch } = useTeamsPaginated(page, PAGE_SIZE, activeGame || undefined, params);
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  // Client-side re-sort: prioritize teams with images and active videogame
  const sortedTeams = useMemo(() => {
    if (!data?.data) return [];
    return [...data.data].sort((a: Team, b: Team) => {
      const scoreA = (a.image_url ? 10 : 0) + (a.current_videogame ? 5 : 0) + (a.players?.length ? 3 : 0);
      const scoreB = (b.image_url ? 10 : 0) + (b.current_videogame ? 5 : 0) + (b.players?.length ? 3 : 0);
      return scoreB - scoreA;
    });
  }, [data?.data]);

  // Reset page when search changes
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1200px] px-5 py-10">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-lg font-semibold text-text-0">{t("teams.title")}</h1>
          {data && data.total > 0 && (
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-2 tabular-nums">{data.total}</span>
          )}
        </div>
        <p className="text-xs text-text-2 mb-6">{t("teams.subtitle")}</p>

        <div className="mb-4"><GameFilter /></div>
        <div className="mb-6"><SearchInput value={search} onChange={handleSearch} placeholder={t("search_teams")} className="max-w-xs" /></div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 15 }).map((_, i) => <CardSkeleton key={i} className="h-28" />)}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : sortedTeams.length ? (
          <>
            <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sortedTeams.map((team) => (
                <StaggerItem key={team.id}>
                  <Link href={`/teams/${team.slug}`} className="block h-full">
                    <div className="card-hover flex h-full min-h-[156px] flex-col rounded-xl border border-border bg-surface-1 p-4 text-center hover:border-border-hover">
                      <div className="h-10 w-10 mx-auto rounded-md img-container overflow-hidden flex items-center justify-center mb-2">
                        {team.image_url ? <SafeImage src={team.image_url} alt={team.name} width={32} height={32} className="object-contain" fallbackText={team.acronym?.[0] || "?"} fallbackClassName="text-[10px] font-bold text-text-2" /> :
                          <span className="text-[10px] font-bold text-text-2">{team.acronym?.[0] || "?"}</span>}
                      </div>
                      <p className="text-xs font-medium text-text-0 truncate">{team.name}</p>
                      <div className="mt-auto pt-3">
                      {team.current_videogame && (
                        <p className="text-[10px] text-text-2 mt-0.5 flex items-center justify-center gap-1">
                          <GameIcon slug={team.current_videogame.slug || ""} size={10} className="text-text-2" />
                          {team.current_videogame.name}
                        </p>
                      )}
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={data?.total ?? 0}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState title={t("nothing_here")} description={t("try_filters")} />
        )}
      </div>
    </PageTransition>
  );
}

export default function TeamsPage() {
  return <Suspense><Content /></Suspense>;
}
