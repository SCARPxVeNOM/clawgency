export const REGISTRABLE_ROLES = ["brand", "influencer"] as const;

export type RegistrableRole = (typeof REGISTRABLE_ROLES)[number];

export type RegisteredProfile = {
  walletAddress: `0x${string}`;
  role: RegistrableRole;
  displayName: string;
  email: string;
  instagram: string;
  telegram: string;
  x: string;
  avatarDataUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type RegisteredProfileInput = {
  role: RegistrableRole;
  displayName: string;
  email: string;
  instagram: string;
  telegram: string;
  x: string;
  avatarDataUrl?: string;
};

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isRegistrableRole(value: unknown): value is RegistrableRole {
  return typeof value === "string" && (REGISTRABLE_ROLES as readonly string[]).includes(value);
}

export function isWalletAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && ADDRESS_REGEX.test(value);
}

export function normalizeWalletAddress(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
}

export function normalizeProfileInput(input: RegisteredProfileInput): RegisteredProfileInput {
  return {
    role: input.role,
    displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    instagram: input.instagram.trim(),
    telegram: input.telegram.trim(),
    x: input.x.trim(),
    avatarDataUrl: input.avatarDataUrl
  };
}
