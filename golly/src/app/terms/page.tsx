export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">
        Terms of Service
      </h1>

      <div className="rounded-2xl bg-card p-5 sm:p-6 prose prose-sm max-w-none text-foreground">
        <p className="text-muted-foreground">
          Last updated: February 2025
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
        <p className="text-sm text-muted-foreground">
          By accessing or using Golly, you agree to be bound by these Terms of Service and all
          applicable laws and regulations. If you do not agree with any of these terms, you are
          prohibited from using the service.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">2. User Accounts</h2>
        <p className="text-sm text-muted-foreground">
          You are responsible for maintaining the confidentiality of your account credentials
          and for all activities that occur under your account. You must provide accurate and
          complete information when creating your account.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">3. Booking and Payments</h2>
        <p className="text-sm text-muted-foreground">
          When you book an activity through Golly, you agree to pay the listed price plus any
          applicable fees. Cancellation and refund policies vary by host and are displayed
          on each listing.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">4. Host Responsibilities</h2>
        <p className="text-sm text-muted-foreground">
          Hosts are responsible for providing accurate listing information, maintaining a safe
          environment for participants, and complying with all applicable laws and regulations.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">5. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground">
          Golly serves as a platform connecting families with activity providers. We are not
          responsible for the conduct of hosts or the quality of activities. Users participate
          at their own risk.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">6. Contact</h2>
        <p className="text-sm text-muted-foreground">
          Questions about these terms should be directed to{" "}
          <a href="mailto:flatmade@gmail.com" className="text-primary underline">flatmade@gmail.com</a>.
        </p>
      </div>
    </main>
  );
}
