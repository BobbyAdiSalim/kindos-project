# What's New
## v1.2.1
- **Canary CD Pipeline:** Backend deployments now use a canary release flow with readiness, health, smoke, and log-based analysis before promotion to full traffic.

## v1.2.0
- **Automated CI Pipeline:** Pull requests and pushes now run linting, unit tests, and security checks automatically to catch issues before deployment.
- **Parallel CI Jobs and Caching:** Independent CI jobs run in parallel with caching improvements to reduce feedback time and keep pipeline runs efficient.
- **Container Build and Registry Publish:** Pushes to the main deployment branch automatically build backend Docker images and publish the latest tag to the registry.
- **Manual Deployment Triggers:** CI/CD workflows now support manual triggering for controlled validation and release operations.
- **Caregiver Multi-Patient Management:** Caregivers are able to manage multiple patient profiles under one account to support family or assisted-care workflows.
- **Admin Booking Analytics:** Administrators are able to view booking analytics dashboards to monitor appointment volume and usage trends.

## v1.1.0
- **Security Improvement:** Sensitive doctor information is no longer stored in clear text on the client side.
- **Time Zone Support:** Patients and doctors are able to view appointment times in their local or selected time zone.
- **Document Sharing in Messaging:** Doctors are able to send documents to patients, and patients are able to receive and review those documents in conversations.
- **Messaging Control:** Only doctors are able to initiate new message threads to reduce spam.
- **Care Type Selection:** Doctors are able to select provided care types during registration, and patients are able to select required care type (including "Don't know") in the questionnaire.
- **Appointment Rejection Reasons:** Doctors are required to choose a predefined rejection reason when rejecting appointments.
- **Testing Improvements:** A unit testing framework is set up, and critical unit tests are added for key features such as authentication and messaging.

## v1.0.0
- **User Authentication:** All users are able to register and login to their account using their credentials.
- **Doctor Verification:** Doctors are able to register and submit documents for verification, and system administrators are able to verify doctors.
- **Availability Management:** Doctors are able to set their availability for patients' appointments on intervals of time with fixed duration.
- **Needs Questionnaire:** Patients are able to fill questionnaires about their needs, and the questionnaire progress bar is fixed to correctly show the current progress.
- **Doctor Recommendation and Filtering:** Patients are able to view and filter the list of recommended doctors.
- **Appointment Booking and Management:** Patients are able to book appointments, receive confirmation/reminder emails, and view and manage their upcoming and past appointments.
- **Doctor Schedule and Appointment Management:** Doctors are able to view their schedules and patient details for each appointment, and reschedule or cancel appointments.
- **Appointment Summaries and Patient History:** Doctors are able to write appointment summaries and view patient appointment history and past summaries when permitted.
- **Patient-Doctor Messaging:** Patients are able to connect with and message doctors.
- **Waitlist Notifications:** Patients are able to join a waitlist and receive notifications when appointments are cancelled.
- **Doctor Reviews and Ratings:** Patients are able to rate and review a doctor after an appointment.
- **Map Integration:** Patients are able to view and choose available doctors on a map, and doctors are able to choose their clinic address on a map.
