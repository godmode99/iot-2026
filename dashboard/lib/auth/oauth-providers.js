const ALL_OAUTH_PROVIDERS = [
  { id: "google", labelKey: "auth.providers.google" },
  { id: "facebook", labelKey: "auth.providers.facebook" },
  { id: "apple", labelKey: "auth.providers.apple" }
];

const PROVIDER_BY_ID = new Map(ALL_OAUTH_PROVIDERS.map((provider) => [provider.id, provider]));
const DEFAULT_PROVIDER_IDS = ["google"];

function parseEnabledProviderIds() {
  const configured = process.env.AUTH_PROVIDERS ?? process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "";
  const rawIds = configured
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);

  return rawIds.length > 0 ? rawIds : DEFAULT_PROVIDER_IDS;
}

export function getEnabledOAuthProviders() {
  return parseEnabledProviderIds()
    .map((providerId) => PROVIDER_BY_ID.get(providerId))
    .filter(Boolean);
}

export function isEnabledOAuthProvider(providerId) {
  return getEnabledOAuthProviders().some((provider) => provider.id === providerId);
}

export function getOAuthProviderScopes(providerId) {
  if (providerId === "facebook") {
    return "public_profile";
  }

  return undefined;
}
