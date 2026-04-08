import { t } from "@/lib/i18n.js";
import { getEnabledOAuthProviders } from "@/lib/auth/oauth-providers.js";

export function OAuthButtons({ action, messages, returnUrl = "/dashboard" }) {
  const providers = getEnabledOAuthProviders();

  return (
    <div className="oauth-button-stack" aria-label={t(messages, "auth.oauthOptions")}>
      {providers.map((provider) => (
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
