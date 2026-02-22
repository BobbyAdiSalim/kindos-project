export interface TimeSlot {
  start_time: string;
  end_time: string;
  appointment_types: string[];
}

export interface BookedTimeSlot extends TimeSlot {
  booked_appointment_type: 'virtual' | 'in-person';
}

export interface BookableSlotsResponse {
  date: string;
  doctor_id: number;
  slots: TimeSlot[];
  booked_slots: BookedTimeSlot[];
}

const API_BASE = '/api';

/**
 * Fetch bookable time slots for a doctor on a specific date.
 * @param userId - The user ID of the doctor (users table PK)
 * @param date - Date string in YYYY-MM-DD format
 * @param appointmentType - Optional filter: 'virtual' or 'in-person'
 */
export const getBookableSlots = async (
  userId: string,
  date: string,
  appointmentType?: string,
  options?: {
    includeBooked?: boolean;
  }
): Promise<BookableSlotsResponse> => {
  const params = new URLSearchParams({ date });
  if (appointmentType) {
    params.set('appointmentType', appointmentType);
  }
  if (options?.includeBooked) {
    params.set('includeBooked', 'true');
  }

  const response = await fetch(
    `${API_BASE}/availability/doctor/${userId}/slots?${params.toString()}`
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to fetch available time slots');
  }

  const typedData = data as Partial<BookableSlotsResponse>;
  return {
    date: String(typedData.date || date),
    doctor_id: Number(typedData.doctor_id || 0),
    slots: Array.isArray(typedData.slots) ? typedData.slots : [],
    booked_slots: Array.isArray(typedData.booked_slots) ? typedData.booked_slots : [],
  };
};

/**
 * Format a 24h time string (e.g., "09:00") to 12h display (e.g., "9:00 AM").
 */
export const formatTime24to12 = (time24: string): string => {
  const [hourStr, minuteStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minuteStr} ${ampm}`;
};
