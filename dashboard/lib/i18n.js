import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDefaultLocale } from "./env.js";

const SUPPORTED_LOCALES = new Set(["th", "en", "my"]);
const messageCache = new Map();

export function normalizeLocale(locale) {
  if (SUPPORTED_LOCALES.has(locale)) {
    return locale;
  }

  return getDefaultLocale();
}

export async function getMessages(locale = getDefaultLocale()) {
  const normalizedLocale = normalizeLocale(locale);

  if (messageCache.has(normalizedLocale)) {
    return messageCache.get(normalizedLocale);
  }

  const messagePath = path.join(process.cwd(), "messages", `${normalizedLocale}.json`);
  const messages = JSON.parse(await readFile(messagePath, "utf8"));
  messageCache.set(normalizedLocale, messages);

  return messages;
}

export function t(messages, key, fallback = key) {
  return key.split(".").reduce((value, segment) => value?.[segment], messages) ?? fallback;
}

