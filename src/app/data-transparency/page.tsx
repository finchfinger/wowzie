import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

export default function DataTransparencyPage() {
  return (
    <main>
      <div className="page-container py-10">
        <div className="page-grid">
          <div className="span-8-center">
      <PageHeader title="Data transparency" subtitle="Last updated October 23, 2025" />

      <div className="prose prose-sm max-w-none text-foreground space-y-6">
        <p>
          We believe trust is the foundation of every great experience. When you use Wowzi
          to find camps and classes, you have a right to know how your information is
          handled clearly, safely, and respectfully.
        </p>

        <section>
          <h2>Your data belongs to you</h2>
          <p>
            You decide what to share, and you can delete your account or information anytime.
          </p>
        </section>

        <section>
          <h2>No selling of your personal data</h2>
          <p>We don&apos;t sell your information to advertisers, data brokers, or anyone else. Ever.</p>
        </section>

        <section>
          <h2>Transparency at every step</h2>
          <p>
            We tell you exactly what&apos;s being collected, why it&apos;s needed, and who it&apos;s shared with
            — no fine print, no surprises.
          </p>
        </section>

        <section>
          <h2>Secure by design</h2>
          <p>
            Your information is protected through encryption, verified payment processors, and
            continuous security monitoring.
          </p>
        </section>

        <section>
          <h2>Child-first approach</h2>
          <p>
            Children&apos;s data is used only to complete bookings, and never for marketing or analytics.
          </p>
        </section>

        <section>
          <h2>Full control over communication</h2>
          <p>
            You decide how and when we contact you for reminders, updates, or special offers.
          </p>
        </section>

        <section>
          <h2>We hold providers to the same standard</h2>
          <p>
            Every camp and class listed on Wowzi agrees to respect your family&apos;s privacy and follow
            Wowzi&apos;s safety and data guidelines.
          </p>
        </section>

        <p>
          At Wowzi, we don&apos;t just connect families and camps — we build trust through transparency.
        </p>
      </div>

      <div className="mt-10">
        <Link
          href="/privacy"
          className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
        >
          Read our full Privacy Policy →
        </Link>
      </div>
          </div>
        </div>
      </div>
    </main>
  );
}
