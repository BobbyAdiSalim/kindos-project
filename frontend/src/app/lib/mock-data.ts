// Mock doctors data
export const mockDoctors = [
  {
    id: '1',
    name: 'Dr. Sarah Chen',
    specialty: 'Family Medicine',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
    languages: ['English', 'Mandarin', 'ASL'],
    rating: 4.9,
    reviewCount: 127,
    bio: 'Board-certified family physician with 15+ years of experience. Passionate about preventative care and patient education.',
    clinicLocation: '123 Main St, Suite 200, Seattle, WA 98101',
    virtualAvailable: true,
    inPersonAvailable: true,
    nextAvailable: '2026-02-03T10:00:00',
    verified: true,
    lat: 47.6062,
    lng: -122.3321,
  },
  {
    id: '2',
    name: 'Dr. Michael Rodriguez',
    specialty: 'Mental Health',
    photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
    languages: ['English', 'Spanish'],
    rating: 4.8,
    reviewCount: 89,
    bio: 'Licensed clinical psychologist specializing in anxiety, depression, and trauma-informed care.',
    clinicLocation: '456 Oak Ave, Seattle, WA 98102',
    virtualAvailable: true,
    inPersonAvailable: true,
    nextAvailable: '2026-02-04T14:00:00',
    verified: true,
    lat: 47.6205,
    lng: -122.3493,
  },
  {
    id: '3',
    name: 'Dr. Amara Okafor',
    specialty: 'Pediatrics',
    photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400',
    languages: ['English', 'ASL', 'French'],
    rating: 5.0,
    reviewCount: 156,
    bio: 'Pediatrician dedicated to providing compassionate care for children and supporting families.',
    clinicLocation: '789 Pine St, Seattle, WA 98104',
    virtualAvailable: true,
    inPersonAvailable: true,
    nextAvailable: '2026-02-05T09:30:00',
    verified: true,
    lat: 47.6097,
    lng: -122.3331,
  },
  {
    id: '4',
    name: 'Dr. James Kim',
    specialty: 'Internal Medicine',
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400',
    languages: ['English', 'Korean'],
    rating: 4.7,
    reviewCount: 94,
    bio: 'Internal medicine specialist focusing on chronic disease management and preventative health.',
    clinicLocation: '321 Cedar Blvd, Seattle, WA 98103',
    virtualAvailable: true,
    inPersonAvailable: false,
    nextAvailable: '2026-02-06T11:00:00',
    verified: true,
    lat: 47.6740,
    lng: -122.3488,
  },
];

// Mock appointments
export const mockAppointments = [
  {
    id: 'apt1',
    doctorId: '1',
    doctorName: 'Dr. Sarah Chen',
    patientId: 'patient1',
    patientName: 'John Smith',
    date: '2026-02-10',
    time: '10:00 AM',
    type: 'virtual',
    duration: 30,
    status: 'upcoming',
    reason: 'Annual checkup',
    notes: 'Please have blood pressure readings ready',
  },
  {
    id: 'apt2',
    doctorId: '2',
    doctorName: 'Dr. Michael Rodriguez',
    patientId: 'patient1',
    patientName: 'John Smith',
    date: '2026-01-15',
    time: '2:00 PM',
    type: 'in-person',
    duration: 60,
    status: 'completed',
    reason: 'Therapy session',
    notes: '',
    summary: 'Patient showed progress with anxiety management techniques.',
  },
];

// Care types for questionnaire
export const careTypes = [
  {
    id: 'primary',
    name: 'Primary Care',
    description: 'General health concerns, checkups, and preventive care',
  },
  {
    id: 'mental',
    name: 'Mental Health',
    description: 'Counseling, therapy, and mental wellness support',
  },
  {
    id: 'specialist',
    name: 'Specialist Care',
    description: 'Specific medical conditions requiring specialized expertise',
  },
  {
    id: 'urgent',
    name: 'Urgent Care',
    description: 'Non-emergency conditions needing prompt attention',
  },
];

// Mock reviews
export const mockReviews = [
  {
    id: 'rev1',
    doctorId: '1',
    patientName: 'Anonymous',
    rating: 5,
    comment: 'Dr. Chen is thorough and takes time to listen. Highly recommend!',
    date: '2026-01-20',
  },
  {
    id: 'rev2',
    doctorId: '1',
    patientName: 'M. Johnson',
    rating: 5,
    comment: 'Great experience, very professional and caring.',
    date: '2026-01-10',
  },
];

// Mock messages
export const mockMessages = [
  {
    id: 'msg1',
    senderId: 'patient1',
    senderName: 'You',
    receiverId: '1',
    content: 'Hi Dr. Chen, I have a question about my prescription.',
    timestamp: '2026-02-01T09:15:00',
    appointmentId: 'apt1',
  },
  {
    id: 'msg2',
    senderId: '1',
    senderName: 'Dr. Sarah Chen',
    receiverId: 'patient1',
    content: 'Hello! I\'d be happy to help. What\'s your question?',
    timestamp: '2026-02-01T10:30:00',
    appointmentId: 'apt1',
  },
];

// Pending doctor verifications (for admin)
export const mockPendingDoctors = [
  {
    id: 'pending1',
    name: 'Dr. Emily Watson',
    email: 'emily.watson@example.com',
    specialty: 'Dermatology',
    licenseNumber: 'WA-12345',
    submittedDate: '2026-01-28',
    status: 'pending',
  },
  {
    id: 'pending2',
    name: 'Dr. David Lee',
    email: 'david.lee@example.com',
    specialty: 'Cardiology',
    licenseNumber: 'WA-67890',
    submittedDate: '2026-01-25',
    status: 'pending',
  },
];

// Mock analytics data
export const mockAnalytics = {
  totalBookings: 1247,
  virtualBookings: 823,
  inPersonBookings: 424,
  cancellationRate: 8.5,
  waitlistCount: 34,
  popularCareTypes: [
    { name: 'Primary Care', count: 487 },
    { name: 'Mental Health', count: 356 },
    { name: 'Specialist Care', count: 234 },
    { name: 'Urgent Care', count: 170 },
  ],
  bookingTrends: [
    { month: 'Aug', bookings: 98 },
    { month: 'Sep', bookings: 112 },
    { month: 'Oct', bookings: 145 },
    { month: 'Nov', bookings: 167 },
    { month: 'Dec', bookings: 189 },
    { month: 'Jan', bookings: 203 },
  ],
};
