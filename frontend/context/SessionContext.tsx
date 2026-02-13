"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import {
  RegisteredProfile,
  RegisteredProfileInput,
  RegistrableRole,
  isRegistrableRole,
  isWalletAddress,
  normalizeWalletAddress
} from "@/lib/profile-types";

export type AppRole = "brand" | "influencer" | "admin";
export type { RegistrableRole, RegisteredProfile, RegisteredProfileInput } from "@/lib/profile-types";

type SessionContextValue = {
  role: AppRole;
  setRole: (nextRole: AppRole) => void;
  walletAddress?: `0x${string}`;
  isConnected: boolean;
  isAdminWallet: boolean;
  isRegistered: boolean;
  isProfileLoading: boolean;
  profile: RegisteredProfile | null;
  registerProfile: (input: RegisteredProfileInput) => Promise<RegisteredProfile>;
  refreshProfile: () => Promise<void>;
  ensureProfiles: (walletAddresses: string[]) => Promise<void>;
  getProfileByWallet: (walletAddress: string) => RegisteredProfile | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const ROLE_STORAGE_KEY = "clawgency_role";
const PROFILE_STORAGE_KEY = "clawgency_registered_profiles_v1";

type ProfileStore = Record<string, RegisteredProfile>;

type ProfilesApiResponse = {
  profiles?: unknown;
  error?: unknown;
};

type RegisterApiResponse = {
  profile?: unknown;
  error?: unknown;
};

function isRegisteredProfile(value: unknown): value is RegisteredProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<RegisteredProfile>;
  return (
    isWalletAddress(profile.walletAddress) &&
    isRegistrableRole(profile.role) &&
    typeof profile.displayName === "string" &&
    typeof profile.email === "string" &&
    typeof profile.instagram === "string" &&
    typeof profile.telegram === "string" &&
    typeof profile.x === "string" &&
    (profile.avatarDataUrl === undefined || typeof profile.avatarDataUrl === "string") &&
    typeof profile.createdAt === "string" &&
    typeof profile.updatedAt === "string"
  );
}

function normalizeRegisteredProfile(profile: RegisteredProfile): RegisteredProfile {
  return {
    ...profile,
    walletAddress: normalizeWalletAddress(profile.walletAddress)
  };
}

function parseProfileStore(raw: string | null): ProfileStore {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const next: ProfileStore = {};
    for (const [walletAddress, profile] of Object.entries(parsed as Record<string, unknown>)) {
      if (!isWalletAddress(walletAddress) || !isRegisteredProfile(profile)) {
        continue;
      }
      next[normalizeWalletAddress(walletAddress)] = normalizeRegisteredProfile(profile);
    }
    return next;
  } catch {
    return {};
  }
}

function getStoredRole(): AppRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
  if (storedRole === "brand" || storedRole === "influencer" || storedRole === "admin") {
    return storedRole;
  }

  return null;
}

function getStoredProfiles(): ProfileStore {
  if (typeof window === "undefined") {
    return {};
  }

  return parseProfileStore(window.localStorage.getItem(PROFILE_STORAGE_KEY));
}

function saveProfiles(nextProfiles: ProfileStore) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfiles));
}

async function fetchProfilesFromApi(walletAddresses: string[]): Promise<RegisteredProfile[]> {
  const normalizedWallets = Array.from(
    new Set(
      walletAddresses
        .filter(isWalletAddress)
        .map((walletAddress) => normalizeWalletAddress(walletAddress))
    )
  );

  if (normalizedWallets.length === 0) {
    return [];
  }

  const searchParams = new URLSearchParams({ wallets: normalizedWallets.join(",") });
  const response = await fetch(`/api/profiles?${searchParams.toString()}`, {
    method: "GET",
    cache: "no-store"
  });

  const body = (await response.json().catch(() => null)) as ProfilesApiResponse | null;
  if (!response.ok) {
    const message =
      body && typeof body.error === "string"
        ? body.error
        : "Failed to fetch profile data.";
    throw new Error(message);
  }

  const rawProfiles = body?.profiles;
  if (!Array.isArray(rawProfiles)) {
    return [];
  }

  return rawProfiles
    .filter(isRegisteredProfile)
    .map(normalizeRegisteredProfile);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const adminWallet = (process.env.NEXT_PUBLIC_ADMIN_WALLET ?? "").toLowerCase();
  const isAdminWallet = Boolean(address && address.toLowerCase() === adminWallet && adminWallet);

  const [role, setRoleState] = useState<AppRole>(() => getStoredRole() ?? "brand");
  const [profiles, setProfiles] = useState<ProfileStore>(() => getStoredProfiles());
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const pendingWalletLoadsRef = useRef<Set<string>>(new Set());

  const mergeProfiles = useCallback((incomingProfiles: RegisteredProfile[]) => {
    if (!incomingProfiles.length) {
      return;
    }

    setProfiles((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const incoming of incomingProfiles) {
        const normalized = normalizeRegisteredProfile(incoming);
        const key = normalized.walletAddress.toLowerCase();
        const existing = prev[key];

        if (!existing || JSON.stringify(existing) !== JSON.stringify(normalized)) {
          next[key] = normalized;
          changed = true;
        }
      }

      if (changed) {
        saveProfiles(next);
        return next;
      }

      return prev;
    });
  }, []);

  const ensureProfiles = useCallback(
    async (walletAddresses: string[]) => {
      const normalizedWallets = Array.from(
        new Set(
          walletAddresses
            .filter(isWalletAddress)
            .map((walletAddress) => normalizeWalletAddress(walletAddress))
        )
      );

      const walletsToLoad = normalizedWallets.filter(
        (walletAddress) => !profiles[walletAddress] && !pendingWalletLoadsRef.current.has(walletAddress)
      );

      if (walletsToLoad.length === 0) {
        return;
      }

      walletsToLoad.forEach((walletAddress) => pendingWalletLoadsRef.current.add(walletAddress));

      try {
        const loadedProfiles = await fetchProfilesFromApi(walletsToLoad);
        mergeProfiles(loadedProfiles);
      } catch (error) {
        console.error("Failed to fetch campaign party profiles", error);
      } finally {
        walletsToLoad.forEach((walletAddress) => pendingWalletLoadsRef.current.delete(walletAddress));
      }
    },
    [profiles, mergeProfiles]
  );

  const refreshProfile = useCallback(async () => {
    if (!address || !isConnected) {
      setIsProfileLoading(false);
      return;
    }

    const walletAddress = normalizeWalletAddress(address);
    if (pendingWalletLoadsRef.current.has(walletAddress)) {
      return;
    }

    pendingWalletLoadsRef.current.add(walletAddress);
    setIsProfileLoading(true);

    try {
      const loadedProfiles = await fetchProfilesFromApi([walletAddress]);
      mergeProfiles(loadedProfiles);
    } catch (error) {
      console.error("Failed to refresh connected wallet profile", error);
    } finally {
      pendingWalletLoadsRef.current.delete(walletAddress);
      setIsProfileLoading(false);
    }
  }, [address, isConnected, mergeProfiles]);

  const profile = useMemo(() => {
    if (!address) {
      return null;
    }
    return profiles[address.toLowerCase()] ?? null;
  }, [address, profiles]);

  const isRegistered = isAdminWallet || Boolean(profile);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === PROFILE_STORAGE_KEY) {
        setProfiles(getStoredProfiles());
      }
      if (event.key === ROLE_STORAGE_KEY) {
        const storedRole = getStoredRole();
        if (storedRole) {
          setRoleState(storedRole);
        }
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (isAdminWallet) {
      setRoleState("admin");
      window.localStorage.setItem(ROLE_STORAGE_KEY, "admin");
      return;
    }

    if (profile) {
      setRoleState(profile.role);
      window.localStorage.setItem(ROLE_STORAGE_KEY, profile.role);
    }
  }, [isAdminWallet, profile]);

  useEffect(() => {
    if (!isConnected || !address || isAdminWallet) {
      setIsProfileLoading(false);
      return;
    }

    void refreshProfile();
  }, [isConnected, address, isAdminWallet, refreshProfile]);

  const setRole = useCallback(
    (nextRole: AppRole) => {
      if (nextRole === "admin" && !isAdminWallet) {
        return;
      }

      if (!isAdminWallet && profile && nextRole !== profile.role) {
        return;
      }

      setRoleState(nextRole);
      window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    },
    [isAdminWallet, profile]
  );

  const registerProfile = useCallback(
    async (input: RegisteredProfileInput) => {
      if (!address || !isConnected) {
        throw new Error("Connect wallet before registration.");
      }

      const walletAddress = normalizeWalletAddress(address);

      const challengeResponse = await fetch("/api/profiles/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ walletAddress })
      });

      const challengeBody = (await challengeResponse.json().catch(() => null)) as
        | { challenge?: unknown; message?: unknown; error?: unknown }
        | null;

      if (!challengeResponse.ok) {
        const message =
          challengeBody && typeof challengeBody.error === "string"
            ? challengeBody.error
            : "Failed to start registration verification.";
        throw new Error(message);
      }

      if (typeof challengeBody?.challenge !== "string" || typeof challengeBody?.message !== "string") {
        throw new Error("Challenge response is malformed.");
      }

      const signature = await signMessageAsync({
        message: challengeBody.message
      });

      const registerResponse = await fetch("/api/profiles/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          walletAddress,
          challenge: challengeBody.challenge,
          message: challengeBody.message,
          signature,
          profile: input
        })
      });

      const registerBody = (await registerResponse.json().catch(() => null)) as RegisterApiResponse | null;

      if (!registerResponse.ok) {
        const message =
          registerBody && typeof registerBody.error === "string"
            ? registerBody.error
            : "Failed to register profile.";
        throw new Error(message);
      }

      if (!registerBody || !isRegisteredProfile(registerBody.profile)) {
        throw new Error("Registered profile payload is malformed.");
      }

      const savedProfile = normalizeRegisteredProfile(registerBody.profile);
      mergeProfiles([savedProfile]);

      setRoleState(savedProfile.role);
      window.localStorage.setItem(ROLE_STORAGE_KEY, savedProfile.role);

      return savedProfile;
    },
    [address, isConnected, signMessageAsync, mergeProfiles]
  );

  const getProfileByWallet = useCallback(
    (walletAddress: string) => {
      if (!isWalletAddress(walletAddress)) {
        return null;
      }
      return profiles[normalizeWalletAddress(walletAddress)] ?? null;
    },
    [profiles]
  );

  const value = useMemo(
    () => ({
      role,
      setRole,
      walletAddress: address,
      isConnected,
      isAdminWallet,
      isRegistered,
      isProfileLoading,
      profile,
      registerProfile,
      refreshProfile,
      ensureProfiles,
      getProfileByWallet
    }),
    [
      role,
      setRole,
      address,
      isConnected,
      isAdminWallet,
      isRegistered,
      isProfileLoading,
      profile,
      registerProfile,
      refreshProfile,
      ensureProfiles,
      getProfileByWallet
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
