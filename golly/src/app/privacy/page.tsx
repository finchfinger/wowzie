export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">
        Privacy Policy
      </h1>

      <div className="rounded-2xl bg-card p-5 sm:p-6 prose prose-sm max-w-none text-foreground">
        <p className="text-muted-foreground">
          Last updated: February 2025
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">1. Information We Collect</h2>
        <p className="text-sm text-muted-foreground">
          We collect information you provide directly to us, such as when you create an account,
          book an activity, or contact us. This includes your name, email address, phone number,
          payment information, and information about your children that you choose to share.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
        <p className="text-sm text-muted-foreground">
          We use the information we collect to provide, maintain, and improve our services,
          process transactions, send communications, and protect the safety of our community.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">3. Information Sharing</h2>
        <p className="text-sm text-muted-foreground">
          We share your information only as described in this policy: with hosts you book with,
          service providers who assist our operations, and as required by law.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">4. Data Security</h2>
        <p className="text-sm text-muted-foreground">
          We take reasonable measures to help protect your personal information from loss, theft,
          misuse, unauthorized access, disclosure, alteration, and destruction.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">5. Contact Us</h2>
        <p className="text-sm text-muted-foreground">
          If you have any questions about this privacy policy, please contact us at{" "}
          <a href="mailto:flatmade@gmail.com" className="text-primary underline">flatmade@gmail.com</a>.
        </p>
      </div>
    </main>
  );
}
