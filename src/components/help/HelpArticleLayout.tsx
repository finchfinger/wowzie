import React from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "../layout/SectionHeader";
import { Button } from "../ui/Button";

type HelpArticleLayoutProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export const HelpArticleLayout: React.FC<HelpArticleLayoutProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <main className="flex-1 bg-rose-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link
              to="/help"
              className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              <span aria-hidden="true" className="mr-1">
                &larr;
              </span>
              Back to Help Center
            </Link>
          </div>

          <SectionHeader
            title={title}
            description={description}
            rightSlot={
              <Link to="/contact">
                <Button size="sm" variant="outline">
                  Contact us
                </Button>
              </Link>
            }
          />

          <div className="mt-8 prose prose-sm md:prose-base max-w-none text-gray-800">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
};
