# Release Plan



**Release Name:** Release v1.1.0



### Release Objectives

- This release aims to strengthen platform security, improve appointment clarity across time zones, enhance doctor-patient communication through document sharing, standardize structured care selection, improve appointment rejection workflow, and increase system reliability through automated testing support.

- Patients are able to view appointment times in their local time zone or a selected time zone.

- Doctors are able to view appointment times in their local time zone or a selected time zone.

- Doctors are able to send documents to patients through the messaging feature, and patients are able to receive and review them.

- Doctors are able to specify the types of care they provide during registration using a dropdown.

- Patients are able to select the type of care they need, or "Don't know," from a dropdown questionnaire option.

- Doctors are required to choose a rejection reason from a predefined dropdown when rejecting a patient appointment.

- Sensitive doctor information is no longer stored in clear text on the client side.

- The system supports a unit testing framework and critical unit tests for important features such as authentication and messaging.



### Specific Goals



#### Security and Data Handling

- Prevent doctor information from being stored in clear text in browser local storage.

- Store sensitive doctor-related client-side data in a safer format such as hashed values or secure cookies/session-based storage.

- Restrict new message thread initiation so that only doctors can initiate conversations, reducing spam.

- Ensure shared documents in messaging are accessible only to authorized users in the relevant conversation.



#### Appointment Time Zone Support

- Allow patients to see appointment times in their local time zone or selected time zone.

- Allow doctors to see appointment times in their local time zone or selected time zone.

- Display time zone information clearly and consistently across appointment-related pages.

- Ensure the same appointment is shown accurately for both patient and doctor, with only the displayed time zone differing when applicable.



#### Messaging and Document Sharing

- Allow doctors to send documents to patients through the messaging feature.

- Allow patients to receive and access documents from doctors through the messaging feature.

- Ensure uploaded documents are linked to the correct doctor-patient conversation.

- Restrict unauthorized users from viewing or downloading shared documents.

- Allow only doctors to initiate new conversations to reduce spam and unwanted outreach.



#### Care Type and Questionnaire Improvements

- Allow doctors to select specific types of care they provide from a predefined dropdown during registration.

- Allow patients to select the type of care they need, or "Don't know," from a predefined dropdown in the questionnaire.

- Standardize care-type values to reduce invalid or inconsistent user input.

- Improve matching and filtering workflows by using structured care-type data instead of free-form text.



#### Appointment Rejection Workflow

- Allow doctors to select a rejection reason from a predefined dropdown when rejecting a patient appointment.

- Ensure rejection reasons are stored correctly and can be reviewed later if needed.

- Prevent invalid or blank rejection reasons from being submitted.



#### Quality Assurance and Testing

- Set up a unit testing framework that can be used reliably during development.

- Add unit tests for critical features such as authentication and messaging.

- Ensure critical tests can be run consistently before merging changes.

- Reduce regressions by validating major workflows with automated tests.



## Metrics for Measurement



### Security and Data Handling

- 0 sensitive doctor information fields are stored in clear text in local storage.

- 100% of new message thread creation requests are restricted to doctor accounts.

- 0 unauthorized users are able to access shared documents through messaging.

- 100% of protected messaging/document routes require authenticated access.



### Appointment Time Zone Support

- 100% of appointment times are displayed using the user's local or explicitly selected time zone.

- Appointment time rendering/update response time <= 2 seconds.

- 100% of tested appointments show consistent scheduled moments across patient and doctor views.

- 0 appointment records display missing or invalid time zone information in supported workflows.



### Messaging and Document Sharing

- 100% of uploaded documents are linked to the correct doctor-patient conversation.

- Message/document metadata load response time <= 2 seconds.

- 100% of authorized recipients can access documents successfully.

- 0 unauthorized downloads or cross-conversation document exposures occur.



### Care Type and Questionnaire Improvements

- 100% of doctor care-type selections come from predefined dropdown values.

- 100% of patient questionnaire care-type selections come from predefined dropdown values, including "Don't know" where applicable.

- 0 invalid free-form care-type values are accepted by the backend for these workflows.

- Care-type selection updates are reflected in the system within <= 2 seconds.



### Appointment Rejection Workflow

- 100% of rejected appointments require a valid dropdown-based rejection reason.

- 100% of saved rejection reasons are stored successfully in the database.

- Rejection status and reason updates are reflected in the system within <= 2 seconds.

- 0 blank or invalid rejection reasons are accepted.



### Quality Assurance and Testing

- Unit test framework setup completes successfully in local development environment.

- 100% of critical unit tests added in this release pass before merge/release.

- Critical test suite can be run with a single documented command.

- 0 release-blocking regressions are found in covered authentication and messaging test scenarios.



## Release Scope

Outline what is included in and excluded from the release, detailing key features or improvements, bug fixes, non-functional requirements, etc.



### Included Features



#### Security and Privacy Improvements

- Secure doctor information storage on client side (SCRUM-51): Sensitive doctor information is no longer stored in clear text in local storage.



#### Appointment Time Zone Support

- Patient sees appointment time in local/selected time zone (SCRUM-40): Patients can clearly understand when their appointments occur in the correct time zone.

- Doctor sees appointment time in local/selected time zone (SCRUM-41): Doctors can clearly understand when their appointments occur in the correct time zone.



#### Messaging and Document Sharing

- Patient receives documents through messaging (SCRUM-42): Patients can review diagnosis, results, or related files sent by doctors.

- Doctor sends documents through messaging (SCRUM-43): Doctors can send important files to patients through the platform.

- Only doctor can initiate message (SCRUM-49): New conversations are restricted to doctors in order to reduce spam.



#### Care Type and Questionnaire Improvements

- Doctor selects specific care types during registration (SCRUM-47): Doctors can choose the care types they provide from a dropdown.

- Patient selects needed care type or "Don't know" in questionnaire (SCRUM-48): Patients can provide structured care information to improve matching and routing.



#### Appointment Workflow Improvements

- Rejection reason dropdown when rejecting appointment (SCRUM-46): Doctors must choose a standardized rejection reason from a dropdown.



#### Technical / System Improvements

- Unit testing framework setup (SCRUM-38): Developers can run reliable automated unit tests.

- Unit tests for critical features (SCRUM-39): Authentication, messaging, and other critical flows receive automated test coverage.



### Excluded Features

- Questionnaire persistence across repeated bookings (SCRUM-50)

This feature requires additional database changes, retrieval logic, and end-to-end validation to ensure old questionnaire data is reused safely. It is planned for a future release rather than being completed in this release.

- Full automated test coverage across the entire platform

This release focuses on setting up the framework and adding tests for critical features first. Broader test coverage for all modules is planned incrementally in future releases.

- Patient-initiated cold messaging

To reduce spam, this release intentionally limits new conversation initiation to doctors only.

- External calendar/time zone synchronization

This release supports local or selected time zone display inside the platform, but does not yet integrate with third-party calendar systems.



## Bug Fixes

- [High Priority, SCRUM-51] Doctor info is stored in clear in local storage.

  Now, sensitive doctor information is no longer stored in clear text on the client side and is handled through safer storage practices.

- [Medium Priority, SCRUM-40, SCRUM-41] Appointment time display was unclear across time zones.

  Now, both patients and doctors can view appointment times in their local time zone or a selected time zone.

- [Medium Priority, SCRUM-46] Rejecting an appointment lacked a standardized reason input.

  Now, doctors must choose a predefined rejection reason from a dropdown when rejecting a patient appointment.



## Non-Functional Requirements



### Performance

- Appointment time conversion and display response time <= 2 seconds

- Message/document metadata loading response time <= 2 seconds

- Care-type dropdown submission/update response time <= 2 seconds

- Rejection reason submission/update response time <= 2 seconds

- Critical unit tests should run successfully in a reasonable development workflow before release



### Security

- No sensitive doctor information may be stored in clear text in local storage.

- Only authenticated users can access messaging and document-sharing features.

- Only authorized participants in a conversation can access shared documents.

- Only doctors can initiate new message threads.

- Backend validation must enforce allowed dropdown values for care types and rejection reasons.

- Backend check and control all role-based access related to appointments, messaging, and admin workflows.



### Usability

- Appointment times clearly display date, time, and applicable time zone information.

- Dropdown-based care-type and rejection-reason fields reduce ambiguous user input.

- Shared documents are clearly visible and understandable within messaging workflows.

- Structured care-type selection improves clarity for both doctor registration and patient questionnaire workflows.



### Reliability

- Unit testing framework must be stable and usable by developers throughout the sprint.

- Critical authentication and messaging workflows should be covered by automated tests.

- New Sprint 3 features should not break the existing appointment booking and communication workflow.



## Dependencies and Limitations



### Dependencies

- Features for making appointments, sending messages, and verifying users that were in the last release.

- Support for uploading and storing files so that doctors and patients can share documents.

- Support for database schemas/models for types of care, reasons for rejection, and changes to related workflows.

- Tools and libraries for unit testing, like a test runner, an assertion library, and HTTP/API testing tools, for automated testing.



### Limitations

- This release doesn't fully fix the problem with questionnaire persistence across multiple bookings.

- Can only share documents that are in supported file types and that are within the size limits you set.

- To cut down on spam, only conversations started by doctors are allowed.

- Unless a time zone is chosen, then a default timezone of EST/EDT is chosen and not based on their location.

- This release's test coverage only looks at the most important features, not every module in the system.

- The current version uses a local PostgreSQL database that is not hosted in production, so data persistence, accessibility across deployments, and reliability (backups/availability) are all limited.