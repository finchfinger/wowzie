import React from "react";
import { StaticPageLayout } from "../components/layout/StaticPageLayout";

export const PrivacyPage: React.FC = () => {
  return (
    <StaticPageLayout title="Privacy policy" lastUpdated="October 23, 2025">
      <p>
        This Privacy Policy explains how Wowzie collects, uses, and protects your
        information when you use our Platform. By using Wowzie, you agree to the
        collection and use of information in accordance with this policy.
      </p>

      {/* Add your sections here in the same style as Terms */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          1. Information we collect
        </h2>
        <p>Describe account data, child profiles, booking data, etc.</p>
      </section>

      {/* ...more sections */}
    </StaticPageLayout>
  );
};
