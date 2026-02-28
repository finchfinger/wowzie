import Link from "next/link";

export default function HostReviewingPage() {
  return (
    <div className="mx-auto max-w-lg text-center space-y-6 py-8">
      <div className="flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">
          &#x23F3;
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Application under review
        </h2>
        <p className="text-sm text-muted-foreground">
          We&apos;re reviewing your application. You&apos;ll receive an email
          when it&apos;s approved. This usually takes 1-2 business days.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md border border-input bg-transparent px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
      >
        Back to home
      </Link>
    </div>
  );
}
