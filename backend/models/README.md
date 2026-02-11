# Backend Models - Sequelize ORM

This directory contains all database models using Sequelize ORM for the UTLWA healthcare booking platform.

## Models Overview

| Model | Table | Description |
|-------|-------|-------------|
| **User** | users | Base authentication (username, email, password, role) |
| **Patient** | patients | Patient profiles and accessibility preferences |
| **Doctor** | doctors | Doctor profiles, credentials, and verification status |
| **Appointment** | appointments | Booking between patients and doctors |
| **AvailabilityPattern** | availability_patterns | Recurring weekly schedules for doctors |
| **AvailabilitySlot** | availability_slots | Specific date/time slots for appointments |
| **Message** | messages | Patient-doctor communication |
| **Review** | reviews | Patient ratings and reviews of doctors |
| **Questionnaire** | questionnaires | Patient needs assessment |
| **AdminLog** | admin_logs | Admin verification audit trail |

## Database Setup

### Prerequisites
1. PostgreSQL must be installed and running
2. Create a database for the project
3. Set up your `.env` file in the backend directory:

```env
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PWD=your_password
PG_DATABASE=your_database_name
NODE_ENV=development
```

### Initialize Database Tables

**Option 1: Create tables (safe - won't delete existing data)**
```bash
cd backend
npm run db:init
```

**Option 2: Reset database (DANGER - drops all tables and data)**
```bash
cd backend
npm run db:reset
```

This will create all 10 tables with:
- Proper foreign key constraints
- Indexes for performance
- Data types and validations

## Model Relationships

```
User (1) ─── (1) Patient
User (1) ─── (1) Doctor
User (1) ─── (many) Message (as sender)
User (1) ─── (many) Message (as receiver)
User (1) ─── (many) AdminLog

Patient (1) ─── (many) Appointment
Patient (1) ─── (many) Review
Patient (1) ─── (many) Questionnaire

Doctor (1) ─── (many) Appointment
Doctor (1) ─── (many) Review
Doctor (1) ─── (many) AvailabilityPattern
Doctor (1) ─── (many) AvailabilitySlot
Doctor (1) ─── (many) AdminLog (as target)

Appointment (1) ─── (1) Review
Appointment (1) ─── (many) Message
Appointment (many) ─── (1) AvailabilitySlot
```

## Using Models in Controllers

### Example 1: Create a new user
```javascript
import { User, Patient } from './models/index.js';
import bcrypt from 'bcrypt';

// Register a patient
const hashedPassword = await bcrypt.hash(password, 10);
const user = await User.create({
  username: 'john_doe',
  email: 'john@example.com',
  password: hashedPassword,
  role: 'patient'
});

// Create patient profile
const patient = await Patient.create({
  user_id: user.id,
  full_name: 'John Doe',
  accessibility_preferences: ['asl', 'captions']
});
```

### Example 2: Query with associations
```javascript
import { User, Patient, Appointment, Doctor } from './models/index.js';

// Get patient with all appointments and doctor info
const patient = await Patient.findByPk(patientId, {
  include: [
    {
      model: User,
      as: 'user'
    },
    {
      model: Appointment,
      as: 'appointments',
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [{ model: User, as: 'user' }]
        }
      ]
    }
  ]
});
```

### Example 3: Search doctors
```javascript
import { Doctor, User } from './models/index.js';
import { Op } from 'sequelize';

// Find verified doctors with specific specialty
const doctors = await Doctor.findAll({
  where: {
    verification_status: 'approved',
    specialty: {
      [Op.iLike]: '%cardiology%'
    }
  },
  include: [
    {
      model: User,
      as: 'user',
      attributes: ['email', 'username']
    }
  ]
});
```

### Example 4: Create appointment
```javascript
import { Appointment, AvailabilitySlot } from './models/index.js';

// Book an appointment
const appointment = await Appointment.create({
  patient_id: 1,
  doctor_id: 5,
  slot_id: 12,
  appointment_date: '2026-03-15',
  start_time: '10:00:00',
  end_time: '10:30:00',
  appointment_type: 'virtual',
  duration: 30,
  reason: 'Hearing consultation',
  accessibility_needs: ['asl']
});

// Mark the slot as unavailable
await AvailabilitySlot.update(
  { is_available: false },
  { where: { id: 12 } }
);
```

### Example 5: Get doctor's reviews with average rating
```javascript
import { Doctor, Review, Patient, User } from './models/index.js';
import { sequelize } from './models/index.js';

// Get doctor with reviews and average rating
const doctor = await Doctor.findByPk(doctorId, {
  include: [
    {
      model: Review,
      as: 'reviews',
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{ model: User, as: 'user' }]
        }
      ]
    }
  ]
});

// Calculate average rating
const avgRating = await Review.findOne({
  where: { doctor_id: doctorId },
  attributes: [
    [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
    [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
  ],
  raw: true
});
```

## Common Sequelize Operations

### Create
```javascript
const user = await User.create({ username, email, password, role });
```

### Find by ID
```javascript
const user = await User.findByPk(userId);
```

### Find one
```javascript
const user = await User.findOne({ where: { email: 'user@example.com' } });
```

### Find all
```javascript
const doctors = await Doctor.findAll({ where: { verification_status: 'approved' } });
```

### Update
```javascript
await User.update(
  { email: 'newemail@example.com' },
  { where: { id: userId } }
);
```

### Delete
```javascript
await User.destroy({ where: { id: userId } });
```

## Next Steps for Your Team

1. **Create Controllers**: Build controller files that use these models
2. **Create Routes**: Define API endpoints that call controllers
3. **Add Validation**: Implement request validation middleware
4. **Add Authentication**: Create JWT middleware using the User model
5. **Test**: Write tests for model operations

## Helpful Resources

- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [Sequelize Model Basics](https://sequelize.org/docs/v6/core-concepts/model-basics/)
- [Sequelize Associations](https://sequelize.org/docs/v6/core-concepts/assocs/)
- [Sequelize Querying](https://sequelize.org/docs/v6/core-concepts/model-querying-basics/)

## Notes

- All models use underscored naming (`created_at`, `updated_at`)
- Timestamps are enabled for all models except Questionnaire
- Foreign keys cascade on delete where appropriate
- Array fields are used for multi-value data (languages, accessibility preferences)
- The database connection is configured in `config/database.js`
