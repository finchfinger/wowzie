// src/pages/calendars/CalendarDetailPage.tsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { Container } from "../../components/layout/Container";

const CalendarDetailPage: React.FC = () => {
  const { calendarId } = useParams<{ calendarId: string }>();

  return (
    <main className="flex-1 bg-gray-100">
      <Container className="py-10">
        <Link
          to="/calendars"
          className="text-xs text-gray-600 hover:text-gray-900"
        >
          ← Back to Calendars
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-gray-900">
          {calendarId ? `${calendarId}’s Calendar` : "Calendar"}
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Calendar detail content will go here.
        </p>
      </Container>
    </main>
  );
};

export default CalendarDetailPage;
