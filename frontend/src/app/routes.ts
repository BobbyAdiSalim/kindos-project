import { createBrowserRouter } from 'react-router';
import { RootLayout } from '@/app/components/layout/root-layout';
import { RequireAdminRoute, RequireDoctorRoute, RequirePatientRoute } from '@/app/components/auth/protected-route';
import { Landing } from '@/app/pages/landing';
import { Login } from '@/app/pages/auth/login';
import { Register } from '@/app/pages/auth/register';
import { ForgotPassword } from '@/app/pages/auth/forgot-password';
import { ResetPassword } from '@/app/pages/auth/reset-password';

// Patient pages
import { PatientDashboard } from '@/app/pages/patient/dashboard';
import { PatientProfile } from '@/app/pages/patient/profile';
import { NeedsQuestionnaire } from '@/app/pages/patient/questionnaire';
import { ProviderDiscovery } from '@/app/pages/patient/provider-discovery';
import { ProviderMap } from '@/app/pages/patient/provider-map';
import { DoctorProfile } from '@/app/pages/patient/doctor-profile';
import { Booking } from '@/app/pages/patient/booking';
import { BookingConfirmation } from '@/app/pages/patient/booking-confirmation';
import { AppointmentDetail } from '@/app/pages/patient/appointment-detail';
import { Messaging } from '@/app/pages/patient/messaging';
import { WriteReview } from '@/app/pages/patient/write-review';
import { JoinWaitlist } from '@/app/pages/patient/waitlist';

// Doctor pages
import { DoctorDashboard } from '@/app/pages/doctor/dashboard';
import { DoctorProfileEdit } from '@/app/pages/doctor/profile';
import { AvailabilitySetup } from '@/app/pages/doctor/availability';
import { DoctorSchedule } from '@/app/pages/doctor/schedule';
import { DoctorAppointmentDetail } from '@/app/pages/doctor/appointment-detail';
import { PatientHistory } from '@/app/pages/doctor/patient-history';
import { AppointmentSummary } from '@/app/pages/doctor/appointment-summary';
import { VerificationStatus } from '@/app/pages/doctor/verification-status';

// Admin pages
import { AdminDashboard } from '@/app/pages/admin/dashboard';
import { VerificationQueue } from '@/app/pages/admin/verification-queue';
import { Analytics } from '@/app/pages/admin/analytics';

// Design system
import { ComponentLibrary } from '@/app/pages/components';

// Not found
import { NotFound } from '@/app/pages/not-found';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Landing },
      { path: 'login', Component: Login },
      { path: 'register', Component: Register },
      { path: 'forgot-password', Component: ForgotPassword },
      { path: 'reset-password/:token', Component: ResetPassword },
      { path: 'components', Component: ComponentLibrary },

      // Patient routes
      {
        path: 'patient',
        Component: RequirePatientRoute,
        children: [
          { path: 'dashboard', Component: PatientDashboard },
          { path: 'profile', Component: PatientProfile },
          { path: 'questionnaire', Component: NeedsQuestionnaire },
          { path: 'providers', Component: ProviderDiscovery },
          { path: 'providers/map', Component: ProviderMap },
          { path: 'doctor/:id', Component: DoctorProfile },
          { path: 'booking/:doctorId', Component: Booking },
          { path: 'booking/confirmation', Component: BookingConfirmation },
          { path: 'appointment/:id', Component: AppointmentDetail },
          { path: 'messages', Component: Messaging },
          { path: 'review/:appointmentId', Component: WriteReview },
          { path: 'waitlist', Component: JoinWaitlist },
        ],
      },

      // Doctor routes
      {
        path: 'doctor',
        Component: RequireDoctorRoute,
        children: [
          { path: 'dashboard', Component: DoctorDashboard },
          { path: 'profile', Component: DoctorProfileEdit },
          { path: 'availability', Component: AvailabilitySetup },
          { path: 'schedule', Component: DoctorSchedule },
          { path: 'appointment/:id', Component: DoctorAppointmentDetail },
          { path: 'patient/:patientId/history', Component: PatientHistory },
          { path: 'appointment/:id/summary', Component: AppointmentSummary },
          { path: 'verification', Component: VerificationStatus },
        ],
      },

      // Admin routes
      {
        path: 'admin',
        Component: RequireAdminRoute,
        children: [
          { path: 'dashboard', Component: AdminDashboard },
          { path: 'verification', Component: VerificationQueue },
          { path: 'analytics', Component: Analytics },
        ],
      },

      { path: '*', Component: NotFound },
    ],
  },
]);
