import { t } from "@/lib/i18n.js";

const OAUTH_PROVIDERS = [
  { id: "google", labelKey: "auth.providers.google" },
  { id: "facebook", labelKey: "auth.providers.facebook" },
  { id: "apple", labelKey: "auth.providers.apple" }
];

export function OAuthButtons({ action, messages, returnUrl = "/dashboard" }) {
  return (
    <div className="oauth-button-stack" aria-label={t(messages, "auth.oauthOptions")}>
      {OAUTH_PROVIDERS.map((provider) => (
        <form action={action} key={provider.id}>
          <input name="provider" type="hidden" value={provider.id} />
          <input name="returnUrl" type="hidden" value={returnUrl} />
          <button className="button oauth-button" type="submit">
            {t(messages, provider.labelKey)}
          </button>
        </form>
      ))}
    </div>
  );
}
