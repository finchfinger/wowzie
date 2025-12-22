import React from "react";
import { HelpArticleLayout } from "../../components/help/HelpArticleLayout";

export const ListingCampClassPage: React.FC = () => (
  <HelpArticleLayout
    title="Listing a camp or class"
    description="Step-by-step guide to creating a listing, adding photos, setting prices, and managing your schedule."
  >
    <p>
      Hosting on Wowzie is an easy way to share what you love and connect with
      local families. Whether it&apos;s an art class, coding camp, or weekend
      workshop, you can set up your listing in just a few steps.
    </p>

    <h2>Create your listing</h2>
    <p>
      Go to your Host dashboard and select <strong>Add a listing</strong>. Add a
      clear title, description, and photos that capture what makes your program
      special.
    </p>

    <h2>Set your details</h2>
    <p>
      Choose your dates, times, location, and price per child. You can also
      specify age range, capacity, and any materials needed.
    </p>

    <h2>Add rules or requirements</h2>
    <p>
      Include drop-off and pick-up notes, safety information, or items parents
      should bring. This helps set clear expectations before anyone books.
    </p>

    <h2>Review and publish</h2>
    <p>
      Once your listing is complete, review it for accuracy. Click{" "}
      <strong>Publish</strong> to make it live on Wowzie. Parents can then
      search, view, and book instantly.
    </p>

    <h2>Manage your listings</h2>
    <p>
      You can edit or pause listings anytime from your Host dashboard. If a camp
      is full or not running this season, simply mark it as inactive.
    </p>

    <h2>Helpful tip</h2>
    <p>
      Use bright, natural photos and short, clear titles. Listings with great
      visuals and simple descriptions attract more bookings.
    </p>
  </HelpArticleLayout>
);
