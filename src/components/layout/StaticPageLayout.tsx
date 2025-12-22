import React from "react";
import { Container } from "./Container";

type StaticPageLayoutProps = {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
};

export const StaticPageLayout: React.FC<StaticPageLayoutProps> = ({
  title,
  lastUpdated,
  children,
}) => {
  return (
    <main className="bg-wowzie-surface">
      <Container className="py-12">
        <div className="max-w-3xl">
          {/* Title + meta */}
          <header className="mb-8 space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight text-wowzie-text sm:text-3xl">
              {title}
            </h1>

            {lastUpdated && (
              <div className="inline-flex items-center rounded-full border border-wowzie-borderSubtle bg-white/70 px-3 py-1 text-xs text-wowzie-text-subtle">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-wowzie-border" />
                Last updated on {lastUpdated}
              </div>
            )}
          </header>

          {/* Body content */}
          <div className="space-y-6 text-sm leading-relaxed text-wowzie-text">
            {children}
          </div>
        </div>
      </Container>
    </main>
  );
};
