import { LegalPage } from "@/components/legal-page.jsx";

export const metadata = {
  title: "Privacy Policy | SB-00 Portal"
};

export default function PrivacyPage() {
  return (
    <LegalPage
      bodyKey="legal.privacy.sections"
      eyebrowKey="legal.privacy.eyebrow"
      titleKey="legal.privacy.title"
      updatedKey="legal.lastUpdated"
    />
  );
}
