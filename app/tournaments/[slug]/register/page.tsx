"use client";

import { use, useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { GameIcon } from "@/components/shared/game-icon";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, Trophy, Users,
  ClipboardCheck, Loader2, UserPlus, ChevronDown, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTournament } from "@/lib/api/tournaments";
import { TierBadge } from "@/components/shared/tier-badge";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { PageTransition } from "@/components/shared/animated-container";
import { useLocale } from "@/hooks/use-locale";
import { cn, formatDate } from "@/lib/utils";

/* ───────── types ───────── */

interface PlayerEntry {
  name: string;
  role: string;
  rank: string;
}

interface FormData {
  teamName: string;
  teamTag: string;
  captainName: string;
  captainEmail: string;
  captainDiscord: string;
  players: PlayerEntry[];
  substitute: PlayerEntry;
  agreeRules: boolean;
}

const ROLES = ["IGL", "Entry", "Support", "AWP", "Lurker", "Flex"] as const;

const initialPlayer: PlayerEntry = { name: "", role: "", rank: "" };

const initialForm: FormData = {
  teamName: "",
  teamTag: "",
  captainName: "",
  captainEmail: "",
  captainDiscord: "",
  players: Array.from({ length: 5 }, () => ({ ...initialPlayer })),
  substitute: { ...initialPlayer },
  agreeRules: false,
};

const steps = [
  { key: "info", icon: Trophy },
  { key: "roster", icon: Users },
  { key: "confirm", icon: ClipboardCheck },
] as const;

/* ───────── reusable components ───────── */

function InputField({
  label, value, onChange, placeholder, type = "text", error, required, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; error?: string; required?: boolean; maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-1 mb-1.5">
        {label} {required && <span className="text-live">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          "h-9 w-full rounded-lg border bg-surface-0 px-3 text-xs text-text-0 placeholder:text-text-2/60 outline-none transition-all",
          "focus:border-accent focus:ring-1 focus:ring-accent/20",
          error ? "border-live/50" : "border-border hover:border-border-hover"
        )}
      />
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] text-live mt-1 font-medium"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

function RoleSelect({
  label, value, onChange, error, required, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-1 mb-1.5">
        {label} {required && <span className="text-live">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-9 w-full appearance-none rounded-lg border bg-surface-0 px-3 pr-8 text-xs outline-none transition-all",
            "focus:border-accent focus:ring-1 focus:ring-accent/20",
            !value ? "text-text-2/60" : "text-text-0",
            error ? "border-live/50" : "border-border hover:border-border-hover"
          )}
        >
          <option value="" disabled>{placeholder || "Select role"}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] text-live mt-1 font-medium"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

/* ───────── step indicator ───────── */

function StepIndicator({
  currentStep,
  t,
}: {
  currentStep: number;
  t: (k: string) => string;
}) {
  return (
    <div className="flex items-center gap-2 mb-8 relative">
      {/* Background line */}
      <div className="hidden sm:block absolute top-[18px] left-[10%] right-[10%] h-px bg-border -z-0" />
      {/* Active line */}
      <div
        className="hidden sm:block absolute top-[18px] left-[10%] h-px bg-accent transition-all duration-500 -z-0"
        style={{ width: `${(Math.min(currentStep, 2) / 2) * 80}%` }}
      />

      {steps.map((s, i) => {
        const Icon = s.icon;
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={s.key} className="flex flex-col items-center gap-2 z-10 flex-1">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-semibold transition-all duration-300",
                done
                  ? "step-completed shadow-lg shadow-accent/20"
                  : active
                  ? "step-active shadow-lg shadow-accent/20"
                  : "bg-surface-2 text-text-2 border border-border"
              )}
            >
              {done ? <Check size={15} /> : <Icon size={15} />}
            </div>
            <span
              className={cn(
                "text-[10px] sm:text-[11px] font-medium transition-colors text-center",
                done || active ? "text-text-0" : "text-text-2"
              )}
            >
              {t(`register.step.${s.key}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── main page ───────── */

export default function TournamentRegister({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: tournament, isLoading, isError, refetch } = useTournament(slug);

  if (isLoading) return <PageSkeleton />;
  if (isError || !tournament) return <ErrorState message="Failed to load tournament." onRetry={() => refetch()} />;

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const updatePlayer = (index: number, field: keyof PlayerEntry, value: string) => {
    setForm((f) => {
      const players = [...f.players];
      players[index] = { ...players[index], [field]: value };
      return { ...f, players };
    });
    setErrors((e) => ({ ...e, [`player_${index}_${field}`]: "" }));
  };

  const updateSub = (field: keyof PlayerEntry, value: string) => {
    setForm((f) => ({ ...f, substitute: { ...f.substitute, [field]: value } }));
  };

  const validateStep0 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.teamName.trim()) errs.teamName = t("register.required");
    if (!form.teamTag.trim()) errs.teamTag = t("register.required");
    else if (form.teamTag.trim().length < 2 || form.teamTag.trim().length > 5) errs.teamTag = "2-5 characters";
    if (!form.captainName.trim()) errs.captainName = t("register.required");
    if (!form.captainEmail.trim()) {
      errs.captainEmail = t("register.required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.captainEmail)) {
      errs.captainEmail = t("register.email_invalid");
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    form.players.forEach((p, i) => {
      if (!p.name.trim()) errs[`player_${i}_name`] = t("register.required");
      if (!p.role) errs[`player_${i}_role`] = t("register.required");
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(s + 1, 2));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!form.agreeRules) {
      setErrors({ agreeRules: t("register.required") });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);
  };

  /* ── success screen ── */
  if (submitted) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-[600px] px-5 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.15, stiffness: 200 }}
              className="relative inline-block mb-6"
            >
              <div className="h-20 w-20 rounded-2xl bg-accent/10 ring-2 ring-accent/20 flex items-center justify-center mx-auto">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Check size={36} className="text-accent" strokeWidth={3} />
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles size={20} className="text-accent" />
              </motion.div>
            </motion.div>

            <h1 className="text-2xl font-bold text-text-0 mb-2">{t("register.success.title")}</h1>
            <p className="text-sm text-text-2 mb-8 max-w-sm mx-auto">{t("register.success.desc")}</p>

            {/* Registration summary card */}
            <div className="rounded-xl border border-border bg-surface-1 p-5 text-left mb-8">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-text-2">{t("register.team_name")}</span>
                  <p className="font-semibold text-text-0 mt-0.5">{form.teamName}</p>
                </div>
                <div>
                  <span className="text-text-2">{t("register.team_tag")}</span>
                  <p className="font-semibold text-text-0 mt-0.5">[{form.teamTag}]</p>
                </div>
                <div>
                  <span className="text-text-2">{t("register.captain_name")}</span>
                  <p className="font-semibold text-text-0 mt-0.5">{form.captainName}</p>
                </div>
                <div>
                  <span className="text-text-2">{t("tournament")}</span>
                  <p className="font-semibold text-text-0 mt-0.5">{tournament.name}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50">
                <span className="text-[10px] text-text-2 uppercase tracking-wider font-medium">{t("roster")}</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.players.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-md bg-accent/8 border border-accent/15 px-2 py-1 text-[10px] font-medium text-accent">
                      <span className="h-4 w-4 rounded bg-accent/15 flex items-center justify-center text-[8px] font-bold">{i + 1}</span>
                      {p.name}
                      {p.role && <span className="text-text-2">· {p.role}</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href={`/tournaments/${slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
            >
              <ArrowLeft size={14} />
              {t("register.back_tournament")}
            </Link>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-[720px] px-5 py-10">
        {/* Back */}
        <Link href={`/tournaments/${slug}`} className="inline-flex items-center gap-1.5 text-xs text-text-2 hover:text-text-0 transition-colors mb-8">
          <ArrowLeft size={13} /> {t("back")}
        </Link>

        {/* Tournament Info Bar */}
        <div className="rounded-2xl border border-border bg-surface-1 p-5 sm:p-6 mb-8">
          <div className="flex items-center gap-4">
            {tournament.league?.image_url && (
              <div className="h-12 w-12 shrink-0 rounded-xl img-container overflow-hidden flex items-center justify-center">
                <SafeImage src={tournament.league.image_url} alt="" width={36} height={36} className="object-contain" fallbackText={tournament.league?.name?.[0] || "?"} fallbackClassName="text-lg font-bold text-text-2" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <TierBadge tier={tournament.tier} />
                <span className="text-[10px] text-text-2 flex items-center gap-1">
                  {tournament.videogame?.slug && <GameIcon slug={tournament.videogame.slug} size={10} className="text-text-2" />}
                  {tournament.videogame?.name}
                </span>
              </div>
              <h2 className="text-lg font-bold text-text-0 truncate">{tournament.name}</h2>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-text-2 flex-wrap">
                <span>{formatDate(tournament.begin_at)} — {formatDate(tournament.end_at)}</span>
                {tournament.prizepool && (
                  <span className="text-accent font-medium flex items-center gap-1">
                    <Trophy size={10} />
                    {tournament.prizepool}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Registration form card */}
        <div className="rounded-2xl border border-border bg-surface-1 p-5 sm:p-8">
          <div className="mb-6">
            <h1 className="text-base font-bold text-text-0">{t("register.title")}</h1>
            <p className="text-xs text-text-2 mt-1">{t("register.subtitle")}</p>
          </div>

          {/* Step Indicator */}
          <StepIndicator currentStep={step} t={t} />

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Step 0: Team Info */}
              {step === 0 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label={t("register.team_name")}
                      value={form.teamName}
                      onChange={(v) => updateField("teamName", v)}
                      placeholder="Team Liquid"
                      error={errors.teamName}
                      required
                    />
                    <InputField
                      label={t("register.team_tag")}
                      value={form.teamTag}
                      onChange={(v) => updateField("teamTag", v.toUpperCase())}
                      placeholder="TL"
                      error={errors.teamTag}
                      required
                      maxLength={5}
                    />
                  </div>

                  <div className="h-px bg-border" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label={t("register.captain_name")}
                      value={form.captainName}
                      onChange={(v) => updateField("captainName", v)}
                      placeholder="John Doe"
                      error={errors.captainName}
                      required
                    />
                    <InputField
                      label={t("register.captain_email")}
                      value={form.captainEmail}
                      onChange={(v) => updateField("captainEmail", v)}
                      placeholder="captain@team.gg"
                      type="email"
                      error={errors.captainEmail}
                      required
                    />
                  </div>
                  <InputField
                    label={t("register.captain_discord")}
                    value={form.captainDiscord}
                    onChange={(v) => updateField("captainDiscord", v)}
                    placeholder="johndoe#1234"
                  />
                </div>
              )}

              {/* Step 1: Roster */}
              {step === 1 && (
                <div className="space-y-3">
                  {form.players.map((player, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="rounded-xl border border-border bg-surface-0/50 p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-6 w-6 rounded-md bg-accent/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-accent">{i + 1}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-text-0">
                          {t("register.player")} {i + 1}
                          {i === 0 && <span className="ml-1.5 text-[10px] text-accent font-medium">(Captain)</span>}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <InputField
                          label={t("register.player_name")}
                          value={player.name}
                          onChange={(v) => updatePlayer(i, "name", v)}
                          placeholder="Player IGN"
                          error={errors[`player_${i}_name`]}
                          required
                        />
                        <RoleSelect
                          label={t("register.player_role")}
                          value={player.role}
                          onChange={(v) => updatePlayer(i, "role", v)}
                          error={errors[`player_${i}_role`]}
                          required
                          placeholder="Select role"
                        />
                        <InputField
                          label={t("register.player_rank")}
                          value={player.rank}
                          onChange={(v) => updatePlayer(i, "rank", v)}
                          placeholder="Global Elite"
                        />
                      </div>
                    </motion.div>
                  ))}

                  {/* Substitute */}
                  <div className="rounded-xl border border-dashed border-border bg-surface-1/30 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-md bg-surface-2 flex items-center justify-center">
                        <UserPlus size={11} className="text-text-2" />
                      </div>
                      <span className="text-[11px] font-semibold text-text-2">{t("register.sub")}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <InputField
                        label={t("register.player_name")}
                        value={form.substitute.name}
                        onChange={(v) => updateSub("name", v)}
                        placeholder="Substitute"
                      />
                      <RoleSelect
                        label={t("register.player_role")}
                        value={form.substitute.role}
                        onChange={(v) => updateSub("role", v)}
                        placeholder="Select role"
                      />
                      <InputField
                        label={t("register.player_rank")}
                        value={form.substitute.rank}
                        onChange={(v) => updateSub("rank", v)}
                        placeholder="Rank"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Confirm */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Team Summary */}
                  <div className="rounded-xl border border-border bg-surface-0/50 p-5">
                    <h3 className="text-xs font-bold text-text-0 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Users size={13} className="text-accent" />
                      {t("register.step.info")}
                    </h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                      <div>
                        <span className="text-text-2">{t("register.team_name")}</span>
                        <p className="font-semibold text-text-0">{form.teamName}</p>
                      </div>
                      <div>
                        <span className="text-text-2">{t("register.team_tag")}</span>
                        <p className="font-semibold text-text-0">[{form.teamTag}]</p>
                      </div>
                      <div>
                        <span className="text-text-2">{t("register.captain_name")}</span>
                        <p className="font-semibold text-text-0">{form.captainName}</p>
                      </div>
                      <div>
                        <span className="text-text-2">{t("register.captain_email")}</span>
                        <p className="font-semibold text-text-0">{form.captainEmail}</p>
                      </div>
                      {form.captainDiscord && (
                        <div>
                          <span className="text-text-2">{t("register.captain_discord")}</span>
                          <p className="font-semibold text-text-0">{form.captainDiscord}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Roster Summary */}
                  <div className="rounded-xl border border-border bg-surface-0/50 p-5">
                    <h3 className="text-xs font-bold text-text-0 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <UserPlus size={13} className="text-accent" />
                      {t("register.step.roster")}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-[10px] text-text-2 uppercase tracking-wide">
                            <th className="text-left py-2 px-2 w-8">#</th>
                            <th className="text-left py-2 px-2">{t("register.player_name")}</th>
                            <th className="text-left py-2 px-2">{t("register.player_role")}</th>
                            <th className="text-left py-2 px-2">{t("register.player_rank")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.players.map((p, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-2.5 px-2 text-accent font-semibold">{i + 1}</td>
                              <td className="py-2.5 px-2 text-text-0 font-medium">{p.name || "—"}</td>
                              <td className="py-2.5 px-2">
                                {p.role ? (
                                  <span className="rounded-md bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-semibold">
                                    {p.role}
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="py-2.5 px-2 text-text-1">{p.rank || "—"}</td>
                            </tr>
                          ))}
                          {form.substitute.name && (
                            <tr className="border-b border-border/50 opacity-60">
                              <td className="py-2.5 px-2 text-text-2 font-semibold">S</td>
                              <td className="py-2.5 px-2 text-text-0 font-medium">{form.substitute.name}</td>
                              <td className="py-2.5 px-2">
                                {form.substitute.role && (
                                  <span className="rounded-md bg-surface-2 text-text-2 px-2 py-0.5 text-[10px] font-semibold">
                                    {form.substitute.role}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-text-1">{form.substitute.rank || "—"}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Agree checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={form.agreeRules}
                        onChange={(e) => updateField("agreeRules", e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          "h-5 w-5 rounded-md border transition-all flex items-center justify-center",
                          form.agreeRules
                            ? "bg-accent border-accent"
                            : "bg-surface-0 border-border group-hover:border-border-hover"
                        )}
                      >
                        {form.agreeRules && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                    <span className="text-xs text-text-1 leading-relaxed">{t("register.agree")}</span>
                  </label>
                  {errors.agreeRules && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-live font-medium -mt-2"
                    >
                      {errors.agreeRules}
                    </motion.p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
            {step > 0 ? (
              <button
                onClick={prev}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-0 px-4 py-2.5 text-xs font-medium text-text-1 hover:border-border-hover hover:text-text-0 transition-all"
              >
                <ArrowLeft size={13} />
                {t("register.prev")}
              </button>
            ) : (
              <div />
            )}

            {step < 2 ? (
              <button
                onClick={next}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
              >
                {t("register.next")}
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting || !form.agreeRules}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-xs font-medium transition-all",
                  !form.agreeRules
                    ? "bg-surface-2 text-text-2 cursor-not-allowed"
                    : "bg-accent text-white hover:bg-accent-hover shadow-lg shadow-accent/20 disabled:opacity-60"
                )}
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {t("register.submit")}
              </button>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
