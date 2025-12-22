import React from "react";
import { HelpArticleLayout } from "../../components/help/HelpArticleLayout";



export const CancellationsRefundsPage: React.FC = () => (
  <HelpArticleLayout
    title="Cancellations and refunds"
    description="How to cancel or change a booking, and when you’re eligible for a full or partial refund."
  >
    <p>
      We understand plans can change. Wowzie makes it easy to manage
      cancellations and refunds directly from your account.
    </p>

    <h2>Canceling a booking</h2>
    <p>
      Go to My bookings and select the camp or class you would like to cancel.
      Click <strong>Cancel booking</strong> to start the process. If the session
      has not started yet, your eligibility for a refund depends on the host’s
      cancellation policy.
    </p>

    <h2>Refund timing</h2>
    <p>
      If your booking qualifies for a refund, it will automatically be issued to
      your original payment method. Refunds typically appear within 5–10
      business days, depending on your bank or card provider.
    </p>

    <h2>Late cancellations</h2>
    <p>
      Hosts set their own cutoff times for refunds, usually between 3–7 days
      before the start date. After that, cancellations may not be refundable,
      but you can still message the host to discuss rescheduling.
    </p>

    <h2>Host cancellations</h2>
    <p>
      If a host cancels a class or camp, you will always receive a full refund.
      You&apos;ll be notified by email and can rebook another activity right
      away.
    </p>

    <h2>Need help?</h2>
    <p>
      If something does not look right or a refund has not arrived, contact
      Wowzie Support through the Help Center. We&apos;ll review your case and
      make sure it&apos;s resolved quickly.
    </p>
  </HelpArticleLayout>
);
