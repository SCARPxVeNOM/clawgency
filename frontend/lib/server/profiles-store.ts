import {
  RegisteredProfile,
  RegistrableRole,
  isRegistrableRole,
  isWalletAddress,
  normalizeProfileInput,
  normalizeWalletAddress
} from "@/lib/profile-types";

type SupabaseProfileRow = {
  wallet_address: string;
  role: string;
  display_name: string;
  email: string;
  instagram: string;
  telegram: string;
  x_handle: string;
  avatar_data_url: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileUpsertInput = {
  walletAddress: `0x${string}`;
  role: RegistrableRole;
  displayName: string;
  email: string;
  instagram: string;
  telegram: string;
  x: string;
  avatarDataUrl?: string;
};

const PROFILE_SELECT_COLUMNS = "wallet_address,role,display_name,email,instagram,telegram,x_handle,avatar_data_url,created_at,updated_at";

function getProfileTableName() {
  const configured = (process.env.SUPABASE_PROFILE_TABLE ?? "wallet_profiles").trim();
  const dequoted = configured.replace(/^['"]+|['"]+$/g, "");
  const normalized = dequoted.toLowerCase();

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    throw new Error("SUPABASE_PROFILE_TABLE must contain only lowercase letters, numbers, and underscores.");
  }

  return normalized;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return {
    url: url.replace(/\/+$/, ""),
    key: serviceRoleKey,
    tableName: getProfileTableName()
  };
}

function isSupabaseProfileRow(value: unknown): value is SupabaseProfileRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<SupabaseProfileRow>;
  return (
    typeof row.wallet_address === "string" &&
    typeof row.role === "string" &&
    typeof row.display_name === "string" &&
    typeof row.email === "string" &&
    typeof row.instagram === "string" &&
    typeof row.telegram === "string" &&
    typeof row.x_handle === "string" &&
    (row.avatar_data_url === null || typeof row.avatar_data_url === "string") &&
    typeof row.created_at === "string" &&
    typeof row.updated_at === "string"
  );
}

function mapRowToProfile(row: SupabaseProfileRow): RegisteredProfile {
  if (!isWalletAddress(row.wallet_address) || !isRegistrableRole(row.role)) {
    throw new Error("Supabase row contains invalid role or wallet format.");
  }

  return {
    walletAddress: normalizeWalletAddress(row.wallet_address),
    role: row.role,
    displayName: row.display_name,
    email: row.email,
    instagram: row.instagram,
    telegram: row.telegram,
    x: row.x_handle,
    avatarDataUrl: row.avatar_data_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function runSupabaseRequest<T>(url: URL, init?: RequestInit): Promise<T> {
  const { key } = getSupabaseConfig();

  const response = await fetch(url.toString(), {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Supabase profile request failed (${response.status}). ${responseText.slice(0, 240)}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function fetchProfilesByWallets(walletAddresses: string[]): Promise<RegisteredProfile[]> {
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

  const { url, tableName } = getSupabaseConfig();
  const queryUrl = new URL(`${url}/rest/v1/${tableName}`);
  queryUrl.searchParams.set("select", PROFILE_SELECT_COLUMNS);
  queryUrl.searchParams.set("wallet_address", `in.(${normalizedWallets.join(",")})`);

  const rows = await runSupabaseRequest<unknown[]>(queryUrl, { method: "GET" });
  if (!Array.isArray(rows)) {
    throw new Error("Supabase profile response is malformed.");
  }

  const profiles: RegisteredProfile[] = [];
  for (const row of rows) {
    if (!isSupabaseProfileRow(row)) {
      continue;
    }
    profiles.push(mapRowToProfile(row));
  }

  return profiles;
}

export async function upsertWalletProfile(input: ProfileUpsertInput): Promise<RegisteredProfile> {
  const normalized = normalizeProfileInput(input);
  const { url, tableName } = getSupabaseConfig();

  const payload = {
    wallet_address: normalizeWalletAddress(input.walletAddress),
    role: normalized.role,
    display_name: normalized.displayName,
    email: normalized.email,
    instagram: normalized.instagram,
    telegram: normalized.telegram,
    x_handle: normalized.x,
    avatar_data_url: normalized.avatarDataUrl ?? null,
    updated_at: new Date().toISOString()
  };

  const upsertUrl = new URL(`${url}/rest/v1/${tableName}`);
  upsertUrl.searchParams.set("on_conflict", "wallet_address");
  upsertUrl.searchParams.set("select", PROFILE_SELECT_COLUMNS);

  const rows = await runSupabaseRequest<unknown[]>(upsertUrl, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(payload)
  });

  if (!Array.isArray(rows) || rows.length === 0 || !isSupabaseProfileRow(rows[0])) {
    throw new Error("Failed to read saved profile from Supabase.");
  }

  return mapRowToProfile(rows[0]);
}
