# Doctor Availability Feature - Testing Guide

## Overview
This feature allows doctors to set their availability by choosing dates, times, appointment types (in-person or virtual), and durations.

## Components Implemented

### Backend (Node.js/Express)
1. **Controller**: `backend/controllers/availabilityController.js`
   - Handles all availability management operations
   - Supports both recurring patterns and specific date slots

2. **Routes**: Added to `backend/routes/userRoutes.js`
   - All routes require authentication and doctor role

### Frontend (React/TypeScript)
1. **Page**: `frontend/src/app/pages/doctor/availability.tsx`
   - Two-tab interface: Weekly Schedule and Specific Dates
   - Full CRUD operations with API integration

## API Endpoints

### Weekly Patterns (Recurring Schedule)
```
GET    /api/availability/patterns          - Get doctor's weekly patterns
POST   /api/availability/patterns          - Create/update weekly patterns
DELETE /api/availability/patterns/:id      - Delete a pattern
```

### Specific Date Slots
```
GET    /api/availability/slots             - Get specific slots
POST   /api/availability/slots             - Create specific slots
PUT    /api/availability/slots/:id         - Update a slot
DELETE /api/availability/slots/:id         - Delete a slot
```

### Public Access
```
GET    /api/availability/doctor/:doctorId  - Get doctor's availability (for patients)
```

## Testing Steps

### 1. Backend Testing

#### Start the server:
```bash
cd backend
npm start
```

#### Test with curl or Postman:

**Login as a doctor first:**
```bash
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "doctor@example.com", "password": "password123"}'
```

**Set weekly availability:**
```bash
curl -X POST http://localhost:5050/api/availability/patterns \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{
    "patterns": [
      {
        "day_of_week": 1,
        "start_time": "09:00",
        "end_time": "17:00",
        "appointment_duration": 30,
        "is_active": true
      }
    ]
  }'
```

**Add specific date slot:**
```bash
curl -X POST http://localhost:5050/api/availability/slots \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{
    "slots": [
      {
        "slot_date": "2026-02-20",
        "start_time": "10:00",
        "end_time": "14:00",
        "appointment_type": ["virtual", "in-person"],
        "is_available": true
      }
    ]
  }'
```

**Get availability:**
```bash
curl http://localhost:5050/api/availability/patterns \
  -H "Cookie: token=YOUR_TOKEN"

curl http://localhost:5050/api/availability/slots?startDate=2026-02-01 \
  -H "Cookie: token=YOUR_TOKEN"
```

### 2. Frontend Testing

#### Start the frontend:
```bash
cd frontend
npm run dev
```

#### Test the UI:
1. **Login as a doctor**
   - Navigate to http://localhost:5173 (or your dev server port)
   - Login with doctor credentials

2. **Weekly Schedule Tab**
   - Enable/disable days of the week
   - Set start and end times for each day
   - Select appointment duration (15, 30, 45, 60, 90, 120 minutes)
   - Choose appointment types (Virtual and/or In-Person)
   - Click "Save Weekly Schedule"
   - Verify success toast appears

3. **Specific Dates Tab**
   - Select a future date from the calendar
   - Set start and end times
   - Choose appointment types
   - Click "Add Availability"
   - Verify the slot appears in "Upcoming Specific Slots"
   - Try deleting a slot using the trash icon
   - Verify the slot is removed

### 3. Integration Testing

#### Scenario 1: New Doctor Setting Up Availability
1. Register as a new doctor
2. Wait for admin verification
3. Login and navigate to availability page
4. Set up weekly schedule for weekdays
5. Add specific availability for next Saturday
6. Verify data persists after page refresh

#### Scenario 2: Updating Existing Availability
1. Login as existing doctor with availability
2. Modify Monday hours from 9-5 to 10-4
3. Change duration from 30 to 45 minutes
4. Save changes
5. Verify updates are saved

#### Scenario 3: Managing Specific Dates
1. Add availability for a specific date
2. Add another slot for the same date with different times
3. Delete one of the slots
4. Verify only one slot remains

#### Scenario 4: Patient Viewing Doctor Availability
1. As a patient, view doctor's profile
2. Check that doctor's availability is displayed
3. Verify appointment booking respects availability

## Expected Behavior

### Weekly Schedule
- ✅ Doctors can enable/disable each day of the week
- ✅ Each day can have custom start/end times
- ✅ Appointment duration is configurable per day
- ✅ Appointment types (virtual/in-person) can be selected
- ✅ Changes persist to database
- ✅ Previous settings load on page refresh

### Specific Dates
- ✅ Doctors can select any future date
- ✅ Multiple time slots per date are supported
- ✅ Each slot can have different appointment types
- ✅ Slots can be deleted individually
- ✅ Slots are displayed in chronological order
- ✅ Cannot select past dates

### Data Validation
- ✅ End time must be after start time
- ✅ Appointment types must be selected
- ✅ Only authenticated doctors can access endpoints
- ✅ Doctors can only modify their own availability

## Common Issues and Solutions

### Issue: "Doctor profile not found"
**Solution**: Ensure the user is logged in as a doctor and has a doctor profile created.

### Issue: "Slot already exists"
**Solution**: A slot with the same date and start time already exists. Delete the existing slot first or use a different time.

### Issue: Frontend not loading data
**Solution**: 
- Check browser console for errors
- Verify API_BASE_URL is correctly set in .env
- Ensure backend server is running
- Check that cookies are being sent with requests

### Issue: Changes not saving
**Solution**:
- Check network tab for failed requests
- Verify authentication token is present
- Check backend logs for errors

## Database Schema

### availability_patterns table
- `id` - Primary key
- `doctor_id` - Foreign key to doctors table
- `day_of_week` - Integer (0=Sunday, 6=Saturday)
- `start_time` - Time
- `end_time` - Time
- `appointment_duration` - Integer (minutes)
- `is_active` - Boolean

### availability_slots table
- `id` - Primary key
- `doctor_id` - Foreign key to doctors table
- `slot_date` - Date
- `start_time` - Time
- `end_time` - Time
- `is_available` - Boolean
- `appointment_type` - Array of strings ['virtual', 'in-person']

## Success Criteria

✅ Doctors can set recurring weekly availability patterns
✅ Doctors can specify appointment durations
✅ Doctors can choose appointment types (virtual/in-person)
✅ Doctors can add specific date availability
✅ All changes persist to the database
✅ Changes are reflected immediately in the UI
✅ Patients can view doctor availability (via public endpoint)
✅ Data validation prevents invalid configurations
✅ Proper error messages are displayed
✅ Authentication and authorization work correctly

## Next Steps (Future Enhancements)

1. **Appointment Integration**: Connect availability to appointment booking
2. **Bulk Operations**: Allow adding multiple specific dates at once
3. **Time Off Management**: Add ability to block out vacation/unavailable periods
4. **Conflict Detection**: Warn when creating overlapping slots
5. **Calendar View**: Add a calendar visualization of availability
6. **Notifications**: Alert doctors when they have no upcoming availability set
7. **Analytics**: Show statistics on booked vs available slots
8. **Recurrence Rules**: Support more complex patterns (e.g., "first Monday of each month")
