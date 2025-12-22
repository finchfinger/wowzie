import React from "react";
import { HelpArticleLayout } from "../../components/help/HelpArticleLayout";

export const ManagingKidProfilesPage: React.FC = () => (
  <HelpArticleLayout
    title="Managing your kids’ profiles"
    description="How to add your child’s information once and use it across future bookings."
  >
    <p>
      Wowzie lets you create and manage profiles for each of your children so
      booking camps and classes is faster and more personalized.
    </p>

    <h2>Adding a child</h2>
    <p>
      Go to your Account and select <strong>Kids</strong>. Tap{" "}
      <strong>Add child</strong> to enter basic details like name, age, and any
      relevant notes (allergies, skill level, or preferences).
    </p>

    <h2>Editing or removing profiles</h2>
    <p>
      You can update a child&apos;s information anytime by opening their profile
      and choosing <strong>Edit</strong>. To remove a profile, select{" "}
      <strong>Delete child</strong> at the bottom of the page.
    </p>

    <h2>Booking with multiple kids</h2>
    <p>
      When you book, Wowzie will ask which child or children the booking is for.
      You can select one or more, depending on the class. Prices and spots are
      shown per child.
    </p>

    <h2>Privacy and safety</h2>
    <p>
      Children&apos;s details are visible only to you and the host of a booked
      class. Wowzie never shares personal information publicly.
    </p>

    <h2>Helpful tip</h2>
    <p>
      Keep your kids&apos; profiles updated. It helps hosts recommend the right
      activities for their age and interests.
    </p>
  </HelpArticleLayout>
);
