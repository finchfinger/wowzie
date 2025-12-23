import React from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Button } from "../../components/ui/Button";

export const HelpPage: React.FC = () => {
  return (
    <main className="flex-1 bg-rose-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <SectionHeader
            title="Help Center"
            subtitle="Find quick answers and tips to make your Wowzie experience easy, fun, and stress-free."
            actions={
              <Link to="/contact">
                <Button size="sm">Contact us</Button>
              </Link>
            }
          />

          <div className="mt-10 space-y-10">
            {/* For Parents */}
            <section>
              <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-700">
                For Parents
              </h2>

              <div className="grid gap-8 md:grid-cols-2">
                <Link to="/help/how-booking-works" className="group flex gap-3">
                  <div className="mt-1 text-xl" aria-hidden="true">
                    🎟️
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                      How booking works
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Learn how to find, compare, and book camps or classes on
                      Wowzie.
                    </p>
                  </div>
                </Link>

                <Link
                  to="/help/cancellations-refunds"
                  className="group flex gap-3"
                >
                  <div className="mt-1 text-xl" aria-hidden="true">
                    🙋🏽‍♀️
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                      Cancellations and refunds
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      How to cancel or change a booking, and when you&apos;re
                      eligible for a full or partial refund.
                    </p>
                  </div>
                </Link>

                <Link
                  to="/help/managing-kid-profiles"
                  className="group flex gap-3"
                >
                  <div className="mt-1 text-xl" aria-hidden="true">
                    🧠
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                      Managing your kids&apos; profiles
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      How to add your child&apos;s information once and use it
                      across all future bookings.
                    </p>
                  </div>
                </Link>

                <Link to="/help/messaging-hosts" className="group flex gap-3">
                  <div className="mt-1 text-xl" aria-hidden="true">
                    💬
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                      Messaging hosts
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      How to contact a host before or after booking and when to
                      expect replies.
                    </p>
                  </div>
                </Link>
              </div>
            </section>

            {/* For Camps */}
            <section>
              <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-700">
                For Camps
              </h2>

              <div className="grid gap-8 md:grid-cols-2">
                <Link
                  to="/help/listing-camp-class"
                  className="group flex gap-3"
                >
                  <div className="mt-1 text-xl" aria-hidden="true">
                    🌱
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                      Listing a camp or class
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Step-by-step guide to creating a listing, adding photos,
                      setting prices, and managing your schedule.
                    </p>
                  </div>
                </Link>

                <Link
                  to="/help/payments-payouts"
                  className="group flex gap-3"
                >
                  <div className="mt-1 text-xl" aria-hidden="true">
                    💳
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                      Payments and payouts
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      How you&apos;ll receive payments, payout timing, and what
                      fees apply.
                    </p>
                  </div>
                </Link>

                <Link
                  to="/help/reviews-feedback"
                  className="group flex gap-3"
                >
                  <div className="mt-1 text-xl" aria-hidden="true">
                    ⭐
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                      Reviews and feedback
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      How reviews work, how to respond, and what keeps the
                      community constructive.
                    </p>
                  </div>
                </Link>

                <Link
                  to="/help/safety-verification"
                  className="group flex gap-3"
                >
                  <div className="mt-1 text-xl" aria-hidden="true">
                    🛡️
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                      Safety and verification
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      How Wowzie screens listings, verifies hosts, and supports
                      safe experiences for kids and families.
                    </p>
                  </div>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};
