import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export const ActivityReviewPage: React.FC = () => {
  return (
    <main className="flex-1 bg-violet-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-2xl">
            🧾
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Review in progress
          </h1>

          <p className="mt-2 max-w-md text-sm text-gray-600">
            We&apos;re reviewing your listing to make sure everything looks
            good. You&apos;ll get a confirmation soon.
          </p>

          <div className="mt-6">
            <Link to="/activities/new">
              <Button variant="subtle" className="px-5 py-2 text-sm">
                List another activity
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};
