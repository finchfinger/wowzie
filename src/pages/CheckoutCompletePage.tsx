// src/pages/CheckoutCompletePage.tsx
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";

const CheckoutCompletePage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const bookingId = params.get("bookingId");

  return (
    <main className="flex-1 bg-gray-100">
      <Container className="py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <span className="text-2xl">✅</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold">Request confirmed!</h1>
          <p className="mt-2 text-sm text-gray-600">Confirmation information</p>

          {bookingId && (
            <p className="mt-3 text-xs text-gray-500">
              Booking ID: <span className="font-mono">{bookingId}</span>
            </p>
          )}

          <div className="mt-8 flex items-center justify-center gap-3">
            <Button onClick={() => navigate("/search")} className="rounded-full">
              Find more activities
            </Button>
          </div>
        </div>
      </Container>
    </main>
  );
};

export default CheckoutCompletePage;
