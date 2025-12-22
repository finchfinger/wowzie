import React from "react";
import { HelpArticleLayout } from "../../components/help/HelpArticleLayout";

export const SafetyVerificationPage: React.FC = () => (
  <HelpArticleLayout
    title="Safety and verification"
    description="How Wowzie screens listings, verifies hosts, and supports safe experiences for kids and families."
  >
    <p>
      The safety and wellbeing of kids and families is at the heart of Wowzie.
      Every host and listing goes through checks designed to create a trusted
      environment for everyone.
    </p>

    <h2>Host verification</h2>
    <p>
      Before publishing listings, hosts verify their identity and contact
      details. Some programs may require additional verification, such as
      background checks or professional certifications.
    </p>

    <h2>Listing review</h2>
    <p>
      Each new listing is reviewed by Wowzie’s team to ensure accuracy, age
      appropriateness, and clear communication of safety measures (like
      supervision ratios or drop-off policies).
    </p>

    <h2>Secure payments</h2>
    <p>
      All transactions take place directly through Wowzie’s payment system and
      never through cash or third-party transfers. This keeps both families and
      hosts protected.
    </p>

    <h2>Reporting an issue</h2>
    <p>
      If something feels off or you encounter a safety concern, report it
      immediately through the Help Center or directly within the app. Our
      support team investigates all reports quickly and confidentially.
    </p>

    <h2>Helpful tip</h2>
    <p>
      When dropping off your child, confirm pickup details, introduce yourself
      to the host, and share any important information about allergies or
      special needs. Small steps help everyone feel comfortable and safe.
    </p>
  </HelpArticleLayout>
);
