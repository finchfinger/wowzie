"use client";

import Link from "next/link";

type HelpArticleLayoutProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function HelpArticleLayout({
  title,
  description,
  children,
}: HelpArticleLayoutProps) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/help"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span aria-hidden="true" className="mr-1">&larr;</span>
          Back to Help Center
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center rounded-md border border-input px-4 py-1.5 text-sm font-medium text-foreground hover:bg-gray-50 transition-colors shrink-0"
        >
          Contact us
        </Link>
      </div>

      {/* Article body */}
      <article className="prose prose-sm max-w-none text-foreground">
        {children}
      </article>
    </main>
  );
}
