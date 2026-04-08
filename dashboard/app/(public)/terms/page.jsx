import { LegalPage } from "@/components/legal-page.jsx";

export const metadata = {
  title: "Terms of Service | ArayaShiki Lab"
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
