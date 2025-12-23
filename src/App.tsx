// src/App.tsx
import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";

import { SupabaseProvider } from "./lib/supabaseClient";
import { supabase } from "./lib/supabase";
import { trackCurrentSession } from "./lib/sessions";

import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";

import { LoginModal } from "./components/auth/LoginModal";
import { SignupModal } from "./components/auth/SignUpModal";

import { CampDetailPage } from "./pages/CampDetailPage";
import HomePage from "./pages/HomePage";

// Settings pages
import { SettingsLayout } from "./pages/settings/SettingsLayout";
import { SettingsAccountPage } from "./pages/settings/SettingsAccountPage";
import { SettingsChildrenPage } from "./pages/settings/SettingsChildrenPage";
import { SettingsLoginPage } from "./pages/settings/SettingsLoginPage";
import { SettingsNotificationsPage } from "./pages/settings/SettingsNotificationsPage";

// Child detail (default export)
import ChildDetailPage from "./pages/ChildDetailPage";

import { NotificationsPage } from "./pages/NotificationsPage";
import MessagesPage from "./pages/messages/MessagesPage";

import { TermsPage } from "./pages/TermsPage";
import { PrivacyPage } from "./pages/PrivacyPage";

import SearchPage from "./pages/SearchPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import CheckoutCompletePage from "./pages/CheckoutCompletePage";

// Host
import { HostLayout } from "./pages/host/HostLayout";
import { HostListingsPage } from "./pages/host/HostListingsPage";
import { HostContactsPage } from "./pages/host/HostContactsPage";
import { HostFinancialsPage } from "./pages/host/HostFinancialsPage";
import { HostSettingsPage } from "./pages/host/HostSettingsPage";

// NEW: host apply + reviewing pages
import HostApplicationPage from "./pages/host/HostApplicationPage";
// If you already created this page under a different filename, update the import.
import HostReviewingPage from "./pages/host/HostReviewingPage";

// Activity detail (host)
import { ActivityLayoutPage } from "./pages/host/ActivityLayoutPage";
import { ActivityOverviewPage } from "./pages/host/ActivityOverviewPage";
import { ActivityGuestsPage } from "./pages/host/ActivityGuestsPage";
import { ActivityMorePage } from "./pages/host/ActivityMorePage";
import { ActivityGuestDetailPage } from "./pages/host/ActivityGuestDetailPage";

// Activity create / edit
import { CreateActivityPage } from "./pages/CreateActivityPage";
import { ActivityReviewPage } from "./pages/ActivityReviewPage";

// Activities (parent-facing)
import ActivitiesLayout from "./pages/activities/ActivitiesLayout";
import ActivitiesUpcomingPage from "./pages/activities/ActivitiesUpcomingPage";
import ActivitiesPastPage from "./pages/activities/ActivitiesPastPage";
import ActivitiesFavoritesPage from "./pages/activities/ActivitiesFavoritesPage";

// Help center
import { HelpPage } from "./pages/help/HelpPage";
import { HowBookingWorksPage } from "./pages/help/HowBookingWorksPage";
import { CancellationsRefundsPage } from "./pages/help/CancellationsRefundsPage";
import { ListingCampClassPage } from "./pages/help/ListingCampClassPage";
import { ManagingKidProfilesPage } from "./pages/help/ManagingKidProfilesPage";
import { MessagingHostsPage } from "./pages/help/MessagingHostsPage";
import { PaymentsPayoutsPage } from "./pages/help/PaymentsPayoutsPage";
import { ReviewsFeedbackPage } from "./pages/help/ReviewsFeedbackPage";
import { SafetyVerificationPage } from "./pages/help/SafetyVerificationPage";

// Calendars
import CalendarsLayout from "./pages/calendars/CalendarsLayout";
import MyCalendarPage from "./pages/calendars/MyCalendarPage";
import SharedCalendarsPage from "./pages/calendars/SharedCalendarsPage";
import CalendarDetailPage from "./pages/calendars/CalendarDetailPage";

// Profile (self + others)
import ProfilePage from "./pages/ProfilePage";

// Contact page
import ContactPage from "./pages/ContactPage";

// Data transparency page
import { DataTransparencyPage } from "./pages/DataTransparencyPage";

type ProtectedProps = {
  user: User | null;
  children: React.ReactNode;
};

const Protected: React.FC<ProtectedProps> = ({ user, children }) => {
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const navigate = useNavigate();

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  // Init user + listen for auth changes
  useEffect(() => {
    const initUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Error getting user:", error);
          setUser(null);
        } else {
          setUser(data.user ?? null);
          if (data.user) void trackCurrentSession();
        }
      } catch (err) {
        console.error("Error getting user:", err);
        setUser(null);
      }
    };

    void initUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void trackCurrentSession();

      // If they sign out while on /settings, kick them out immediately
      if (!session?.user && window.location.pathname.startsWith("/settings")) {
        navigate("/", { replace: true });
      }

      // If they sign out while on /host, kick them out too
      if (!session?.user && window.location.pathname.startsWith("/host")) {
        navigate("/", { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const refreshUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error refreshing user:", error);
        setUser(null);
      } else {
        setUser(data.user ?? null);
        if (data.user) void trackCurrentSession();
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
      setUser(null);
    }
  };

  const handleHostClick = () => {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    navigate("/host");
  };

  return (
    <SupabaseProvider>
      <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
        <Header
          user={user}
          onSignInClick={() => setLoginOpen(true)}
          onHostClick={handleHostClick}
        />

        <Routes>
          {/* Core app */}
          <Route path="/" element={<HomePage />} />
          <Route path="/camp/:slug" element={<CampDetailPage />} />

          {/* Checkout */}
          <Route path="/checkout/:campId" element={<CheckoutPage />} />
          <Route path="/checkout/complete" element={<CheckoutCompletePage />} />
          <Route
            path="/checkout/confirmed/:bookingId"
            element={<CheckoutCompletePage />}
          />

          {/* Search */}
          <Route path="/search" element={<SearchPage />} />

          {/* Contact */}
          <Route path="/contact" element={<ContactPage />} />

          {/* Data transparency */}
          <Route path="/data-transparency" element={<DataTransparencyPage />} />

          {/* ✅ Settings (protected) */}
          <Route
            path="/settings"
            element={
              <Protected user={user}>
                <SettingsLayout />
              </Protected>
            }
          >
            <Route index element={<SettingsAccountPage />} />
            <Route path="children" element={<SettingsChildrenPage />} />
            <Route path="child/:id" element={<ChildDetailPage />} />
            <Route path="login" element={<SettingsLoginPage />} />
            <Route path="notifications" element={<SettingsNotificationsPage />} />
          </Route>

          {/* Notifications & messages */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/messages" element={<MessagesPage />} />

          {/* Profile pages */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />

          {/* Activities - parent view */}
          <Route path="/activities" element={<ActivitiesLayout />}>
            <Route index element={<Navigate to="upcoming" replace />} />
            <Route path="upcoming" element={<ActivitiesUpcomingPage />} />
            <Route path="past" element={<ActivitiesPastPage />} />
            <Route path="favorites" element={<ActivitiesFavoritesPage />} />
          </Route>

          {/* Calendars */}
          <Route path="/calendars" element={<CalendarsLayout />}>
            <Route index element={<Navigate to="my" replace />} />
            <Route path="my" element={<MyCalendarPage />} />
            <Route path="shared" element={<SharedCalendarsPage />} />
          </Route>
          <Route path="/calendars/:calendarId" element={<CalendarDetailPage />} />

          {/* ✅ Host (protected) */}
          <Route
            path="/host"
            element={
              <Protected user={user}>
                <HostLayout />
              </Protected>
            }
          >
            {/* IMPORTANT: redirect index so Listings tab becomes active */}
            <Route index element={<Navigate to="listings" replace />} />

            {/* Pre-approval routes (HostLayout will allow these) */}
            <Route path="apply" element={<HostApplicationPage />} />
            <Route path="reviewing" element={<HostReviewingPage />} />

            {/* Approved dashboard */}
            <Route path="listings" element={<HostListingsPage />} />
            <Route path="contacts" element={<HostContactsPage />} />
            <Route path="financials" element={<HostFinancialsPage />} />
            <Route path="settings" element={<HostSettingsPage />} />

            {/* Host create listing */}
            <Route path="activities/new" element={<CreateActivityPage />} />
            <Route path="activities/review" element={<ActivityReviewPage />} />
            <Route path="activities/:activityId/edit" element={<CreateActivityPage />} />
          </Route>

          {/* Activity detail (host) - separate because it uses ActivityLayoutPage */}
          <Route path="/host/activities/:activityId" element={<ActivityLayoutPage />}>
            <Route index element={<ActivityOverviewPage />} />
            <Route path="overview" element={<ActivityOverviewPage />} />
            <Route path="guests" element={<ActivityGuestsPage />} />
            <Route path="more" element={<ActivityMorePage />} />
          </Route>

          <Route
            path="/host/activities/:activityId/guests/:guestId"
            element={<ActivityGuestDetailPage />}
          />

          {/* Activity create + review (parent-facing legacy routes) */}
          <Route path="/activities/new" element={<CreateActivityPage />} />
          <Route path="/activities/review" element={<ActivityReviewPage />} />

          {/* Help center */}
          <Route path="/help" element={<HelpPage />} />
          <Route path="/help/how-booking-works" element={<HowBookingWorksPage />} />
          <Route
            path="/help/cancellations-refunds"
            element={<CancellationsRefundsPage />}
          />
          <Route
            path="/help/listing-camp-class"
            element={<ListingCampClassPage />}
          />
          <Route
            path="/help/managing-kid-profiles"
            element={<ManagingKidProfilesPage />}
          />
          <Route path="/help/messaging-hosts" element={<MessagingHostsPage />} />
          <Route path="/help/payments-payouts" element={<PaymentsPayoutsPage />} />
          <Route path="/help/reviews-feedback" element={<ReviewsFeedbackPage />} />
          <Route
            path="/help/safety-verification"
            element={<SafetyVerificationPage />}
          />

          {/* Legal */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>

        <Footer />

        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSignedIn={refreshUser}
          onSwitchToSignup={() => {
            setLoginOpen(false);
            setSignupOpen(true);
          }}
        />

        <SignupModal
          isOpen={signupOpen}
          onClose={() => setSignupOpen(false)}
          onSignedUp={refreshUser}
          onSwitchToLogin={() => {
            setSignupOpen(false);
            setLoginOpen(true);
          }}
        />
      </div>
    </SupabaseProvider>
  );
};

export default App;
