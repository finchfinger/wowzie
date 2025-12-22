import React from "react";
import { HelpArticleLayout } from "../../components/help/HelpArticleLayout";

export const MessagingHostsPage: React.FC = () => (
  <HelpArticleLayout
    title="Messaging hosts"
    description="How to contact a host before or after booking and when to expect replies."
  >
    <p>
      Communication is key to great experiences. Wowzie’s built-in messaging
      helps parents and hosts stay connected before, during, and after a
      booking.
    </p>

    <h2>Starting a conversation</h2>
    <p>
      From any camp or class page, select <strong>Message host</strong> to ask
      questions before you book. You can also reach out after booking to confirm
      drop-off details or supplies.
    </p>

    <h2>Staying organized</h2>
    <p>
      All messages appear in your Inbox, sorted by host and activity. You&apos;ll
      also receive email or push notifications whenever a host replies.
    </p>

    <h2>Appropriate communication</h2>
    <p>
      Use Wowzie messaging only for questions related to listings or bookings.
      Sharing personal contact details or arranging payments outside Wowzie
      isn&apos;t allowed for your safety.
    </p>

    <h2>Host response times</h2>
    <p>
      Most hosts reply within 24 hours, often much sooner. If a message goes
      unanswered for more than two days, you can contact Wowzie Support for
      help.
    </p>

    <h2>Helpful tip</h2>
    <p>
      Keep messages short, friendly, and include your child&apos;s name and
      booking details so the host can respond faster.
    </p>
  </HelpArticleLayout>
);
