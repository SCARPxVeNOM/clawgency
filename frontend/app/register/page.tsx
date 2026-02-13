"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowRight, Camera, CheckCircle2, Loader2,
  Building2, UserCircle, Wallet, Instagram, Send, AtSign,
  Mail, User, Shield, Sparkles
} from "lucide-react";
import { RegistrableRole, useSession } from "@/context/SessionContext";

const MAX_AVATAR_BYTES = 1024 * 1024;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterPage() {
  const router = useRouter();
  const { walletAddress, isConnected, profile, registerProfile, isAdminWallet, isProfileLoading } = useSession();

  const [role, setRole] = useState<RegistrableRole>("brand");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telegram, setTelegram] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setRole(profile.role);
    setDisplayName(profile.displayName);
    setEmail(profile.email);
    setInstagram(profile.instagram);
    setTelegram(profile.telegram);
    setXHandle(profile.x);
    setAvatarDataUrl(profile.avatarDataUrl);
  }, [profile]);

  const submitDisabled = useMemo(() => {
    if (!isConnected || !walletAddress || saving || isProfileLoading) {
      return true;
    }

    const requiredReady =
      displayName.trim().length > 0 &&
      email.trim().length > 0 &&
      instagram.trim().length > 0 &&
      telegram.trim().length > 0 &&
      xHandle.trim().length > 0;

    if (!requiredReady) {
      return true;
    }

    if (!isValidEmail(email.trim())) {
      return true;
    }

    return false;
  }, [isConnected, walletAddress, saving, isProfileLoading, displayName, email, instagram, telegram, xHandle]);

  function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be 1 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setAvatarDataUrl(result);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!walletAddress || !isConnected) {
      toast.error("Connect wallet first.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }

    setSaving(true);

    try {
      const hadProfile = Boolean(profile);
      const savedProfile = await registerProfile({
        role,
        displayName,
        email,
        instagram,
        telegram,
        x: xHandle,
        avatarDataUrl
      });

      toast.success(hadProfile ? "Profile updated." : "Registration completed.");
      router.push(savedProfile.role === "brand" ? "/brand/dashboard" : "/influencer/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save profile.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white/60 border border-gray-200 text-sm text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]";
  const labelClass = "block text-[11px] font-body font-bold uppercase tracking-widest text-gray-400 mb-1.5";

  const roleOptions: { value: RegistrableRole; label: string; icon: React.ElementType; desc: string; color: string }[] = [
    { value: "brand", label: "Brand", icon: Building2, desc: "Create & fund campaigns", color: "#6366f1" },
    { value: "influencer", label: "Creator", icon: UserCircle, desc: "Deliver & earn", color: "#10b981" },
  ];

  return (
    <div className="space-y-8 max-w-xl mx-auto">

      {/* ════════ Header ════════ */}
      <header className="text-center space-y-3">
        <div className="flex justify-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))" }}
          >
            <Sparkles size={24} className="text-indigo-500" strokeWidth={2} />
            <div
              className="absolute inset-0 rounded-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.5)" }}
            />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-body font-bold uppercase tracking-[0.25em] text-indigo-500">
            {profile ? "Profile Settings" : "Onboarding"}
          </p>
          <h1
            className="text-2xl font-heading font-bold mt-1"
            style={{ background: "linear-gradient(135deg, #1a1a2e, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            {profile ? "Update Your Profile" : "Register Wallet Profile"}
          </h1>
          <p className="text-sm font-body text-gray-500 mt-1.5">
            Connect once, register once, and use the same profile for your future campaigns.
          </p>
        </div>
      </header>

      {/* ════════ Main Card ════════ */}
      <section
        className="rounded-3xl p-[1px] overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15), rgba(16,185,129,0.1))" }}
      >
        <div className="glass-card rounded-3xl p-6 md:p-8 border-0 space-y-6">

          {/* Wallet Connection */}
          {!isConnected ? (
            <div className="text-center space-y-5 py-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))" }}
              >
                <Wallet size={28} className="text-indigo-400" strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-heading font-bold text-gray-900">Connect Your Wallet</h3>
                <p className="text-sm font-body text-gray-500 max-w-xs mx-auto">
                  Link your wallet to start the registration process. No gas required.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="rainbow-btn-wrapper">
                  <ConnectButton />
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={onSubmit}>

              {/* ── Connected Wallet Badge ── */}
              <div
                className="rounded-2xl p-4 flex items-center justify-between gap-3"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))",
                  border: "1px solid rgba(99,102,241,0.12)",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.1)" }}>
                    <Wallet size={16} className="text-indigo-500" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400">Connected Wallet</p>
                    <p className="text-xs font-mono font-bold text-gray-900 truncate">{walletAddress}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAdminWallet && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide"
                      style={{ background: "rgba(245,158,11,0.1)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)" }}
                    >
                      <Shield size={10} strokeWidth={2.5} />
                      Admin
                    </span>
                  )}
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
              </div>

              {/* ── Role Selection ── */}
              <div className="space-y-2">
                <p className={labelClass}>Choose Your Role</p>
                <div className="grid grid-cols-2 gap-3">
                  {roleOptions.map((item) => {
                    const active = role === item.value;
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() => setRole(item.value)}
                        className="relative rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                          border: `1.5px solid ${active ? `${item.color}40` : "rgba(0,0,0,0.06)"}`,
                          background: active
                            ? `linear-gradient(135deg, ${item.color}10, ${item.color}05)`
                            : "rgba(255,255,255,0.6)",
                          boxShadow: active ? `0 4px 16px ${item.color}12` : "none",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              background: active ? `${item.color}15` : "rgba(0,0,0,0.03)",
                            }}
                          >
                            <Icon size={18} strokeWidth={2} style={{ color: active ? item.color : "#9ca3af" }} />
                          </div>
                          <div>
                            <p className="text-sm font-heading font-bold" style={{ color: active ? item.color : "#374151" }}>
                              {item.label}
                            </p>
                            <p className="text-[10px] font-body text-gray-400 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        {active && (
                          <div
                            className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: item.color }}
                          >
                            <CheckCircle2 size={12} className="text-white" strokeWidth={2.5} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-300">Profile Details</p>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* ── Display Name ── */}
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <User size={11} strokeWidth={2.5} className="text-gray-400" />
                    Display Name
                  </span>
                </label>
                <input
                  className={inputClass}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name or agency name"
                  required
                />
              </div>

              {/* ── Email ── */}
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={11} strokeWidth={2.5} className="text-gray-400" />
                    Email
                  </span>
                </label>
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
                {email.trim().length > 0 && !isValidEmail(email.trim()) && (
                  <p className="text-[10px] font-body text-red-500 mt-1.5 flex items-center gap-1">
                    Please enter a valid email address
                  </p>
                )}
              </div>

              {/* ── Socials Grid ── */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <Instagram size={11} strokeWidth={2.5} className="text-gray-400" />
                      Instagram
                    </span>
                  </label>
                  <input
                    className={inputClass}
                    value={instagram}
                    onChange={(event) => setInstagram(event.target.value)}
                    placeholder="@handle"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <Send size={11} strokeWidth={2.5} className="text-gray-400" />
                      Telegram
                    </span>
                  </label>
                  <input
                    className={inputClass}
                    value={telegram}
                    onChange={(event) => setTelegram(event.target.value)}
                    placeholder="@username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <AtSign size={11} strokeWidth={2.5} className="text-gray-400" />
                    X (Twitter)
                  </span>
                </label>
                <input
                  className={inputClass}
                  value={xHandle}
                  onChange={(event) => setXHandle(event.target.value)}
                  placeholder="@handle"
                  required
                />
              </div>

              {/* ── Avatar Upload ── */}
              <div className="space-y-2">
                <p className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <Camera size={11} strokeWidth={2.5} className="text-gray-400" />
                    Profile Image
                  </span>
                </p>
                <div
                  className="rounded-2xl p-5 flex items-center gap-5"
                  style={{
                    border: "1.5px dashed rgba(99,102,241,0.2)",
                    background: "linear-gradient(135deg, rgba(99,102,241,0.03), rgba(139,92,246,0.02))",
                  }}
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/60 border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {avatarDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarDataUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={22} className="text-gray-300" />
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <label
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-body font-bold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{
                        background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))",
                        color: "#6366f1",
                        border: "1px solid rgba(99,102,241,0.15)",
                      }}
                    >
                      <Camera size={13} strokeWidth={2.5} />
                      {avatarDataUrl ? "Change Image" : "Upload Image"}
                      <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                    </label>
                    <p className="text-[10px] text-gray-400 font-body">PNG or JPG, up to 1 MB</p>
                  </div>
                </div>
              </div>

              {/* ── Submit Button ── */}
              <button
                type="submit"
                disabled={submitDisabled}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-sm font-body font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)" }}
              >
                {saving ? (
                  <><Loader2 size={15} className="animate-spin" /> Saving...</>
                ) : profile ? (
                  <><CheckCircle2 size={15} strokeWidth={2.5} /> Update Profile</>
                ) : (
                  <><ArrowRight size={15} strokeWidth={2.5} /> Complete Registration</>
                )}
              </button>

              {/* ── Footer note ── */}
              <p className="text-[10px] text-gray-400 font-body text-center leading-relaxed">
                Registration is verified with a wallet signature (no gas), then stored securely for future logins.
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
