// src/App.tsx
import React, { useEffect, useState, Suspense, lazy } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Routes,
  Route,
  useNavigate,
  Navigate,
  useLocation,
} from "react-router-dom";

import { SupabaseProvider } from "./lib/supabaseClient";
import { supabase } from "./lib/supabase";
import { trackCurrentSession } from "./lib/sessions";
import { initGA } from "./lib/ga";

import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";

import { LoginModal } from "./components/auth/LoginModal";
import { SignupModal } from "./components/auth/SignUpModal";

type ProtectedProps = {
  user: User | null;
  children: React.ReactNode;
};

const Protected: React.FC<ProtectedProps> = ({ user, children }) => {
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const LoadingShell: React.FC = () => (
  <div className="px-4 sm:px-6 py-8 text-sm text-wowzie-text-subtle">
    Loading…
  </div>
);

/**
 * Lazy pages
 * - Default exports: lazy(() => import("..."))
 * - Named exports: lazy(() => import("...").then(m => ({ default: m.Named })))
 */

// Core
const HomePage = lazy(() => import("./pages/HomePage"));
const CampDetailPage = lazy(() =>
  import("./pages/CampDetailPage").then((m) => ({ default: m.CampDetailPage }))
);

// Settings (named exports)
const SettingsLayout = lazy(() =>
  import("./pages/settings/SettingsLayout").then((m) => ({
    default: m.SettingsLayout,
  }))
);
const SettingsAccountPage = lazy(() =>
  import("./pages/settings/SettingsAccountPage").then((m) => ({
    default: m.SettingsAccountPage,
  }))
);
const SettingsChildrenPage = lazy(() =>
  import("./pages/settings/SettingsChildrenPage").then((m) => ({
    default: m.SettingsChildrenPage,
  }))
);
const SettingsLoginPage = lazy(() =>
  import("./pages/settings/SettingsLoginPage").then((m) => ({
    default: m.SettingsLoginPage,
  }))
);
const SettingsNotificationsPage = lazy(() =>
  import("./pages/settings/SettingsNotificationsPage").then((m) => ({
    default: m.SettingsNotificationsPage,
  }))
);

// Child detail (default export)
const ChildDetailPage = lazy(() => import("./pages/ChildDetailPage"));

// Notifications & messages
const NotificationsPage = lazy(() =>
  import("./pages/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  }))
);
const MessagesPage = lazy(() => import("./pages/messages/MessagesPage"));

// Legal
const TermsPage = lazy(() =>
  import("./pages/TermsPage").then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = lazy(() =>
  import("./pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage }))
);

// Search + checkout
const SearchPage = lazy(() => import("./pages/SearchPage"));
const CheckoutPage = lazy(() =>
  import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage }))
);
const CheckoutCompletePage = lazy(() => import("./pages/CheckoutCompletePage"));

// Host
const HostLayout = lazy(() =>
  import("./pages/host/HostLayout").then((m) => ({ default: m.HostLayout }))
);
const HostListingsPage = lazy(() =>
  import("./pages/host/HostListingsPage").then((m) => ({
    default: m.HostListingsPage,
  }))
);
const HostContactsPage = lazy(() =>
  import("./pages/host/HostContactsPage").then((m) => ({
    default: m.HostContactsPage,
  }))
);
const HostFinancialsPage = lazy(() =>
  import("./pages/host/HostFinancialsPage").then((m) => ({
    default: m.HostFinancialsPage,
  }))
);
const HostSettingsPage = lazy(() =>
  import("./pages/host/HostSettingsPage").then((m) => ({
    default: m.HostSettingsPage,
  }))
);

const HostApplicationPage = lazy(() => import("./pages/host/HostApplicationPage"));
const HostReviewingPage = lazy(() => import("./pages/host/HostReviewingPage"));

// Activity detail (host)
const ActivityLayoutPage = lazy(() =>
  import("./pages/host/ActivityLayoutPage").then((m) => ({
    default: m.ActivityLayoutPage,
  }))
);
const ActivityOverviewPage = lazy(() =>
  import("./pages/host/ActivityOverviewPage").then((m) => ({
    default: m.ActivityOverviewPage,
  }))
);
const ActivityGuestsPage = lazy(() =>
  import("./pages/host/ActivityGuestsPage").then((m) => ({
    default: m.ActivityGuestsPage,
  }))
);
const ActivityMorePage = lazy(() =>
  import("./pages/host/ActivityMorePage").then((m) => ({
    default: m.ActivityMorePage,
  }))
);
const ActivityGuestDetailPage = lazy(() =>
  import("./pages/host/ActivityGuestDetailPage").then((m) => ({
    default: m.ActivityGuestDetailPage,
  }))
);

// Activity create / review
const CreateActivityPage = lazy(() => import("./pages/CreateActivityPage"));

const ActivityReviewPage = lazy(() =>
  import("./pages/ActivityReviewPage").then((m) => ({
    default: m.ActivityReviewPage,
  }))
);

// Activities (parent-facing)
const ActivitiesLayout = lazy(() => import("./pages/activities/ActivitiesLayout"));
const ActivitiesUpcomingPage = lazy(() =>
  import("./pages/activities/ActivitiesUpcomingPage")
);
const ActivitiesPastPage = lazy(() => import("./pages/activities/ActivitiesPastPage"));
const ActivitiesFavoritesPage = lazy(() =>
  import("./pages/activities/ActivitiesFavoritesPage")
);

// Help center
const HelpPage = lazy(() =>
  import("./pages/help/HelpPage").then((m) => ({ default: m.HelpPage }))
);
const HowBookingWorksPage = lazy(() =>
  import("./pages/help/HowBookingWorksPage").then((m) => ({
    default: m.HowBookingWorksPage,
  }))
);
const CancellationsRefundsPage = lazy(() =>
  import("./pages/help/CancellationsRefundsPage").then((m) => ({
    default: m.CancellationsRefundsPage,
  }))
);
const ListingCampClassPage = lazy(() =>
  import("./pages/help/ListingCampClassPage").then((m) => ({
    default: m.ListingCampClassPage,
  }))
);
const ManagingKidProfilesPage = lazy(() =>
  import("./pages/help/ManagingKidProfilesPage").then((m) => ({
    default: m.ManagingKidProfilesPage,
  }))
);
const MessagingHostsPage = lazy(() =>
  import("./pages/help/MessagingHostsPage").then((m) => ({
    default: m.MessagingHostsPage,
  }))
);
const PaymentsPayoutsPage = lazy(() =>
  import("./pages/help/PaymentsPayoutsPage").then((m) => ({
    default: m.PaymentsPayoutsPage,
  }))
);
const ReviewsFeedbackPage = lazy(() =>
  import("./pages/help/ReviewsFeedbackPage").then((m) => ({
    default: m.ReviewsFeedbackPage,
  }))
);
const SafetyVerificationPage = lazy(() =>
  import("./pages/help/SafetyVerificationPage").then((m) => ({
    default: m.SafetyVerificationPage,
  }))
);

// Calendars
const CalendarsLayout = lazy(() => import("./pages/calendars/CalendarsLayout"));
const MyCalendarPage = lazy(() => import("./pages/calendars/MyCalendarPage"));
const SharedCalendarsPage = lazy(() =>
  import("./pages/calendars/SharedCalendarsPage")
);
const CalendarDetailPage = lazy(() =>
  import("./pages/calendars/CalendarDetailPage")
);

// Profile (named export)
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);

// Contact
const ContactPage = lazy(() => import("./pages/ContactPage"));

// Data transparency
const DataTransparencyPage = lazy(() =>
  import("./pages/DataTransparencyPage").then((m) => ({
    default: m.DataTransparencyPage,
  }))
);

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const gaId = (import.meta.env.VITE_GA_MEASUREMENT_ID || "").trim();

  // ---- GA init (once) ----
  useEffect(() => {
    if (!gaId) return;
    initGA(gaId);
  }, [gaId]);

  // ---- GA pageviews for SPA ----
  useEffect(() => {
    if (!gaId) return;
    if (typeof window === "undefined") return;
    if (!window.gtag) return;

    window.gtag("event", "page_view", {
      page_path: location.pathname + location.search,
    });
  }, [gaId, location.pathname, location.search]);

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

      if (!session?.user && window.location.pathname.startsWith("/settings")) {
        navigate("/", { replace: true });
      }

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
      {/* App shell background: light gray */}
      <div className="min-h-screen flex flex-col bg-wowzie-surfaceSubtle text-wowzie-text">
        <Header
          user={user}
          onSignInClick={() => setLoginOpen(true)}
          onHostClick={handleHostClick}
        />

        {/* Main fills remaining height so footer stays below the fold */}
        <main id="app-main" className="flex-1">
          <Suspense fallback={<LoadingShell />}>
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

              {/* Settings (protected) */}
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

              {/* Activities */}
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

              {/* Host (protected) */}
              <Route
                path="/host"
                element={
                  <Protected user={user}>
                    <HostLayout />
                  </Protected>
                }
              >
                <Route index element={<Navigate to="listings" replace />} />
                <Route path="apply" element={<HostApplicationPage />} />
                <Route path="reviewing" element={<HostReviewingPage />} />
                <Route path="listings" element={<HostListingsPage />} />
                <Route path="contacts" element={<HostContactsPage />} />
                <Route path="financials" element={<HostFinancialsPage />} />
                <Route path="settings" element={<HostSettingsPage />} />
                <Route path="activities/new" element={<CreateActivityPage />} />
                <Route path="activities/review" element={<ActivityReviewPage />} />
                <Route path="activities/:activityId/edit" element={<CreateActivityPage />} />
              </Route>

              {/* Activity detail (host) - shareable tab URLs */}
              <Route
                path="/host/activities/:activityId"
                element={<ActivityLayoutPage />}
              >
                {/* Base route redirects to a shareable Overview URL */}
                <Route index element={<Navigate to="overview" replace />} />

                <Route path="overview" element={<ActivityOverviewPage />} />
                <Route path="guests" element={<ActivityGuestsPage />} />
                <Route path="guests/:guestId" element={<ActivityGuestDetailPage />} />
                <Route path="more" element={<ActivityMorePage />} />
              </Route>

              {/* Activity create + review (legacy routes) */}
              <Route path="/activities/new" element={<CreateActivityPage />} />
              <Route path="/activities/review" element={<ActivityReviewPage />} />

              {/* Help center */}
              <Route path="/help" element={<HelpPage />} />
              <Route
                path="/help/how-booking-works"
                element={<HowBookingWorksPage />}
              />
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
          </Suspense>
        </main>

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
