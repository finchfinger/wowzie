import React from "react";

type Props = {
  variant?: "full" | "modal";
};

export const HostTermsContent: React.FC<Props> = ({ variant = "full" }) => {
  return (
    <div className="space-y-4 text-sm text-gray-700">
      {variant === "modal" ? (
        <p className="text-xs text-gray-500">
          Quick view. You can open the full page in a new tab if you prefer.
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">Host Terms &amp; Rules</h2>
        <p>
          This is the content used in both the modal and the /terms page. Replace this text with
          your actual terms.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Safety</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Hosts must maintain a safe environment appropriate for kids.</li>
          <li>Hosts must follow all applicable laws and venue rules.</li>
          <li>Hosts must communicate important risks clearly in the listing.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Cancellations and refunds</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Hosts must honor their posted cancellation policy.</li>
          <li>Changes must be communicated to families in advance.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Content and accuracy</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Listings must be accurate and not misleading.</li>
          <li>Hosts are responsible for their descriptions, pricing, and schedules.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Agreement</h3>
        <p>
          By submitting an application, you confirm you have read and agree to these Host Terms &amp;
          Rules.
        </p>
      </section>
    </div>
  );
};

export default HostTermsContent;
