import { LegalPage } from "@/components/legal-page.jsx";

export const metadata = {
  title: "Data Deletion | SB-00 Portal"
};

export default function DataDeletionPage() {
  return (
    <LegalPage
      bodyKey="legal.dataDeletion.sections"
      eyebrowKey="legal.dataDeletion.eyebrow"
      titleKey="legal.dataDeletion.title"
      updatedKey="legal.lastUpdated"
    />
  );
}
