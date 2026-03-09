
# Release Plan

**Release Name:** Release v0.1.0

## Release Objectives
Detail the primary goals for the sprint N release. Each objective should be Specific, Measurable, Achievable, Relevant, and Time-bound (SMART).

### Release Objectives
This release aims to implement the core workflow for the platform, including authentication, doctor verification, availability management, patient questionnaires submission, doctor recommendation and filtering.  
All users are able register and login to their account using their credentials.  
Doctors are able to register himself and submit documents for verification.  
System administrators are able to verify doctors.  
Doctors are able to set their availability for patients’ appointments.  
Patients are able to fill questionnaires about their needs.  
Patients are able to view and filter the list of recommended doctors.

### Specific Goals

#### User Authentication
- Allow users to register using unique email and password
- Allow registered users to login using their registered email and password.
- Allow users to reset their registered account password using their registered email.
- No two or more accounts with the same email.
- Must include the option to login and register as a Patient or a Doctor, and login as System Administrator.
- Must include a document and additional fields (Specialty, Clinic address) required for Doctor status verification submission on doctor registration.

#### Doctor Verification
- Allow system administrators to review doctors’ registration forms and documents.
- Allow system administrators to approve or reject doctors verification submission with explicit reasons.
- Doctors should not be able to access all its role features before being verified by a system administrator.
- Doctors should be able to resubmit their verification document after their documents are rejected by a system administrator.

#### Doctor Availability
- Allow verified doctors to set their weekly availability for appointments.
- Allow verified doctors to set their availability for specific time (outside of the weekly availability) for appointments,
- Allow verified doctors to set durations and type of meeting (in-person or virtual) for each availability.

#### Patient Questionnaire Submission
- Allow patients to complete a structured questionnaire describing their needs before booking appointments.
- Questionnaires are all multiple choices and each combination of answers should map to a set of doctors with a specific specialty. This will be the patients’ recommended doctors.

#### Doctor Recommendation and Filtering
- After filling questionnaires, patients should be able to view a list of recommended doctors (name, address, specialty)
- Allow patients to filter the doctors by criteria such as specialty and availability.
- Only display a list of verified doctors.

## Metrics for Measurement

### User Authentication
- Authentication (both login and register) response time <= 2 seconds.
- 0 duplicate registered email.
- Email and password (hashed) inserted successfully in database after registration.
- 90% of password reset requests generate a reset email on the first attempt.
- Reset link expires within a defined time frame (i.e. 60 minutes).
- 100% of used reset tokens become invalid after successful reset.
- Password updated successfully in database after reset

### Doctor Verification
- 100% of submitted doctor registration forms are visible in the admin dashboard.
- 100% of uploaded verification documents are accessible and viewable by system administrators.
- Verification decision (approve/reject) is updated in the database within ≤ 1 second.
- 100% of approval or rejection actions require a mandatory reason before submission.
- 100% of verification decisions are logged in the system audit records.
- 0 unverified doctors are able to access restricted doctor-only features.
- 100% of rejected doctors are able to resubmit verification documents.
- Resubmitted applications automatically update status to “Pending” after submission.
- 0 data loss occurs during document resubmission.

### Doctor Availability
- 100% of availability entries can only be created by verified doctors on their own account.
- 100% of weekly availability schedules are saved successfully in the database.
- 100% of specific date/time availability entries (outside weekly schedule) are saved successfully.
- 0 overlapping time slots are allowed within the same doctor’s schedule.
- Availability updates are reflected in the system within ≤ 2 seconds.
- 100% of availability entries include a defined duration.
- 100% of availability entries require a meeting type selection (in-person or virtual).
- 0 invalid duration values (e.g., negative, zero, or other invalid values) are accepted.
- 0 scheduling-related system crashes occur during availability creation or update.

### Patient Questionnaire Submission
Allow patients to complete a structured questionnaire describing their needs before booking appointments.  
Questionnaires are all multiple choices and each combination of answers should map to a set of doctors with a specific specialty. This will be the patients’ recommended doctors.

### Patient Questionnaire Submission
- 100% of patients are required to complete the questionnaire before accessing doctor booking features.
- 0 incomplete submissions are accepted (all required multiple-choice questions must be answered).
- Questionnaire submission response time ≤ 2 seconds.
- 100% of answer combinations map to at least one predefined doctor specialty.
- 0 system crashes during questionnaire submission or recommendation generation.

### Doctor Recommendation and Filtering
- 100% of recommended doctor lists are displayed after questionnaire completion.
- Recommended doctor list is displayed within ≤ 3 seconds after questionnaire submission.
- 100% of displayed doctors include name, address, and specialty information.
- 0 unverified doctors are displayed in the recommendation results.
- Filtering results update within ≤ 2 seconds after filter selection.
- 100% of filtering results match the selected criteria (e.g., specialty, availability).
- 100% of verified doctors that meet selected criteria appear in filtered results.
- 0 system crashes occur during recommendation display or filtering operations.

## Release Scope
Outline what is included in and excluded from the release, detailing key features or improvements, bug fixes, non-functional requirements, etc.

### Included Features

#### User Authentication
- Login/Register entry page (SCRUM-4): Single page to choose login or registration
- Secure login + password reset (SCRUM-5): Users can log in and reset passwords.
- Patient registration (SCRUM-6): Patients can create an account.
- Doctor registration (SCRUM-18): Doctors can create an account and submit professional details for verification.
- Admin login (SCRUM-26): Admins can log in securely.

#### Doctor Verification
- Admin verifies/approves doctor registrations (SCRUM-27): Ensures only qualified doctors are approved to offer appointments.
- Remove admin registration (SCRUM-31): Admin accounts can’t be created via public registration.

#### Doctor Availability

##### Doctor Availability
- Doctor sets availability (SCRUM-20): Doctors select dates/times, appointment type (in-person/virtual), and duration.

- Patient views doctor timeslots (SCRUM-12): Patients can see available appointment times for a doctor.

#### Patient Questionnaire Submission
- Needs questionnaire + care type selection (SCRUM-8): Patient completes questionnaire and selects/gets recommended care type.

#### Doctor Recommendation and Filtering
- Doctor list filtered by care type + availability (SCRUM-9): Patients can browse doctors that match needs and schedule.
- Doctor detailed profile view (SCRUM-11): Patients can review doctor info before choosing.

Profiles support better selection:
- Doctor profile edit (SCRUM-19): Doctors keep info up to date.
- Patient profile edit (SCRUM-7): Patients can update their info (useful for accurate booking/experience).

### Excluded Features
- View/Edit Profile features.  
Initially it was planned to be done in this release of Sprint 1. However, since viewing and editing profiles has conflicts and requires synchronization of part of these projects i.e. Doctor Filtering which was done on the last day of Sprint, so we decided to remove it as we do not have time to test this feature.
- Advanced AI-Based Recommendation Algorithm  
The current release uses rule-based mapping; machine learning-based personalization is planned for future improvement. Our team believes that this feature requires many fine-tuning and prompt engineers that would cost more time than rule-based mapping that we made. However, this feature is currently planned for future improvement.
- System Administrator Registration  
We excluded this feature as regular users should not be able to register as admin. In future releases, we will enable this feature back but registration can only be done by registered admins or by adding a Master Admin role.

## Bug Fixes
- [High Priority, SCRUM-33] Password sent to server in clear.  
  Now, the password is hashed on the frontend before sending it to the server.
- [High Priority, SCRUM-31] Users can register to be a system administrator.  
  Now, system administrator credentials are pre-inserted on the database. We removed the feature to register as system admin.
- [Low Priority, SCRUM-29] Cursor doesn’t change to a (hand) pointer while hovering buttons.  
  Cursor now turned into a pointer when hovering buttons improving user experience.

## Non-Functional Requirements

### Performance
- Authentication response time ≤ 2 seconds
- Recommendation list generation ≤ 3 seconds
- Filtering updates ≤ 2 seconds
- Availability updates reflected within ≤ 2 seconds

### Security
- Password sent to backend in hash and stored in database in hash
- Password is forced to be at least 8 characters long
- Each user login session lasts for  60minutes.
- Each reset password link token lasts for 60 minutes
- Backend sanity check for all predefined values shown in frontend (e.g. Doctors’ availability time can’t be zero or negative on request to backend).
- Backend check and control all role-based (i.e. patient, doctor, system admin) access.

### Usability
- All required fields enforce validation (0 incomplete submissions)
- Error messages displayed clearly for invalid inputs
- Doctor information displayed clearly (name, address, specialty)

## Dependencies and Limitations

### Dependencies
- Current releases have no database migration files, instead it relies on Sequelize ‘sync’ with forced Schema synchronization.  
- SMTP email service provider for password reset functionality.  
- Cloudflare R2 cloud storage for uploading doctors’ verification files.

### Limitations  
- (Free Plan - Cloudflare R2) 10 GB cloud storage for doctors’ verification files.  
- Doctors recommendation system is rule-based, not AI-driven.
- Current release uses local PostgreSQL database which is not production-hosted, so data persistence, accessibility across deployments, and reliability (backups/availability) are limited.
