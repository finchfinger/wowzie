import React from "react";
import { HelpArticleLayout } from "../../components/help/HelpArticleLayout";

export const ReviewsFeedbackPage: React.FC = () => (
  <HelpArticleLayout
    title="Reviews and feedback"
    description="How reviews work, how to respond, and what keeps the community constructive."
  >
    <p>
      Reviews help build trust across the Wowzie community for both parents and
      hosts. Honest feedback ensures great experiences and keeps standards high.
    </p>

    <h2>How reviews work</h2>
    <p>
      After a camp or class ends, parents receive an email and in-app prompt to
      leave a short review about their experience. Reviews can include a star
      rating and optional written feedback.
    </p>

    <h2>What parents can share</h2>
    <p>
      Parents are encouraged to comment on communication, safety, organization,
      and how much their child enjoyed the session. Constructive, kind feedback
      helps other families choose with confidence.
    </p>

    <h2>Host responses</h2>
    <p>
      Hosts can publicly respond to reviews to thank families or clarify
      feedback. Responses should remain professional, positive, and brief.
    </p>

    <h2>Removing or editing reviews</h2>
    <p>
      To keep reviews trustworthy, edits and removals are limited. Wowzie only
      intervenes if a review violates community guidelines—for example,
      containing personal information or inappropriate content.
    </p>

    <h2>Helpful tip</h2>
    <p>
      Positive reviews make your listings stand out. If you’re a host, encourage
      happy parents to share their experience right after the camp ends.
    </p>
  </HelpArticleLayout>
);
