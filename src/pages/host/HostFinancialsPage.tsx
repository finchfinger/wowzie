import React from "react";
import { Button } from "../../components/ui/Button";

export const HostFinancialsPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Payments</h2>
        <p className="mt-1 text-xs text-gray-600 max-w-xl">
          Wowzie charges a 5% host fee on each booking, automatically deducted
          from your payout. This covers payment processing, customer support,
          and platform maintenance.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-medium text-gray-900">Stripe</p>
          <p className="text-xs text-gray-500">
            Connect your Stripe account to accept payments securely and get paid
            quickly.
          </p>
        </div>
        <Button className="text-xs px-3 py-1.5">Get started</Button>
      </div>
    </div>
  );
};
