"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SafeImage } from "@/components/shared/safe-image";
import { Search, X, Loader2, Clock } from "lucide-react";
import { apiGet } from "@/lib/api/client";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocale } from "@/hooks/use-locale";
import type { Team, Player, Tournament, Match } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

type CategoryType = "all" | "team" | "player" | "tournament" | "match";

type ResultItem =
  | { type: "team"; data: Team }
  | { type: "player"; data: Player }
  | { type: "tournament"; data: Tournament }
  | { type: "match"; data: Match };

interface RecentSearch {
  query: string;
  timestamp: number;
  type?: CategoryType;
  targetPath?: string;
  label?: string;
}

const RECENT_SEARCHES_KEY = "esports-recent-searches";
const MAX_RECENT = 5;
const RESULTS_PER_CATEGORY = 4;

function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(item: RecentSearch) {
  try {
    const existing = getRecentSearches();
    const filtered = existing.filter(
      (s) => s.query !== item.query || s.targetPath !== item.targetPath
    );
    const updated = [item, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // silently fail
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // silently fail
  }
}

// Highlight matching text
function HighlightText({ text, query }: { text: string | null | undefined; query: string }) {
  if (!text || !query || query.length < 2) return <>{text || ""}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-accent/20 text-accent rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const categoryTabs: { key: CategoryType; labelKey: string }[] = [
  { key: "all", labelKey: "search.category.all" },
  { key: "team", labelKey: "search.category.teams" },
  { key: "player", labelKey: "search.category.players" },
  { key: "tournament", labelKey: "search.category.tournaments" },
  { key: "match", labelKey: "search.category.matches" },
];

// --- Popularity ranking helpers ---
function rankTeam(t: Team): number {
  let score = 0;
  if (t.image_url) score += 10;
  if (t.current_videogame) score += 5;
  if (t.players?.length) score += 3;
  return score;
}

function rankPlayer(p: Player): number {
  let score = 0;
  if (p.image_url) score += 10;
  if (p.current_team) score += 5;
  if (p.role) score += 2;
  return score;
}

const tierScore: Record<string, number> = { s: 50, a: 40, b: 30, c: 20, d: 10, unranked: 0 };
function rankTournament(t: Tournament): number {
  let score = tierScore[t.tier || "unranked"] || 0;
  if (t.league?.image_url) score += 5;
  if (t.prizepool) score += 10;
  return score;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState(0);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const debouncedQuery = useDebounce(query, 400);

  // Focus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setTeams([]);
      setPlayers([]);
      setTournaments([]);
      setMatches([]);
      setSelected(0);
      setActiveCategory("all");
      setRecentSearches(getRecentSearches());
    } else {
      // Abort any in-flight search when modal closes
      abortRef.current?.abort();
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Ctrl+K
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") e.preventDefault();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Search with abort controller and popularity sorting
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setTeams([]); setPlayers([]); setTournaments([]); setMatches([]);
      return;
    }

    // Abort previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    Promise.allSettled([
      apiGet<Team[]>("/teams", { "search[name]": debouncedQuery, "page[size]": 8, sort: "-modified_at" }),
      apiGet<Player[]>("/players", { "search[name]": debouncedQuery, "page[size]": 8, sort: "-modified_at" }),
      apiGet<Tournament[]>("/tournaments", { "search[name]": debouncedQuery, "page[size]": 8, sort: "-modified_at" }),
      apiGet<Match[]>("/matches", { "search[name]": debouncedQuery, "page[size]": 5, sort: "-scheduled_at" }),
    ]).then(([teamsRes, playersRes, tournamentsRes, matchesRes]) => {
      if (controller.signal.aborted) return;

      // Sort by popularity score (higher = more prominent)
      const rawTeams = teamsRes.status === "fulfilled" ? teamsRes.value : [];
      const rawPlayers = playersRes.status === "fulfilled" ? playersRes.value : [];
      const rawTournaments = tournamentsRes.status === "fulfilled" ? tournamentsRes.value : [];

      setTeams([...rawTeams].sort((a, b) => rankTeam(b) - rankTeam(a)));
      setPlayers([...rawPlayers].sort((a, b) => rankPlayer(b) - rankPlayer(a)));
      setTournaments([...rawTournaments].sort((a, b) => rankTournament(b) - rankTournament(a)));
      setMatches(matchesRes.status === "fulfilled" ? matchesRes.value : []);
      setSelected(0);
      setLoading(false);
    });

    return () => { controller.abort(); };
  }, [debouncedQuery]);

  // Build grouped results for "all" view
  const groupedResults = useMemo(() => {
    if (activeCategory !== "all") return null;
    const groups: { type: CategoryType; label: string; items: ResultItem[] }[] = [];
    if (teams.length > 0) groups.push({ type: "team", label: "search.category.teams", items: teams.slice(0, RESULTS_PER_CATEGORY).map((d) => ({ type: "team" as const, data: d })) });
    if (players.length > 0) groups.push({ type: "player", label: "search.category.players", items: players.slice(0, RESULTS_PER_CATEGORY).map((d) => ({ type: "player" as const, data: d })) });
    if (tournaments.length > 0) groups.push({ type: "tournament", label: "search.category.tournaments", items: tournaments.slice(0, RESULTS_PER_CATEGORY).map((d) => ({ type: "tournament" as const, data: d })) });
    if (matches.length > 0) groups.push({ type: "match", label: "search.category.matches", items: matches.slice(0, RESULTS_PER_CATEGORY).map((d) => ({ type: "match" as const, data: d })) });
    return groups;
  }, [teams, players, tournaments, matches, activeCategory]);

  // Filtered results for specific tab
  const filteredResults = useMemo((): ResultItem[] => {
    if (activeCategory === "all") return [];
    const map: Record<string, ResultItem[]> = {
      team: teams.map((d) => ({ type: "team" as const, data: d })),
      player: players.map((d) => ({ type: "player" as const, data: d })),
      tournament: tournaments.map((d) => ({ type: "tournament" as const, data: d })),
      match: matches.map((d) => ({ type: "match" as const, data: d })),
    };
    return map[activeCategory] || [];
  }, [teams, players, tournaments, matches, activeCategory]);

  // Flat list for keyboard nav
  const flatResults = useMemo(() => {
    if (activeCategory === "all" && groupedResults) return groupedResults.flatMap((g) => g.items);
    return filteredResults;
  }, [groupedResults, filteredResults, activeCategory]);

  const totalResults = teams.length + players.length + tournaments.length + matches.length;
  const counts = { all: totalResults, team: teams.length, player: players.length, tournament: tournaments.length, match: matches.length };

  const navigate = useCallback((item: ResultItem) => {
    let path = "";
    let label = "";
    if (item.type === "team") { path = `/teams/${item.data.slug}`; label = (item.data as Team).name; }
    else if (item.type === "player") { path = `/players/${(item.data as Player).slug}`; label = (item.data as Player).name; }
    else if (item.type === "tournament") { path = `/tournaments/${(item.data as Tournament).id}`; label = (item.data as Tournament).name; }
    else { path = `/matches/${(item.data as Match).id}`; label = (item.data as Match).name; }

    saveRecentSearch({ query: query || label, timestamp: Date.now(), type: item.type, targetPath: path, label });
    onClose();
    router.push(path);
  }, [router, onClose, query]);

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, flatResults.length - 1));
      setTimeout(() => {
        resultsRef.current?.querySelector(`[data-index="${Math.min(selected + 1, flatResults.length - 1)}"]`)?.scrollIntoView({ block: "nearest" });
      }, 0);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
      setTimeout(() => {
        resultsRef.current?.querySelector(`[data-index="${Math.max(selected - 1, 0)}"]`)?.scrollIntoView({ block: "nearest" });
      }, 0);
    }
    if (e.key === "Enter" && flatResults[selected]) navigate(flatResults[selected]);
    if (e.key === "Tab") {
      e.preventDefault();
      const cats: CategoryType[] = ["all", "team", "player", "tournament", "match"];
      const idx = cats.indexOf(activeCategory);
      setActiveCategory(e.shiftKey ? cats[(idx - 1 + cats.length) % cats.length] : cats[(idx + 1) % cats.length]);
      setSelected(0);
    }
  };

  const handleRecentClick = (recent: RecentSearch) => {
    if (recent.targetPath) { onClose(); router.push(recent.targetPath); }
    else setQuery(recent.query);
  };

  const hasQuery = debouncedQuery.length >= 2;
  const hasResults = totalResults > 0;
  const showRecent = !hasQuery && recentSearches.length > 0;

  if (!open) return null;

  // Get display info for a result item
  const getItemInfo = (item: ResultItem) => {
    if (item.type === "team") {
      const d = item.data as Team;
      return { name: d.name, img: d.image_url, sub: d.current_videogame?.name, id: d.id };
    }
    if (item.type === "player") {
      const d = item.data as Player;
      return { name: d.name, img: d.image_url, sub: d.current_team?.name, id: d.id };
    }
    if (item.type === "tournament") {
      const d = item.data as Tournament;
      return { name: d.name, img: d.league?.image_url, sub: d.videogame?.name, id: d.id };
    }
    const d = item.data as Match;
    const opp1 = d.opponents?.[0]?.opponent;
    const opp2 = d.opponents?.[1]?.opponent;
    const name = opp1 && opp2 ? `${opp1.name} vs ${opp2.name}` : d.name;
    const sub = [
      d.videogame?.name,
      d.status === "running" ? "LIVE" : d.status === "finished" ? `${d.results?.[0]?.score ?? 0}-${d.results?.[1]?.score ?? 0}` : "",
    ].filter(Boolean).join(" · ");
    return { name, img: d.league?.image_url, sub, id: d.id };
  };

  const renderItem = (item: ResultItem, idx: number) => {
    const { name, img, sub, id } = getItemInfo(item);
    const isLive = item.type === "match" && (item.data as Match).status === "running";

    return (
      <button
        key={`${item.type}-${id}`}
        data-index={idx}
        onClick={() => navigate(item)}
        onMouseEnter={() => setSelected(idx)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          idx === selected ? "bg-surface-2" : "hover:bg-surface-1"
        )}
      >
        <div className="h-7 w-7 shrink-0 rounded-lg img-container overflow-hidden flex items-center justify-center">
          {img ? (
            <SafeImage src={img} alt="" width={20} height={20} className="object-contain" fallbackText={name?.[0] || "?"} fallbackClassName="text-[9px] font-bold text-text-2" />
          ) : (
            <span className="text-[9px] font-bold text-text-2">{name?.[0]}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-0 truncate">
            <HighlightText text={name} query={debouncedQuery} />
          </p>
          {sub && <p className="text-[10px] text-text-2 truncate">{sub}</p>}
        </div>
        {isLive ? (
          <span className="text-[9px] font-bold text-red-500 bg-red-500/10 rounded-full px-2 py-0.5 shrink-0 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        ) : (
          <span className="text-[10px] text-text-2 capitalize shrink-0 bg-surface-2 rounded px-1.5 py-0.5">
            {item.type}
          </span>
        )}
      </button>
    );
  };

  let gIdx = 0;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative mx-auto mt-[15vh] w-[calc(100%-2rem)] max-w-lg">
        <div className="rounded-2xl border border-border bg-surface-1 shadow-xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-border px-4 h-12">
            <Search size={15} className="text-text-2 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("search.placeholder")}
              className="flex-1 bg-transparent text-sm text-text-0 placeholder:text-text-2 outline-none"
            />
            {loading && <Loader2 size={14} className="text-text-2 animate-spin shrink-0" />}
            {query ? (
              <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="text-text-2 hover:text-text-0 transition-colors shrink-0">
                <X size={15} />
              </button>
            ) : (
              <button onClick={onClose} className="text-text-2 hover:text-text-0 transition-colors shrink-0">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          {hasQuery && hasResults && (
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border overflow-x-auto">
              {categoryTabs.map((tab) => {
                const count = counts[tab.key];
                const isActive = activeCategory === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveCategory(tab.key); setSelected(0); }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-surface-2 text-text-0"
                        : "text-text-2 hover:text-text-1 hover:bg-surface-1"
                    )}
                  >
                    {t(tab.labelKey)}
                    {count > 0 && (
                      <span
                        className={cn(
                          "inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[10px] font-semibold",
                          isActive
                            ? "bg-accent text-white"
                            : "bg-surface-2 text-text-2"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Results */}
          <div ref={resultsRef} className="max-h-80 overflow-y-auto">
            {/* Recent searches */}
            {showRecent && (
              <>
                <div className="flex items-center justify-between px-4 pt-4 pb-1.5">
                  <span className="text-[10px] font-medium text-text-2 uppercase tracking-wide flex items-center gap-1">
                    <Clock size={9} />
                    {t("search.recent")}
                  </span>
                  <button onClick={() => { clearRecentSearches(); setRecentSearches([]); }} className="text-[10px] text-text-2 hover:text-text-0 transition-colors">
                    {t("search.clear_recent")}
                  </button>
                </div>
                {recentSearches.map((recent, i) => (
                  <button
                    key={`${recent.query}-${i}`}
                    onClick={() => handleRecentClick(recent)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-1 transition-colors"
                  >
                    <div className="h-7 w-7 shrink-0 rounded-md bg-surface-2 flex items-center justify-center">
                      <Clock size={11} className="text-text-2" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-0 truncate">{recent.label || recent.query}</p>
                      {recent.type && recent.type !== "all" && (
                        <p className="text-[10px] text-text-2 capitalize">{recent.type}</p>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Hint */}
            {!hasQuery && !showRecent && (
              <div className="py-8 text-center text-xs text-text-2">{t("search.hint")}</div>
            )}

            {/* Loading */}
            {hasQuery && loading && !hasResults && (
              <div className="py-4 px-4 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-7 w-7 rounded-md bg-surface-2" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-28 rounded bg-surface-2" />
                      <div className="h-2 w-16 rounded bg-surface-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {hasQuery && !loading && !hasResults && (
              <div className="py-8 text-center text-xs text-text-2">{t("search.no_results")}</div>
            )}

            {/* Grouped results (all tab) */}
            {hasQuery && !loading && hasResults && activeCategory === "all" && groupedResults && (
              <>
                {groupedResults.map((group, gi) => (
                  <div key={group.type}>
                    {gi > 0 && <div className="mx-4 border-t border-border" />}
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold text-text-2 uppercase tracking-wider">
                        {t(group.label)}
                      </span>
                    </div>
                    {group.items.map((item) => {
                      const rendered = renderItem(item, gIdx);
                      gIdx++;
                      return rendered;
                    })}
                  </div>
                ))}
                <div className="h-1" />
              </>
            )}

            {/* Filtered results (specific tab) */}
            {hasQuery && !loading && hasResults && activeCategory !== "all" && (
              <>
                {filteredResults.map((item, i) => renderItem(item, i))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-text-2 flex items-center gap-1.5">
                <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5 text-[9px] font-mono">&uarr;&darr;</kbd>
                {t("search.navigate")}
              </span>
              <span className="text-[10px] text-text-2 flex items-center gap-1.5">
                <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5 text-[9px] font-mono">Enter</kbd>
                {t("search.select")}
              </span>
              <span className="text-[10px] text-text-2 flex items-center gap-1.5">
                <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5 text-[9px] font-mono">Tab</kbd>
                {t("search.switch_tab")}
              </span>
            </div>
            <span className="text-[10px] text-text-2">
              <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5 text-[9px] font-mono">Esc</kbd>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
