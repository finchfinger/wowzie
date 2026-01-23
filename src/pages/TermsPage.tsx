import React from "react";
import { StaticPageLayout } from "../components/layout/StaticPageLayout";
import TermsContent from "../components/legal/TermsContent";

export const TermsPage: React.FC = () => {
  return (
    <StaticPageLayout title="Terms and conditions" lastUpdated="October 23, 2025">
      <TermsContent />
    </StaticPageLayout>
  );
};
