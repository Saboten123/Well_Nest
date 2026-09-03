import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig, queryClient } from "./config/wagmi";

import LandingPage from "./pages/LandingPage";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";

import DoctorsPage from "./pages/DoctorsPage";
import PendingAppointmentsPage from "./pages/PendingAppointmentsPage";
import ScheduledAppointmentsPage from "./pages/ScheduledAppointmentsPage";
import PatientAppointmentsPage from "./pages/PatientAppointmentsPage";

import NGOsPage from "./pages/NGOsPage";
import HealthWorkersPage from "./pages/HealthWorkersPage";
import Payment from "./pages/payment";
import ProfilePage from "./pages/ProfilePage";
import BlogsPage from "./pages/BlogsPage";

//outbreak components
import OutbreakPage from "./pages/OutBreakPage";

import WebRTCVideoCall from "./pages/WebRtc";

// Events components
import EventsMainPage from "./pages/events/EventsMainPage";
import EventsListPage from "./pages/events/EventsListPage";
import OrganizeEventForm from "./pages/events/OrganizeEventForm";
import EventParticipantsPage from "./pages/events/EventParticipantsPage";
import ParticipantRegistration from "./pages/events/ParticipantRegistration";

// import ChatPage from "./pages/ChatPage";

import AIChatPage from "./pages/AiChatPage";

import "./styles/main.css";

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/video-call" element={<WebRTCVideoCall />} />

              <Route path="/doctors" element={<DoctorsPage />} />
              {/* Appointment Routes */}
              <Route
                path="/pending-appointments"
                element={<PendingAppointmentsPage />}
              />
              <Route
                path="/scheduled-appointments"
                element={<ScheduledAppointmentsPage />}
              />
              <Route
                path="/my-appointments"
                element={<PatientAppointmentsPage />}
              />

              <Route path="/ngos" element={<NGOsPage />} />
              <Route path="/healthworkers" element={<HealthWorkersPage />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/outbreak" element={<OutbreakPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/blogs" element={<BlogsPage />} />

              <Route path="/assistant" element={<AIChatPage />} />

              {/* Events Routes */}
              <Route path="/events" element={<EventsMainPage />} />
              <Route path="/events/:eventType" element={<EventsListPage />} />
              <Route
                path="/events/organize/:eventType"
                element={<OrganizeEventForm />}
              />
              <Route
                path="/events/participants/:eventId"
                element={<EventParticipantsPage />}
              />
              <Route
                path="/events/register/:eventId"
                element={<ParticipantRegistration />}
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
