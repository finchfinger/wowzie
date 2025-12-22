// src/pages/DataTransparencyPage.tsx
import React from "react";
import { StaticPageLayout } from "../components/layout/StaticPageLayout";

export const DataTransparencyPage: React.FC = () => {
  return (
    <StaticPageLayout title="Data transparency" lastUpdated="October 23, 2025">
      <p>
        We believe trust is the foundation of every great experience. When you use Wowzie
        to find camps and classes, you have a right to know how your information is
        handled clearly, safely, and respectfully.
      </p>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          Your data belongs to you
        </h2>
        <p>
          You decide what to share, and you can delete your account or information anytime.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          No selling of your personal data
        </h2>
        <p>We don’t sell your information to advertisers, data brokers, or anyone else. Ever.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          Transparency at every step
        </h2>
        <p>
          We tell you exactly what’s being collected, why it’s needed, and who it’s shared with
          no fine print, no surprises.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">Secure by design</h2>
        <p>
          Your information is protected through encryption, verified payment processors, and
          continuous security monitoring.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">Child-first approach</h2>
        <p>
          Children’s data is used only to complete bookings, and never for marketing or analytics.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          Full control over communication
        </h2>
        <p>
          You decide how and when we contact you for reminders, updates, or special offers.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          We hold providers to the same standard
        </h2>
        <p>
          Every camp and class listed on Wowzie agrees to respect your family’s privacy and follow
          Wowzie’s safety and data guidelines.
        </p>
      </section>

      <p>
        At Wowzie, we don’t just connect families and camps we build trust through transparency.
      </p>
    </StaticPageLayout>
  );
};

export default DataTransparencyPage;
