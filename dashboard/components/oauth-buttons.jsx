import { t } from "@/lib/i18n.js";
import { getEnabledOAuthProviders } from "@/lib/auth/oauth-providers.js";
import { SubmitButton } from "@/components/submit-button.jsx";

export function OAuthButtons({ action, messages, returnUrl = "/dashboard" }) {
  const providers = getEnabledOAuthProviders();

  return (
    <div className="oauth-button-stack" aria-label={t(messages, "auth.oauthOptions")}>
      {providers.map((provider) => (
        <form action={action} key={provider.id}>
          <input name="provider" type="hidden" value={provider.id} />
          <input name="returnUrl" type="hidden" value={returnUrl} />
          <SubmitButton className="button oauth-button">
            {t(messages, provider.labelKey)}
          </SubmitButton>
        </form>
      ))}
    </div>
  );
}
