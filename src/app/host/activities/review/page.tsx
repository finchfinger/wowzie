import Link from "next/link";

export default function ActivityReviewPage() {
  return (
    <main className="flex-1">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="m9 15 2 2 4-4" />
            </svg>
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Review in progress
          </h1>

          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            We&apos;re reviewing your listing to make sure everything looks
            good. You&apos;ll get a confirmation soon.
          </p>

          <div className="mt-6">
            <Link
              href="/host/activities/new"
              className="inline-flex items-center rounded-md border border-input bg-transparent px-5 py-2 text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
            >
              List another activity
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
