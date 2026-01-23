import React from "react";

export const TermsContent: React.FC = () => {
  return (
    <>
      <p>
        Welcome to Wowzie ("we," "us," "our"). Wowzie is a platform that helps parents and
        guardians discover, compare, and book camps and classes for their children, and
        enables providers ("Hosts," "Providers," or "Camps") to list and manage their
        activities. By accessing or using Wowzie (the "Platform"), you agree to these Terms
        and Conditions ("Terms"). If you do not agree, please do not use the Platform.
      </p>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          1. Overview
        </h2>
        <p>
          Wowzie provides a digital platform that connects Parents with Providers offering
          camps, classes, and activities. We do not own, operate, or control any of the
          camps or classes listed. All bookings, experiences, and payments are directly
          between the Parent and the Provider.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          2. Eligibility
        </h2>
        <p>To use Wowzie, you must:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Be at least 18 years old;</li>
          <li>Have the legal authority to enter into contracts;</li>
          <li>Use the Platform for lawful purposes only.</li>
        </ul>
        <p className="mt-2">
          Parents are responsible for ensuring that the child participating in any activity
          meets the Provider&apos;s requirements.
        </p>
      </section>

      {/* …continue the rest verbatim… */}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          12. Contact
        </h2>
        <p>
          If you have any questions about these Terms, please contact us at{" "}
          <a
            href="mailto:wow@wowzie.com"
            className="underline hover:text-wowzie-text-primary"
          >
            wow@wowzie.com
          </a>
          .
        </p>
      </section>
    </>
  );
};

export default TermsContent;
