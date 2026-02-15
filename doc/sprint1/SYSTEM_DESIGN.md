# Backend

## Data Models

### User


**Subclasses:** Patient, Doctor (subclasses in the E/R diagram sense)

**Responsibilities:**
- Store user credentials (username, email, hashed password)
- Maintain role-based access control (patient, doctor, admin)
- Manage password reset tokens and expiration
- Validate email format and uniqueness constraints
- Track user creation and modification timestamps

**Collaborators:**
- Patient
- Doctor
- AdminLog
- Message
- Auth Middleware

---

### Patient

**Parent Class:** User (parent classes in the E/R diagram sense)  

**Responsibilities:**
- Store patient information (name, date of birth, phone, address)
- Maintain emergency contact information
- Store accessibility needs and preferences
- Validate data integrity for personal health information
- Manage one-to-one relationship with User profile
- Track patient profile creation and updates

**Collaborators:**
- User
- Appointment
- Questionnaire
- Message
- Review

---

### Doctor

**Parent Class:** User (parent classes in the E/R diagram sense)    

**Responsibilities:**
- Store professional credentials (license number, specialty, bio)
- Maintain list of spoken languages and service areas
- Store verification status and documents for admin review
- Manage professional photo/profile image data
- Validate unique license number constraints
- Track doctor profile creation and modification

**Collaborators:**
- User
- AvailabilityPattern
- AvailabilitySlot
- Appointment
- Review
- AdminLog

---

### Appointment

**Responsibilities:**
- Record appointment between patient and doctor
- Store appointment status (scheduled, completed, cancelled, etc.)
- Manage appointment date/time and type (virtual/in-person)
- Store cancellation reason and timestamp if cancelled
- Maintain appointment notes and outcomes
- Validate referential integrity with patients and doctors

**Collaborators:**
- Patient
- Doctor
- AvailabilitySlot
- Message
- Review

---

### AvailabilityPattern

**Responsibilities:**
- Define recurring weekly availability schedule
- Store day of week, start/end times for recurring slots
- Manage appointment duration (in minutes)
- Specify allowed appointment types (virtual/in-person)
- Mark patterns as active/inactive
- Ensure no overlapping time slots on same day

**Collaborators:**
- Doctor
- AvailabilitySlot
- availabilityController

---

### AvailabilitySlot

**Responsibilities:**
- Represent specific date/time appointment slots
- Store slot date, start time, and end time
- Track availability status (available/booked)
- Specify allowed appointment types for specific slot
- Validate slot date is not in the past
- Support batch generation from patterns

**Collaborators:**
- Doctor
- AvailabilityPattern
- Appointment
- availabilityController

---

### Message

**Responsibilities:**
- Store message content between two users (sender/receiver)
- Track message read status and read timestamp
- Link messages to appointment context for organization
- Maintain message creation and update timestamps
- Support message search and filtering by appointment
- Validate message content is not empty

**Collaborators:**
- User (sender)
- User (receiver)
- Appointment

---

### Review

**Responsibilities:**
- Store patient rating (1-5 stars) for completed appointments
- Record text review/feedback from patient
- Link review to specific appointment (one-to-one)
- Store review creation timestamp
- Validate rating is within 1-5 range
- Support review searchability and filtering by doctor

**Collaborators:**
- Patient
- Doctor
- Appointment

---

### Questionnaire

**Responsibilities:**
- Capture patient care type needs (primary, mental, specialist, urgent)
- Store urgency level (urgent, soon, flexible)
- Record preferred appointment type (virtual/in-person)
- Maintain accessibility needs array (ASL, interpreter, etc.)
- Store patient description of health condition/concern
- Track questionnaire completion timestamp

**Collaborators:**
- Patient

---

### AdminLog

**Responsibilities:**
- Record admin action for audit trail (doctor_verified, doctor_denied)
- Store target doctor being acted upon
- Maintain flexible JSON details field for additional metadata
- Track action creation timestamp (no updates allowed)
- Support audit report generation and filtering
- Validate admin exists and has admin role

**Collaborators:**
- User (for admins)
- Doctor

---

## Controller Services

### userController

**Responsibilities:**
- Implement user registration with role assignment
- Authenticate users and generate JWT tokens
- Handle password reset workflow (token generation, validation, reset)
- Manage user profile updates and retrieval
- Upload and store verification documents to R2/local storage
- Validate file uploads (type, size constraints)
- Hash passwords using bcrypt
- Build HTML email templates for password reset
- Escape HTML in email content for security
- Implement doctor verification status checks
- Manage patient registration and profile setup
- Support doctor registration with license verification

---

### availabilityController

**Responsibilities:**
- Fetch doctor's recurring availability patterns
- Create or update recurring weekly schedules
- Generate specific time slots from patterns
- Fetch available slots for a specific doctor and date range
- Retrieve patient's booked appointment slots
- Validate slot availability before booking
- Handle slot unavailability (marking as booked)
- Support bulk slot generation for multiple dates
- Allow pattern deactivation instead of deletion

---

### adminController

**Responsibilities:**
- Verify doctor credentials and documents
- Deny doctor verification with reason
- Query verification status of pending doctors
- Update doctor verification status in database
- Create audit log entries for admin actions
- Retrieve administrator activity history
- Support admin-only endpoint access
- Generate verification reports


---

## Middleware Components

### Auth Middleware (requireAuth)

**Responsibilities:**
- Extract Bearer token from Authorization header
- Verify JWT signature using secret key
- Validate token expiration
- Decode user ID and role from token payload
- Attach user authentication info to request
- Return 401 Unauthorized for missing/invalid tokens
- Query User model to verify account exists
- Support token refresh on future enhancements

---

### Auth Middleware (requireRole)

**Responsibilities:**
- Check if user is authenticated before role check
- Validate user role against allowed roles
- Grant access only to specified roles
- Return 403 Forbidden for unauthorized roles
- Support multiple roles per endpoint

---

# Frontend

## Page Components (Container/Smart Components)

### Login Page

**Responsibilities:**
- Render login form with email and password fields
- Provide role selection (patient, doctor, admin)
- Handle form submission and validation
- Display password visibility toggle
- Redirect authenticated users to dashboard
- Show error messages via toast notifications
- Persist authentication state across sessions
- Handle "Remember Me" functionality

**Collaborators:**
- AuthContext
- Button, Input, Label, RadioGroup (UI Components)
- Link (React Router)
- toast (Sonner)
- useAuth Hook

---

### Register Page

**Responsibilities:**
- Render registration form with email, password, name fields
- Provide role selection during registration
- Display role-specific fields (specialty, license for doctors)
- Handle file uploads for verification documents
- Validate password strength requirements
- Perform server-side validation
- Show registration errors/success messages
- Redirect after successful registration
- Support "Already have an account?" navigation

**Collaborators:**
- AuthContext
- Button, Input, Label, RadioGroup, Card (UI Components)
- Link, useNavigate (React Router)
- toast (Sonner)
- ProfileAPI

---

### Forgot Password Page

**Responsibilities:**
- Render email input form
- Send password reset request to backend
- Display confirmation message
- Navigate to check email page
- Handle request errors gracefully
- Provide back-to-login navigation
- Display reset token expiration info

**Collaborators:**
- Button, Input, Label, Card (UI Components)
- Link, useNavigate (React Router)
- toast (Sonner)
- AuthContext

---

### Reset Password Page

**Responsibilities:**
- Accept reset token from URL params
- Render new password and confirm password fields
- Validate password match before submission
- Submit new password with reset token
- Display success/error messages
- Redirect to login on success
- Handle expired token scenarios
- Validate password strength requirements

**Collaborators:**
- Button, Input, Label, Card (UI Components)
- useParams, useNavigate (React Router)
- toast (Sonner)
- AuthContext

---

## Patient Pages

### Patient Dashboard

**Responsibilities:**
- Display patient's upcoming appointments
- Show appointment statistics/summary
- Render quick action buttons (new booking, view history)
- Fetch and display patient's profile completion status
- Show recent messages count
- Navigate to detailed appointment pages
- Display waiting list status if applicable
- Render role-specific navigation

**Collaborators:**
- AuthContext
- AppointmentCard, StatusBadges (Components)
- Button, Card (UI Components)
- ProfileAPI
- useNavigate (React Router)

---

### Patient Profile

**Responsibilities:**
- Display patient personal information (name, DOB, address)
- Render emergency contact details
- Show accessibility preferences checklist
- Provide edit/update functionality
- Save profile changes to backend
- Display profile completion percentage
- Validate required fields before saving
- Show success/error messages on update

**Collaborators:**
- AuthContext
- Button, Input, Label, Card (UI Components)
- ProfileAPI
- toast (Sonner)
- useAuth Hook

---

### Provider Discovery

**Responsibilities:**
- Display searchable/filterable doctor list
- Render doctor cards with specialty and rating info
- Show filter options (specialty, language, availability)
- Support search by doctor name
- Display doctor distance/location
- Render "View Profile" and "Book Appointment" buttons
- Show doctor availability status
- Handle no results scenarios

**Collaborators:**
- DoctorCard (Component)
- Button, Input, Select, Card (UI Components)
- ProfileAPI
- useNavigate (React Router)
- mock-data

---

### Provider Map

**Responsibilities:**
- Render map of doctor locations
- Display doctor markers/pins
- Show doctor details on marker click
- Filter doctors on map by specialty/preferences
- Support zoom and pan controls
- Display selected doctor info in sidebar
- Navigate to doctor profile from map

**Collaborators:**
- DoctorCard (Component)
- Button, Card (UI Components)
- ProfileAPI
- useNavigate (React Router)
- Map Library (Google Maps/Mapbox)

---

### Booking Page

**Responsibilities:**
- Display selected doctor information
- Render calendar for date selection
- Show available time slots for selected date
- Allow appointment type selection (virtual/in-person)
- Capture appointment reason/chief complaint
- Accept accessibility needs input
- Display booking summary before confirmation
- Submit booking request to backend

**Collaborators:**
- DoctorCard (Component)
- Button, Calendar, Select, Textarea, RadioGroup (UI Components)
- Label (UI Component)
- ProfileAPI
- useParams, useNavigate (React Router)
- toast (Sonner)

---

### Booking Confirmation

**Responsibilities:**
- Display confirmation message
- Show booked appointment details
- Render confirmation number
- Provide download receipt option
- Display next steps (add to calendar, etc.)
- Provide navigation to dashboard
- Show appointment details summary

**Collaborators:**
- Button, Card (UI Components)
- useNavigate (React Router)
- AuthContext

---

### Patient Appointment Detail

**Responsibilities:**
- Fetch and display appointment details
- Show doctor information and credentials
- Render appointment date/time in readable format
- Display appointment location/video link
- Allow message sending to doctor
- Support cancellation with reason
- Show appointment notes/instructions
- Display review option if appointment completed

**Collaborators:**
- Button, Card, Textarea (UI Components)
- ProfileAPI
- useParams, useNavigate (React Router)
- toast (Sonner)
- AuthContext

---

### Questionnaire Page

**Responsibilities:**
- Render multi-step questionnaire form
- Capture care type selection
- Accept urgency level input
- Collect accessibility needs
- Store preferred appointment type
- Accept patient health description
- Validate required fields
- Submit questionnaire responses
- Show progress indicator for multi-step form

**Collaborators:**
- Button, Card, Select, Textarea, Checkbox (UI Components)
- Label (UI Component)
- ProfileAPI
- useNavigate (React Router)
- toast (Sonner)

---

### Write Review Page

**Responsibilities:**
- Display completed appointment info
- Render star rating selector (1-5)
- Accept review text input
- Validate rating is selected
- Submit review to backend
- Show submission success/error
- Redirect after successful submission
- Display confirmation message

**Collaborators:**
- Button, Textarea, Card (UI Components)
- Label (UI Component)
- ProfileAPI
- useParams, useNavigate (React Router)
- toast (Sonner)

---

### Waitlist Page

**Responsibilities:**
- Display waitlist status
- Show position in queue
- Estimate wait time
- Allow removal from waitlist
- Display availability notifications preference
- Show doctor information for waitlist
- Provide back-to-search option

**Collaborators:**
- Button, Card (UI Components)
- ProfileAPI
- useNavigate (React Router)
- toast (Sonner)

---

## Doctor Pages

### Doctor Dashboard

**Responsibilities:**
- Display doctor's upcoming appointments
- Show appointment count/statistics
- Render quick action buttons (manage availability, view schedule)
- Display appointment requests/notifications
- Show verification status banner
- Navigate to detailed pages
- Display profile completion status
- Show recent patient messages

**Collaborators:**
- AuthContext
- AppointmentCard, StatusBadges (Components)
- Button, Card (UI Components)
- ProfileAPI
- useNavigate (React Router)

---

### Doctor Profile

**Responsibilities:**
- Display professional information (license, specialty, bio)
- Show languages spoken
- Render clinic location/service areas
- Display verification status
- Provide edit/update functionality
- Allow photo upload
- Save profile changes to backend
- Show profile completion percentage
- Display credentials for patient viewing

**Collaborators:**
- AuthContext
- Button, Input, Textarea, Card (UI Components)
- Label (UI Component)
- ProfileAPI
- toast (Sonner)
- useAuth Hook

---

### Availability/Schedule Page

**Responsibilities:**
- Display recurring availability patterns
- Allow setting weekly schedule
- Support time slot creation/editing
- Set appointment duration (15/30/60 min)
- Specify appointment types (virtual/in-person)
- Activate/deactivate time patterns
- Display availability calendar view
- Save schedule changes to backend
- Show notification on successful update

**Collaborators:**
- Button, Card, Select, Calendar (UI Components)
- Label, Input, Textarea (UI Component)
- ProfileAPI
- toast (Sonner)
- useAuth Hook
- AuthContext

---

### Doctor Appointment Summary

**Responsibilities:**
- Display scheduled appointments list
- Show appointment count by status
- Filter appointments by date range
- Show patient names and specialry info
- Render action buttons (view details, cancel)
- Display upcoming vs. past appointments
- Support exporting appointment list

**Collaborators:**
- AppointmentCard (Component)
- Button, Card, Select (UI Components)
- ProfileAPI
- useNavigate (React Router)

---

### Doctor Appointment Detail

**Responsibilities:**
- Fetch and display appointment details
- Show patient information
- Display patient accessibility needs
- Render appointment notes/reason
- Accept appointment outcome/notes
- Allow message sending to patient
- Support appointment completion
- Show cancellation option with reason

**Collaborators:**
- Button, Card, Textarea (UI Components)
- ProfileAPI
- useParams, useNavigate (React Router)
- toast (Sonner)
- AuthContext

---

### Doctor Patient History

**Responsibilities:**
- Display list of all past/completed appointments with patient
- Show patient appointment history timeline
- Display patient health notes from previous appointments
- Show patient accessibility preferences
- Render patient contact information
- Allow notes/observations entry
- Support filtering by date or status

**Collaborators:**
- Button, Card, Textarea (UI Components)
- ProfileAPI
- useParams (React Router)
- AuthContext

---

### Verification Status Page

**Responsibilities:**
- Display doctor verification status badge
- Show submitted documents
- Display submission date
- Render status-specific messaging (pending/approved/denied)
- Provide resubmission option if denied
- Show reason for denial if applicable
- Allow document upload for resubmission

**Collaborators:**
- StatusBadges (Component)
- Button, Card (UI Components)
- ProfileAPI
- toast (Sonner)
- AuthContext

---

## Shared Components

### AppointmentCard

**Responsibilities:**
- Display appointment summary in card format
- Show appointment date and time with icons
- Render appointment type badge (virtual/in-person)
- Display appointment status badge
- Show doctor/patient name depending on role
- Render appointment reason/description
- Provide link to detailed view
- Support responsive layout

**Collaborators:**
- StatusBadges (Component)
- Card, Badge, Button (UI Components)
- Link (React Router)
- AppointmentTypeBadge
- date-fns (Formatting)

---

### DoctorCard

**Responsibilities:**
- Display doctor profile summary
- Show name, specialty, and credentials
- Render star rating/review count
- Display languages and service types
- Show availability status (online/offline)
- Render distance/location information
- Provide "View Profile" and "Book" buttons
- Support responsive grid layout

**Collaborators:**
- Badge, Button, Card (UI Components)
- Link (React Router)
- Avatar, Rating Component

---

### StatusBadges

**Responsibilities:**
- Render appointment status badge (scheduled, completed, cancelled)
- Display appointment type badge (virtual, in-person)
- Apply color coding based on status
- Show status text clearly
- Support custom styling

**Collaborators:**
- Badge (UI Component)

---

### RootLayout

**Responsibilities:**
- Render application shell with header
- Provide outlet for page content
- Maintain layout structure across pages
- Display navigation header
- Handle responsive layout
- Support nested routing

**Collaborators:**
- Header (Component)
- Outlet (React Router)

---

### Header

**Responsibilities:**
- Display app logo/branding
- Render user profile dropdown menu
- Show role-based navigation items
- Provide logout functionality
- Display user name or avatar
- Support responsive mobile menu
- Highlight current route
- Handle navigation between sections

**Collaborators:**
- Button (UI Component)
- Link, useNavigate (React Router)
- AuthContext
- useAuth Hook
- DropdownMenu (UI Component)
- Avatar (UI Component)

---

## State Management & Services

### AuthContext

**Responsibilities:**
- Store authenticated user information globally
- Manage JWT token storage and retrieval
- Provide login function with API call
- Provide register function with API call
- Provide logout function
- Update user profile data in context
- Check authentication status
- Handle session expiration
- Manage local storage persistence
- Map API response to frontend User model

**Collaborators:**
- React Context API
- localStorage
- AuthAPI (Backend)
- User Model
- ProfileAPI

---

### ProfileAPI Service

**Responsibilities:**
- Fetch user profile data from API
- Update user profile information
- Fetch patient-specific profile data
- Fetch doctor-specific profile data
- Handle API authentication headers
- Parse API responses
- Provide typed interfaces for responses
- Handle error responses

**Collaborators:**
- AuthContext (for token)
- fetch API / HTTP Client
- Backend API Endpoints

---

### useAuth Hook

**Responsibilities:**
- Provide easy access to AuthContext within components
- Return current user and authentication status
- Expose login, register, logout functions
- Handle context not found errors
- Provide type-safe access to auth state

**Collaborators:**
- AuthContext
- React useContext Hook

---

## Utilities

### MockData

**Responsibilities:**
- Provide mock doctor data for development
- Supply mock appointment data
- Manage mock patient data
- Enable offline development/testing
- Support loading states simulation
- Provide realistic test data structure
- Enable quick feature iteration

**Collaborators:**
- Patient and Doctor Pages
- Development/Testing

---

### Routes Configuration

**Responsibilities:**
- Define application routing structure
- Configure patient routes (dashboard, booking, etc.)
- Configure doctor routes (schedule, appointments)
- Configure admin routes
- Configure auth routes (login, register, password reset)
- Implement route guards/protected routes
- Handle 404 Not Found route
- Support nested routing

**Collaborators:**
- React Router
- ProtectedRoute Component
- All Page Components

---

### ProtectedRoute Component

**Responsibilities:**
- Check if user is authenticated before rendering
- Validate user role matches required role(s)
- Redirect to login if not authenticated
- Redirect to unauthorized page if insufficient role
- Support multiple allowed roles
- Render child route if authorized
- Display loading state while checking auth

**Collaborators:**
- AuthContext
- useAuth Hook
- React Router
- useNavigate
