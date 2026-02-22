const API_BASE = '/api';

export type WaitlistAppointmentType = 'virtual' | 'in-person';
export type WaitlistNotificationPreference = 'email' | 'sms' | 'both' | 'in-app';
export type WaitlistStatus = 'active' | 'notified' | 'booked' | 'removed';

export interface WaitlistDoctor {
  id: number;
  user_id: number;
  full_name: string;
  specialty: string | null;
  username: string | null;
}

export interface WaitlistEntry {
  id: number;
  patient_id: number;
  doctor_id: number;
  desired_date: string;
  desired_start_time: string;
  desired_end_time: string;
  appointment_type: WaitlistAppointmentType;
  notification_preference: WaitlistNotificationPreference;
  status: WaitlistStatus;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
  doctor: WaitlistDoctor | null;
}

export interface JoinWaitlistPayload {
  doctor_user_id: number;
  desired_date: string;
  desired_start_time: string;
  desired_end_time: string;
  appointment_type: WaitlistAppointmentType;
  notification_preference?: WaitlistNotificationPreference;
}

interface WaitlistSingleResponse {
  message?: string;
  waitlist_entry: WaitlistEntry;
}

interface WaitlistListResponse {
  waitlist_entries: WaitlistEntry[];
}

export class WaitlistApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const withAuth = (token: string | null) => {
  if (!token) {
    throw new Error('Authentication required.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new WaitlistApiError(response.status, text || 'Unexpected server response.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new WaitlistApiError(response.status, data?.message || data?.error || 'Request failed.');
  }

  return data;
};

export const joinWaitlist = async (
  token: string | null,
  payload: JoinWaitlistPayload
): Promise<WaitlistEntry> => {
  const response = await fetch(`${API_BASE}/waitlist`, {
    method: 'POST',
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);
  return (data as WaitlistSingleResponse).waitlist_entry;
};

export const getMyWaitlistEntries = async (token: string | null): Promise<WaitlistEntry[]> => {
  const response = await fetch(`${API_BASE}/waitlist/my`, {
    headers: withAuth(token),
  });

  const data = await parseJsonResponse(response);
  return (data as WaitlistListResponse).waitlist_entries || [];
};

export const removeMyWaitlistEntry = async (token: string | null, waitlistEntryId: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/waitlist/${waitlistEntryId}`, {
    method: 'DELETE',
    headers: withAuth(token),
  });

  await parseJsonResponse(response);
};
