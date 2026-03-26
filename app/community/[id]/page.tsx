"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Trophy, Gamepad2, MapPin, Calendar, Users,
  Swords, ClipboardEdit, ChevronDown, Check, Loader2,
  UserPlus, Sparkles, Shield, Mail, MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCustomTournament, useTournamentTeams as useTeams,
  useTournamentPlayers as usePlayers, useRegisterTeam,
  type RegisterTeamInput,
} from "@/lib/api/custom-tournaments";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/shared/animated-container";
import { useLocale } from "@/hooks/use-locale";
import { cn, formatDate } from "@/lib/utils";

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

const ROLES = ["IGL", "Entry", "Support", "AWP", "Lurker", "Flex"] as const;

/* ── Reusable form components ── */
function Input({
  value, onChange, placeholder, type = "text", error, maxLength,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; error?: boolean; maxLength?: number;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} maxLength={maxLength}
      className={cn(
        "h-9 w-full rounded-lg border bg-surface-0 px-3 text-xs text-text-0 placeholder:text-text-2/50 outline-none transition-all",
        "focus:border-accent focus:ring-2 focus:ring-accent/15",
        error ? "border-live/50" : "border-border hover:border-border-hover"
      )}
    />
  );
}

function RoleSelect({ value, onChange, error }: {
  value: string; onChange: (v: string) => void; error?: boolean;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border bg-surface-0 px-3 pr-8 text-xs outline-none transition-all",
          "focus:border-accent focus:ring-2 focus:ring-accent/15",
          !value ? "text-text-2/50" : "text-text-0",
          error ? "border-live/50" : "border-border hover:border-border-hover"
        )}
      >
        <option value="" disabled>Role</option>
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
    </div>
  );
}

/* ════════════ PAGE ════════════ */

export default function CommunityTournamentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLocale();
  const [tab, setTab] = useState<"info" | "teams" | "register">("info");

  const { data: tournament, isLoading, isError, refetch } = useCustomTournament(id);
  const teamsQ = useTeams(id);
  const playersQ = usePlayers(id);

  if (isLoading) return <PageSkeleton />;
  if (isError || !tournament) return <ErrorState message="Tournament not found." onRetry={() => refetch()} />;

  const gameColor = GAME_COLORS[tournament.game] || "text-accent";
  const teamCount = teamsQ.data?.length ?? 0;
  const isFull = teamCount >= tournament.max_teams;

  const tabs = [
    { key: "info" as const, label: t("community.tab.info") || "Info" },
    { key: "teams" as const, label: t("community.tab.teams") || "Teams", count: teamCount },
    { key: "register" as const, label: t("community.tab.register") || "Register" },
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-[900px] px-5 py-10">
        {/* Back */}
        <Link href="/tournaments" className="inline-flex items-center gap-1.5 text-xs text-text-2 hover:text-text-0 transition-colors mb-8">
          <ArrowLeft size={13} /> {t("back")}
        </Link>

        {/* ── Header Card ── */}
        <div className="rounded-2xl border border-border bg-surface-1 p-5 sm:p-7 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="h-14 w-14 shrink-0 rounded-xl img-container flex items-center justify-center">
              <Gamepad2 size={28} className={gameColor} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={cn("text-[10px] font-semibold uppercase tracking-wider", gameColor)}>
                  {tournament.game}
                </span>
                <span className="rounded-md bg-accent/8 border border-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                  {tournament.format}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-0">{tournament.name}</h1>
              {tournament.description && (
                <p className="text-xs text-text-2 mt-1 max-w-lg">{tournament.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-text-2">
                <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(tournament.begin_at)}{tournament.end_at ? ` — ${formatDate(tournament.end_at)}` : ""}</span>
                <span className="flex items-center gap-1"><MapPin size={10} /> {tournament.region}</span>
                <span className="flex items-center gap-1"><Users size={10} /> {tournament.team_size}v{tournament.team_size}</span>
                <span className="flex items-center gap-1">
                  <Swords size={10} />
                  <span className={cn(isFull ? "text-live font-semibold" : "")}>
                    {teamCount}/{tournament.max_teams} teams
                  </span>
                </span>
                {tournament.prizepool && (
                  <span className="flex items-center gap-1 text-accent font-semibold"><Trophy size={10} /> {tournament.prizepool}</span>
                )}
              </div>
            </div>
            {!isFull && (
              <button
                onClick={() => setTab("register")}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors shrink-0 mt-2 sm:mt-0 shadow-lg shadow-accent/20"
              >
                <ClipboardEdit size={14} />
                {t("register_now")}
              </button>
            )}
          </div>

          {/* Slots bar */}
          <div className="mt-5 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-text-2 font-medium">Registration slots</span>
              <span className="text-[10px] text-text-2 font-semibold tabular-nums">{teamCount}/{tournament.max_teams}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((teamCount / tournament.max_teams) * 100, 100)}%`,
                  background: isFull ? "var(--live)" : "var(--accent)",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 border-b border-border pb-px overflow-x-auto">
          {tabs.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={cn(
                "relative px-4 py-2.5 text-xs font-semibold transition-all whitespace-nowrap",
                tab === tb.key ? "text-accent" : "text-text-2 hover:text-text-1"
              )}
            >
              {tb.label}
              {tb.count !== undefined && tb.count > 0 && (
                <span className="ml-1.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent tabular-nums">
                  {tb.count}
                </span>
              )}
              {tab === tb.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "info" && <InfoTab tournament={tournament} teamCount={teamCount} />}
            {tab === "teams" && <TeamsTab teamsQ={teamsQ} playersQ={playersQ} teamSize={tournament.team_size} />}
            {tab === "register" && (
              isFull ? (
                <EmptyState title="Registration Full" description="This tournament has reached its maximum team capacity." />
              ) : (
                <RegisterTab tournamentId={id} teamSize={tournament.team_size} onSuccess={() => setTab("teams")} />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

/* ═══════ INFO TAB ═══════ */

function InfoTab({ tournament, teamCount }: {
  tournament: { name: string; game: string; format: string; team_size: number; max_teams: number; prizepool: string | null; begin_at: string; end_at: string | null; description: string | null; region: string; };
  teamCount: number;
}) {
  const rows = [
    { label: "Game", value: tournament.game, icon: <Gamepad2 size={12} /> },
    { label: "Format", value: tournament.format, icon: <Swords size={12} /> },
    { label: "Team Size", value: `${tournament.team_size}v${tournament.team_size}`, icon: <Users size={12} /> },
    { label: "Slots", value: `${teamCount} / ${tournament.max_teams}`, icon: <Shield size={12} /> },
    { label: "Region", value: tournament.region, icon: <MapPin size={12} /> },
    { label: "Start", value: formatDate(tournament.begin_at), icon: <Calendar size={12} /> },
    ...(tournament.end_at ? [{ label: "End", value: formatDate(tournament.end_at), icon: <Calendar size={12} /> }] : []),
    ...(tournament.prizepool ? [{ label: "Prize Pool", value: tournament.prizepool, icon: <Trophy size={12} /> }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Details grid */}
      <div className="rounded-xl border border-border bg-surface-1 overflow-hidden">
        {rows.map((r, i) => (
          <div key={r.label} className={cn("flex items-center justify-between px-5 py-3.5", i !== rows.length - 1 && "border-b border-border/50")}>
            <span className="flex items-center gap-2 text-xs text-text-2">
              <span className="text-text-2/70">{r.icon}</span>
              {r.label}
            </span>
            <span className="text-xs font-semibold text-text-0">{r.value}</span>
          </div>
        ))}
      </div>

      {/* Description */}
      {tournament.description && (
        <div className="rounded-xl border border-border bg-surface-1 p-5">
          <h3 className="text-xs font-bold text-text-0 uppercase tracking-wider mb-2">Description</h3>
          <p className="text-xs text-text-1 leading-relaxed whitespace-pre-wrap">{tournament.description}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════ TEAMS TAB ═══════ */

function TeamsTab({ teamsQ, playersQ, teamSize }: {
  teamsQ: ReturnType<typeof useTeams>;
  playersQ: ReturnType<typeof usePlayers>;
  teamSize: number;
}) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  if (teamsQ.isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-surface-2 animate-pulse" />)}</div>;
  if (teamsQ.isError) return <ErrorState onRetry={() => teamsQ.refetch()} />;
  if (!teamsQ.data?.length) return <EmptyState title="No teams yet" description="Be the first to register!" />;

  const playersByTeam = (playersQ.data ?? []).reduce((acc, p) => {
    (acc[p.team_id] = acc[p.team_id] || []).push(p);
    return acc;
  }, {} as Record<string, typeof playersQ.data>);

  return (
    <StaggerContainer className="space-y-3">
      {teamsQ.data.map((team, i) => {
        const teamPlayers = playersByTeam[team.id] ?? [];
        const isExpanded = expandedTeam === team.id;
        const roster = teamPlayers.filter((p) => !p.is_substitute);
        const subs = teamPlayers.filter((p) => p.is_substitute);

        return (
          <StaggerItem key={team.id}>
            <div className="rounded-xl border border-border bg-surface-1 overflow-hidden transition-all hover:border-border-hover">
              {/* Team header — clickable */}
              <button
                onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                <div className="h-10 w-10 shrink-0 rounded-lg bg-accent/8 ring-1 ring-accent/15 flex items-center justify-center">
                  <span className="text-xs font-bold text-accent">{team.tag}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text-0 truncate">{team.name}</h3>
                    <span className="text-[10px] text-text-2">[{team.tag}]</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-2">
                    <span className="flex items-center gap-1"><Shield size={9} /> {team.captain_name}</span>
                    <span className="flex items-center gap-1"><Users size={9} /> {roster.length}/{teamSize}</span>
                    {subs.length > 0 && <span className="flex items-center gap-1"><UserPlus size={9} /> {subs.length} sub</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">#{i + 1}</span>
                  <ChevronDown size={14} className={cn("text-text-2 transition-transform", isExpanded && "rotate-180")} />
                </div>
              </button>

              {/* Expanded roster */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 border-t border-border/50">
                      {/* Contact info */}
                      <div className="flex flex-wrap gap-3 py-3 text-[10px] text-text-2">
                        <span className="flex items-center gap-1"><Mail size={9} /> {team.captain_email}</span>
                        {team.captain_discord && <span className="flex items-center gap-1"><MessageCircle size={9} /> {team.captain_discord}</span>}
                      </div>

                      {/* Roster table */}
                      {teamPlayers.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border text-[10px] text-text-2 uppercase tracking-wide">
                                <th className="text-left py-2 px-2 w-8">#</th>
                                <th className="text-left py-2 px-2">Player</th>
                                <th className="text-left py-2 px-2">Role</th>
                                <th className="text-left py-2 px-2">Rank</th>
                              </tr>
                            </thead>
                            <tbody>
                              {roster.map((p, pi) => (
                                <tr key={p.id} className="border-b border-border/30">
                                  <td className="py-2 px-2 text-accent font-semibold">{pi + 1}</td>
                                  <td className="py-2 px-2 text-text-0 font-medium">{p.name}</td>
                                  <td className="py-2 px-2">
                                    {p.role ? (
                                      <span className="rounded-md bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-semibold">{p.role}</span>
                                    ) : "—"}
                                  </td>
                                  <td className="py-2 px-2 text-text-1">{p.rank || "—"}</td>
                                </tr>
                              ))}
                              {subs.map((p) => (
                                <tr key={p.id} className="border-b border-border/30 opacity-60">
                                  <td className="py-2 px-2 text-text-2 font-semibold">S</td>
                                  <td className="py-2 px-2 text-text-0 font-medium">{p.name}</td>
                                  <td className="py-2 px-2">
                                    {p.role && <span className="rounded-md bg-surface-2 text-text-2 px-2 py-0.5 text-[10px] font-semibold">{p.role}</span>}
                                  </td>
                                  <td className="py-2 px-2 text-text-1">{p.rank || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-[10px] text-text-2 py-2">No players registered.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}

/* ═══════ REGISTER TAB ═══════ */

interface PlayerField { name: string; role: string; rank: string; }

function RegisterTab({ tournamentId, teamSize, onSuccess }: {
  tournamentId: string; teamSize: number; onSuccess: () => void;
}) {
  const { t } = useLocale();
  const mutation = useRegisterTeam();
  const [success, setSuccess] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [captainEmail, setCaptainEmail] = useState("");
  const [captainDiscord, setCaptainDiscord] = useState("");
  const [players, setPlayers] = useState<PlayerField[]>(
    Array.from({ length: teamSize }, () => ({ name: "", role: "", rank: "" }))
  );
  const [sub, setSub] = useState<PlayerField>({ name: "", role: "", rank: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updatePlayer = (i: number, f: keyof PlayerField, v: string) => {
    setPlayers((prev) => { const n = [...prev]; n[i] = { ...n[i], [f]: v }; return n; });
    setErrors((e) => ({ ...e, [`p_${i}_${f}`]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!teamName.trim()) errs.teamName = t("register.required");
    if (!teamTag.trim()) errs.teamTag = t("register.required");
    else if (teamTag.trim().length < 2 || teamTag.trim().length > 5) errs.teamTag = "2-5 chars";
    if (!captainName.trim()) errs.captainName = t("register.required");
    if (!captainEmail.trim()) errs.captainEmail = t("register.required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(captainEmail)) errs.captainEmail = t("register.email_invalid");
    players.forEach((p, i) => {
      if (!p.name.trim()) errs[`p_${i}_name`] = t("register.required");
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const input: RegisterTeamInput = {
      tournament_id: tournamentId,
      name: teamName.trim(),
      tag: teamTag.trim().toUpperCase(),
      captain_name: captainName.trim(),
      captain_email: captainEmail.trim(),
      captain_discord: captainDiscord.trim() || undefined,
      players: [
        ...players.map((p) => ({ name: p.name, role: p.role || undefined, rank: p.rank || undefined })),
        ...(sub.name.trim() ? [{ name: sub.name, role: sub.role || undefined, rank: sub.rank || undefined, is_substitute: true }] : []),
      ],
    };

    mutation.mutate(input, {
      onSuccess: () => {
        setSuccess(true);
        setTimeout(() => onSuccess(), 2000);
      },
    });
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="relative mb-5"
        >
          <div className="h-16 w-16 rounded-2xl bg-accent/10 ring-2 ring-accent/20 flex items-center justify-center">
            <Check size={30} className="text-accent" strokeWidth={3} />
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="absolute -top-1.5 -right-1.5">
            <Sparkles size={16} className="text-accent" />
          </motion.div>
        </motion.div>
        <p className="text-sm font-bold text-text-0">{t("register.success.title")}</p>
        <p className="text-xs text-text-2 mt-1">{t("register.success.desc")}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Info Section */}
      <div className="rounded-xl border border-border bg-surface-1 p-5">
        <h3 className="text-xs font-bold text-text-0 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Trophy size={13} className="text-accent" />
          {t("register.step.info")}
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-text-1 mb-1.5">{t("register.team_name")} <span className="text-live">*</span></label>
              <Input value={teamName} onChange={setTeamName} placeholder="Team Liquid" error={!!errors.teamName} />
              {errors.teamName && <p className="text-[10px] text-live mt-1">{errors.teamName}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-1 mb-1.5">{t("register.team_tag")} <span className="text-live">*</span></label>
              <Input value={teamTag} onChange={(v) => setTeamTag(v.toUpperCase())} placeholder="TL" error={!!errors.teamTag} maxLength={5} />
              {errors.teamTag && <p className="text-[10px] text-live mt-1">{errors.teamTag}</p>}
            </div>
          </div>
          <div className="h-px bg-border/50" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-text-1 mb-1.5">{t("register.captain_name")} <span className="text-live">*</span></label>
              <Input value={captainName} onChange={setCaptainName} placeholder="John Doe" error={!!errors.captainName} />
              {errors.captainName && <p className="text-[10px] text-live mt-1">{errors.captainName}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-1 mb-1.5">{t("register.captain_email")} <span className="text-live">*</span></label>
              <Input value={captainEmail} onChange={setCaptainEmail} placeholder="captain@team.gg" type="email" error={!!errors.captainEmail} />
              {errors.captainEmail && <p className="text-[10px] text-live mt-1">{errors.captainEmail}</p>}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-1 mb-1.5">{t("register.captain_discord")}</label>
            <Input value={captainDiscord} onChange={setCaptainDiscord} placeholder="johndoe#1234" />
          </div>
        </div>
      </div>

      {/* Roster Section */}
      <div className="rounded-xl border border-border bg-surface-1 p-5">
        <h3 className="text-xs font-bold text-text-0 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users size={13} className="text-accent" />
          {t("register.step.roster")}
        </h3>
        <div className="space-y-3">
          {players.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg border border-border bg-surface-0/50 p-3.5"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-5 w-5 rounded bg-accent/10 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-accent">{i + 1}</span>
                </div>
                <span className="text-[11px] font-semibold text-text-0">
                  {t("register.player")} {i + 1}
                  {i === 0 && <span className="ml-1 text-[10px] text-accent">(Captain)</span>}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] text-text-2 mb-1">Name <span className="text-live">*</span></label>
                  <Input value={p.name} onChange={(v) => updatePlayer(i, "name", v)} placeholder="Player IGN" error={!!errors[`p_${i}_name`]} />
                  {errors[`p_${i}_name`] && <p className="text-[9px] text-live mt-0.5">{errors[`p_${i}_name`]}</p>}
                </div>
                <div>
                  <label className="block text-[10px] text-text-2 mb-1">Role</label>
                  <RoleSelect value={p.role} onChange={(v) => updatePlayer(i, "role", v)} />
                </div>
                <div>
                  <label className="block text-[10px] text-text-2 mb-1">Rank</label>
                  <Input value={p.rank} onChange={(v) => updatePlayer(i, "rank", v)} placeholder="Global Elite" />
                </div>
              </div>
            </motion.div>
          ))}

          {/* Sub */}
          <div className="rounded-lg border border-dashed border-border bg-surface-1/30 p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="h-5 w-5 rounded bg-surface-2 flex items-center justify-center">
                <UserPlus size={10} className="text-text-2" />
              </div>
              <span className="text-[11px] font-semibold text-text-2">{t("register.sub")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] text-text-2 mb-1">Name</label>
                <Input value={sub.name} onChange={(v) => setSub((s) => ({ ...s, name: v }))} placeholder="Substitute" />
              </div>
              <div>
                <label className="block text-[10px] text-text-2 mb-1">Role</label>
                <RoleSelect value={sub.role} onChange={(v) => setSub((s) => ({ ...s, role: v }))} />
              </div>
              <div>
                <label className="block text-[10px] text-text-2 mb-1">Rank</label>
                <Input value={sub.rank} onChange={(v) => setSub((s) => ({ ...s, rank: v }))} placeholder="Rank" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        {mutation.isError && (
          <p className="text-[10px] text-live font-medium">Registration failed. Please try again.</p>
        )}
        {!mutation.isError && <div />}
        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-60 shadow-lg shadow-accent/20"
        >
          {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {t("register.submit")}
        </button>
      </div>
    </div>
  );
}
