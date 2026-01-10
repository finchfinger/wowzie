// src/pages/PrivacyPage.tsx
import React from "react";
import { StaticPageLayout } from "../components/layout/StaticPageLayout";

export const PrivacyPage: React.FC = () => {
  return (
    <StaticPageLayout title="Privacy policy">
      <p>
        Welcome to Wowzie (“we,” “us,” “our”). Your privacy matters to us. This
        Privacy Policy explains how we collect, use, and protect your personal
        information when you use the Wowzie platform (the “Platform”), which
        helps parents discover and book camps and classes, and enables providers
        to list their programs.
      </p>

      <p>
        By using Wowzie, you agree to this Privacy Policy. If you do not agree,
        please stop using the Platform.
      </p>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          1. Information we collect
        </h2>

        <p>
          We collect information to make Wowzie work smoothly for both parents
          and providers.
        </p>

        <h3 className="mt-4 text-sm font-semibold text-wowzie-text">
          a. Information you provide
        </h3>
        <p>
          Account information: Name, email address, password,
          and optional profile photo.
        </p>
        <p>
          Booking details: Names and ages of participating
          children, emergency contact information, selected camps or classes,
          and payment details.
        </p>
        <p>
          Provider information: Camp or class name, address,
          contact details, descriptions, photos, pricing, and scheduling
          information.
        </p>
        <p>
          Communications: Messages sent through Wowzie, customer
          support inquiries, and feedback you provide.
        </p>

        <h3 className="mt-4 text-sm font-semibold text-wowzie-text">
          b. Information we collect automatically
        </h3>
        <p>
          Usage data: Pages visited, actions taken, buttons
          clicked, and time spent on the Platform.
        </p>
        <p>
          Device data: Browser type, operating system, and IP
          address.
        </p>
        <p>
          Cookies: Small files that help remember your
          preferences, keep you signed in, and improve site performance.
        </p>

        <h3 className="mt-4 text-sm font-semibold text-wowzie-text">
          c. Information from third parties
        </h3>
        <p>
          If you choose to sign in using a third-party service (such as Google),
          we may receive limited information from that service, such as your
          name and email address.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          2. How we use your information
        </h2>
        <p>We use your information to:</p>
        <ul className="ml-5 list-disc">
          <li>Create and manage your account</li>
          <li>Facilitate bookings and payments</li>
          <li>
            Send important communications such as confirmations, reminders, and
            cancellations
          </li>
          <li>Improve our services and overall user experience</li>
          <li>Maintain platform safety and prevent fraud</li>
          <li>Comply with legal and regulatory obligations</li>
        </ul>

        <p className="mt-2">
          We do not sell your personal information to advertisers or data
          brokers.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          3. How we share information
        </h2>
        <p>
          We only share information when necessary to operate and improve the
          Platform.
        </p>

        <h3 className="mt-4 text-sm font-semibold text-wowzie-text">
          a. With providers
        </h3>
        <p>
          When a parent books a camp or class, the provider receives only the
          information needed to manage the booking, such as the child’s name,
          age, and emergency contact details.
        </p>

        <h3 className="mt-4 text-sm font-semibold text-wowzie-text">
          b. With service partners
        </h3>
        <p>We use trusted partners to support the Platform, including:</p>
        <ul className="ml-5 list-disc">
          <li>Payment processors (such as Stripe)</li>
          <li>Cloud hosting and analytics services</li>
          <li>Email and notification services</li>
        </ul>
        <p>
          These partners are required to protect your data and comply with
          applicable privacy laws.
        </p>

        <h3 className="mt-4 text-sm font-semibold text-wowzie-text">
          c. With legal authorities
        </h3>
        <p>
          We may disclose information if required by law or to protect Wowzie’s
          legal rights, safety, or property.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          4. Data retention
        </h2>
        <p>
          We retain your information only for as long as necessary to provide
          services and meet legal requirements. You may request deletion of your
          account and associated data at any time by contacting us at
          wow@wowzie.com.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          5. Your rights and choices
        </h2>
        <p>
          Depending on your location, you may have the right to:
        </p>
        <ul className="ml-5 list-disc">
          <li>Access a copy of your personal data</li>
          <li>Request corrections or deletion</li>
          <li>Opt out of marketing communications</li>
          <li>Withdraw consent where applicable</li>
        </ul>
        <p>
          To exercise these rights, contact us at wow@wowzie.com.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          6. Children’s privacy
        </h2>
        <p>
          Wowzie is intended for parents and guardians. Children are not
          permitted to use the Platform directly. We do not knowingly collect
          personal information from children under 13. If we discover that we
          have done so, we will delete the information promptly.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          7. Security
        </h2>
        <p>
          We use encryption, secure infrastructure, and ongoing monitoring to
          protect your information. However, no online service is completely
          secure, and you use the Platform at your own risk.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          8. International users
        </h2>
        <p>
          If you access Wowzie from outside the United States, your information
          may be transferred to and processed in the U.S. or other locations
          where we or our partners operate.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          9. Updates to this policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. Any changes will
          be posted on this page. Continued use of Wowzie after updates means
          you accept the revised policy.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-wowzie-text">
          10. Contact us
        </h2>
        <p>
          If you have questions or concerns about this Privacy Policy, please
          contact us at wow@wowzie.com.
        </p>
      </section>
    </StaticPageLayout>
  );
};
