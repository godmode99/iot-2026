import { LegalPage } from "@/components/legal-page.jsx";

export const metadata = {
  title: "Terms of Service | SB-00 Portal"
};

export default function TermsPage() {
  return (
    <LegalPage
      bodyKey="legal.terms.sections"
      eyebrowKey="legal.terms.eyebrow"
      titleKey="legal.terms.title"
      updatedKey="legal.lastUpdated"
    />
  );
}
