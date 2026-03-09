# Release Plan

**Release Name:** Release v1.0.0

### Release Objectives
This release aims to implement the appointment workflow and communication features for the platform, including appointment booking and management, doctor schedule viewing, doctor availability intervals, patient-doctor messaging, clinic map location, appointment summaries, appointment history, waitlist notifications, patient reviews, and database migration support.  
Patients are able to book appointments and receive confirmation/reminder emails.  
Patients are able to view their upcoming and past appointments and manage them.  
Doctors are able to view their schedules and patient details for each appointment.  
Doctors are able to set their availability on intervals of time with fixed duration.  
Doctors are able to reschedule or cancel appointments.  
Doctors are able to write appointment summaries and view patient appointment history + past summaries (when permitted).  
Patients are able to connect with and message doctors.  
Patients are able to join a waitlist and receive notifications when appointments are cancelled.  
Patients are able to rate and review a doctor after an appointment.  
Patients are able to view and choose available doctors on a map.  
Doctors are able to choose their clinic address on a map.  
The system supports database migration files and synchronization.  
The questionnaire progress bar is fixed to correctly show the current progress.

### Specific Goals

#### Appointment Booking and Management
- Allow patients to book an appointment (virtual/in-person) and receive confirmation/reminder email.
- Allow patients to see their upcoming and past appointments.
- Allow patients to manage appointments (view/reschedule/cancel) when permitted.
- Allow doctors to reschedule or cancel appointments to handle scheduling conflicts.
- Appointment status changes must be reflected to both patient and doctor.
- No double-booking should happen on the same doctor timeslot.

#### Doctor Schedule and Availability
- Allow doctors to view their schedule (upcoming/past).
- Allow doctors to view patient details for each appointment.
- Allow doctors to set their availability on intervals of time with fixed duration.
- Availability must support fixed timeslot durations.
- Overlapping doctor availability should not be accepted.

#### Appointment Summary and History
- Allow doctors to write a summary for each patient appointment.
- Allow doctors to view a patient’s appointment history and past summaries when permitted.
- Appointment summaries must be connected to the correct patient and appointment.
- Unauthorized users must not be able to access appointment summaries or patient history.

#### Messaging and Notifications
- Allow patients to connect with and message a doctor to ask questions.
- Allow doctors to connect with and chat with patients regarding appointments or related concerns.
- Allow patients to join a waitlist and receive notifications when appointments are cancelled.
- Notification emails should be sent for booking confirmation, reminders, and cancelled appointments when needed.

#### Maps and Clinic Address
- Allow patients to view and choose available doctors on a map.
- Allow doctors to choose their clinic address on a map.
- Clinic address/location must be saved correctly and displayed to patients.

#### Review and Rating
- Allow patients to rate and review a doctor after an appointment.
- Only patients with eligible appointments should be able to submit a rating/review.

#### Database and UI Improvements
- Support database migration file and synchronization instead of relying only on forced Sequelize sync.
- Fix progress bar on questionnaire. On second question, the progress bar should touch the second circle.

## Metrics for Measurement

### Appointment Booking and Management
- 100% of booked appointments are inserted successfully in database.
- Appointment booking response time <= 2 seconds.
- 100% of successful bookings trigger confirmation email.
- 90% of reminder emails are generated successfully on the first attempt.
- 100% of appointment cancellations and reschedules are reflected in the system within <= 2 seconds.
- 0 double-booked doctor timeslots are accepted.
- 100% of appointment updates are visible to both patient and doctor.

### Doctor Schedule and Availability
- 100% of schedule entries can only be created/updated by the correct doctor account.
- 100% of doctor schedules are visible to the corresponding doctor.
- 100% of patient details for each appointment are displayed correctly to the doctor.
- 100% of fixed-duration availability entries are saved successfully in database.
- 0 overlapping time intervals are allowed within the same doctor’s schedule.
- 0 invalid duration values (e.g. negative, zero, null) are accepted.
- Availability updates are reflected in the system within <= 2 seconds.

### Appointment Summary and History
- 100% of appointment summaries are saved successfully in database.
- 100% of summaries are linked to the correct appointment and patient.
- 100% of authorized doctors can view patient appointment history and past summaries when permitted.
- 0 unauthorized users are able to access patient summaries/history.
- Summary save/update response time <= 2 seconds.
- 0 data loss occurs during summary creation or retrieval.

### Messaging and Notifications
- Message send/load response time <= 2 seconds.
- 100% of messages are linked to the correct doctor-patient conversation.
- 100% of waitlist registrations are saved successfully.
- 100% of cancellation notifications are triggered for waitlisted patients when applicable.
- 0 system crashes occur during messaging, waitlist, or notification workflow.

### Maps and Clinic Address
- 100% of doctors with valid location data appear correctly on the map.
- Map-based doctor results are displayed within <= 3 seconds.
- 100% of saved clinic addresses/locations are retrievable and displayed correctly.
- 0 invalid map location submissions are accepted without validation.

### Review and Rating
- 100% of ratings/reviews are linked to a valid patient and appointment.
- 0 ratings/reviews are accepted from unauthorized or ineligible users.
- Review submission response time <= 2 seconds.
- 100% of saved ratings/reviews are retrievable for display.

### Database and UI Improvements
- 100% of schema changes for this release are included in migration files.
- Migration execution completes without data corruption.
- 0 unexpected destructive schema resets occur in normal workflow.
- Questionnaire progress bar correctly matches the active question step in 100% of tested cases.

## Release Scope
Outline what is included in and excluded from the release, detailing key features or improvements, bug fixes, non-functional requirements, etc.

### Included Features

#### Appointment Booking and Management
- Book appointment + confirmation/reminders email (SCRUM-13): Patients can book appointments and receive related emails.
- Patient manages appointments (SCRUM-14): Patients can see upcoming/past appointments and manage them.
- Doctor reschedules or cancels appointments (SCRUM-22): Doctors can handle schedule conflicts by updating appointment status.
- Waitlist + notifications (SCRUM-17): Patients can join a waitlist and receive notification if appointments are cancelled.

#### Doctor Schedule and Availability
- Doctor views own schedule + patient details (SCRUM-21): Doctors can see appointment schedules and related patient information.
- Doctor sets availability with fixed duration intervals (SCRUM-36): Doctors can define appointment availability in fixed timeslots.

#### Appointment Summary and History
- Doctor writes appointment summary (SCRUM-25): Doctors can record important notes and outcomes for each appointment.
- Doctor views patient appointment history + past summaries (SCRUM-24): Doctors can access previous appointment information when permitted.

#### Messaging and Communication
- Patient messages doctor (SCRUM-15): Patients can ask questions or clarify concerns with doctors.
- Doctor chats with patients (SCRUM-23): Doctors can communicate with patients regarding appointments or related matters.

#### Maps and Clinic Address
- Patient views and chooses available doctors on a map (SCRUM-10): Patients can use map/GPS support to find nearby doctors.
- Doctor chooses clinic address on a map (SCRUM-34): Doctors can set their clinic location for patients to view.

#### Review and Rating
- Patient rates and reviews a doctor (SCRUM-16): Patients can leave feedback after appointments.

#### Technical / System Improvements
- Database migration file and synchronization (SCRUM-35): System schema changes can be managed through migration files.
- Questionnaire progress bar fix (SCRUM-37): Progress bar on questionnaire correctly reaches the second circle on question two.

### Excluded Features
- Advanced AI-Based Recommendation Algorithm  
The current release still focuses on appointment workflow and uses the existing recommendation/filtering behavior from previous releases. More advanced personalization or AI-based doctor matching is planned for future improvement.
- External Calendar Integration  
This release does not include synchronization with third-party calendar systems such as Google Calendar or Outlook. Scheduling is handled only inside the platform for now.
- Review Moderation Tools  
Patients can submit ratings/reviews in this release, but moderation features such as reporting, hiding, or admin review management are not included yet.
- SMS / Push Notifications  
The current release focuses on email-based notifications. SMS or mobile push notification support is planned for future releases.

## Bug Fixes
- [Medium Priority, SCRUM-37] Progress bar on questionnaire. On second question, the progress bar should touch the second circle.  
  Now, the progress bar correctly reaches the second circle when the user is on the second question.

## Non-Functional Requirements

### Performance
- Appointment booking response time <= 2 seconds
- Messaging response time <= 2 seconds
- Schedule loading time <= 3 seconds
- Map-based doctor loading time <= 3 seconds
- Appointment updates reflected within <= 2 seconds

### Security
- Only authenticated users can access appointment, messaging, and review features.
- Only verified doctors can access doctor-specific schedule, summary, and appointment management features.
- Backend check and control all role-based (i.e. patient, doctor, system admin) access.
- Appointment summaries and patient history must be protected by authorization checks.
- Backend sanity check for all predefined values shown in frontend (e.g. invalid fixed-duration availability or invalid appointment changes cannot be accepted).

### Usability
- Appointment information is displayed clearly for both doctor and patient.
- Error messages displayed clearly for invalid appointment, schedule, location, or messaging inputs.
- Doctor information and clinic location are displayed clearly on list/map view.
- Progress indicator on questionnaire correctly shows user progress.

## Dependencies and Limitations

### Dependencies
- SMTP email service provider for booking confirmation, reminder, and waitlist/cancellation notification functionality.
- Map/geolocation service provider for doctor map view and clinic address selection.
- Database migration support in Sequelize for schema versioning and synchronization.
- Existing authentication, doctor verification, questionnaire, and doctor filtering features from previous release.

### Limitations
- Current release still relies on email notifications and does not support SMS/push notification delivery.
- Messaging is limited to in-platform communication between doctor and patient.
- Ratings/reviews do not yet include advanced moderation workflow.
- Current release uses local PostgreSQL database which is not production-hosted, so data persistence, accessibility across deployments, and reliability (backups/availability) are limited.

