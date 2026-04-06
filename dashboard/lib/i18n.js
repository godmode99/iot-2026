import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { getDefaultLocale } from "./env.js";

const SUPPORTED_LOCALES = new Set(["th", "en", "my"]);
export const LOCALE_COOKIE_NAME = "sb_locale";
const messageCache = new Map();

function mergeFallbackMessages(fallback, localized) {
  if (!fallback || typeof fallback !== "object" || Array.isArray(fallback)) {
    return localized ?? fallback;
  }

  const merged = { ...fallback };

  for (const [key, value] of Object.entries(localized ?? {})) {
    merged[key] = mergeFallbackMessages(fallback[key], value);
  }

  return merged;
}

export function normalizeLocale(locale) {
  if (SUPPORTED_LOCALES.has(locale)) {
    return locale;
  }

  return getDefaultLocale();
}

export async function getCurrentLocale() {
  try {
    const cookieStore = await cookies();
    return normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  } catch {
    return normalizeLocale(getDefaultLocale());
  }
}

export async function getMessages(locale) {
  const normalizedLocale = normalizeLocale(locale ?? await getCurrentLocale());

  if (messageCache.has(normalizedLocale)) {
    return messageCache.get(normalizedLocale);
  }

  const messagePath = path.join(process.cwd(), "messages", `${normalizedLocale}.json`);
  const localizedMessages = JSON.parse(await readFile(messagePath, "utf8"));
  const messages = normalizedLocale === "en"
    ? localizedMessages
    : mergeFallbackMessages(await getMessages("en"), localizedMessages);

  messageCache.set(normalizedLocale, messages);

  return messages;
}

export function t(messages, key, fallback = key) {
  return key.split(".").reduce((value, segment) => value?.[segment], messages) ?? fallback;
}
