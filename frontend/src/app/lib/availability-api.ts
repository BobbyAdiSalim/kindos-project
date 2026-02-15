export interface TimeSlot {
  start_time: string;
  end_time: string;
  appointment_types: string[];
}

export interface BookableSlotsResponse {
  date: string;
  doctor_id: number;
  slots: TimeSlot[];
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
  appointmentType?: string
): Promise<BookableSlotsResponse> => {
  const params = new URLSearchParams({ date });
  if (appointmentType) {
    params.set('appointmentType', appointmentType);
  }

  const response = await fetch(
    `${API_BASE}/availability/doctor/${userId}/slots?${params.toString()}`
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to fetch available time slots');
  }

  return data as BookableSlotsResponse;
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
