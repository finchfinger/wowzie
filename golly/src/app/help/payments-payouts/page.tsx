import HelpArticleLayout from "@/components/help/HelpArticleLayout";

export default function PaymentsPayoutsPage() {
  return (
    <HelpArticleLayout
      title="Payments and payouts"
      description="How you'll receive payments, payout timing, and what fees apply."
    >
      <p>
        Golly handles all payments securely so both parents and hosts can focus
        on the experience, not the paperwork.
      </p>

      <h2>How payments work</h2>
      <p>
        Parents pay through Golly at the time of booking. Once confirmed, the
        funds are securely held until the camp or class begins.
      </p>

      <h2>Payout timing</h2>
      <p>
        Hosts are paid automatically 3–5 business days after the session starts,
        giving time to confirm attendance and resolve any early issues.
      </p>

      <h2>Checking your payouts</h2>
      <p>
        You can view your earnings in your Host dashboard under{" "}
        <strong>Payments</strong>. Each payout includes details like date, amount,
        and related bookings.
      </p>

      <h2>Fees</h2>
      <p>
        Golly takes a small service fee from each booking to cover platform
        operations, payment processing, and customer support. The fee is
        automatically deducted before payout.
      </p>

      <h2>Updating bank information</h2>
      <p>
        Hosts can securely update payout details anytime from their account
        settings. Changes take effect on the next booking cycle.
      </p>

      <h2>Helpful tip</h2>
      <p>
        Keep your payout info current and double-check your account details before
        your first session to avoid delays.
      </p>
    </HelpArticleLayout>
  );
}
