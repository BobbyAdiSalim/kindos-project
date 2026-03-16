const API_BASE = '/api';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type AppointmentType = 'virtual' | 'in-person';

export interface AppointmentPerson {
  id: number;
  user_id: number;
  full_name: string;
  username: string | null;
}

export interface AppointmentDoctor extends AppointmentPerson {
  specialty: string | null;
  clinic_location: string | null;
  time_zone?: string | null;
  virtual_available: boolean;
  in_person_available: boolean;
}

export interface AppointmentRecord {
  id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  duration: number;
  reason: string;
  notes: string | null;
  accessibility_needs: string[];
  summary: string | null;
  summary_written_at: string | null;
  cancelled_at: string | null;
  cancelled_by: number | null;
  cancellation_reason: string | null;
  notify_on_doctor_approval: boolean;
  declined_by_doctor: boolean;
  doctor: AppointmentDoctor | null;
  patient: AppointmentPerson | null;
  created_at: string;
  updated_at: string;
}

export interface BookAppointmentPayload {
  doctor_user_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: AppointmentType;
  reason: string;
  notes?: string;
  accessibility_needs?: string[];
  notify_on_doctor_approval?: boolean;
}

export interface RescheduleAppointmentPayload {
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: AppointmentType;
}

interface AppointmentListResponse {
  appointments: AppointmentRecord[];
}

interface AppointmentSingleResponse {
  message?: string;
  appointment: AppointmentRecord;
}

export class ApiError extends Error {
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
    throw new ApiError(response.status, text || 'Unexpected server response.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, data?.message || data?.error || 'Request failed.');
  }

  return data;
};

export const createAppointmentBooking = async (
  token: string | null,
  payload: BookAppointmentPayload
): Promise<AppointmentRecord> => {
  const response = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);
  return (data as AppointmentSingleResponse).appointment;
};

export const getMyAppointments = async (token: string | null): Promise<AppointmentRecord[]> => {
  const response = await fetch(`${API_BASE}/appointments/my`, {
    headers: withAuth(token),
  });

  const data = await parseJsonResponse(response);
  return (data as AppointmentListResponse).appointments || [];
};

export const getAppointmentById = async (
  token: string | null,
  appointmentId: string
): Promise<AppointmentRecord> => {
  const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
    headers: withAuth(token),
  });

  const data = await parseJsonResponse(response);
  return (data as AppointmentSingleResponse).appointment;
};

export const updateAppointmentDecision = async (
  token: string | null,
  appointmentId: string,
  action: 'confirm' | 'decline',
  reason?: string
): Promise<AppointmentRecord> => {
  const response = await fetch(`${API_BASE}/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    headers: withAuth(token),
    body: JSON.stringify({
      action,
      ...(reason ? { reason } : {}),
    }),
  });

  const data = await parseJsonResponse(response);
  return (data as AppointmentSingleResponse).appointment;
};

export const cancelAppointment = async (
  token: string | null,
  appointmentId: string,
  reason?: string
): Promise<AppointmentRecord> => {
  const response = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    headers: withAuth(token),
    body: JSON.stringify({
      ...(reason ? { reason } : {}),
    }),
  });

  const data = await parseJsonResponse(response);
  return (data as AppointmentSingleResponse).appointment;
};

export const rescheduleAppointment = async (
  token: string | null,
  appointmentId: string,
  payload: RescheduleAppointmentPayload
): Promise<AppointmentRecord> => {
  const response = await fetch(`${API_BASE}/appointments/${appointmentId}/reschedule`, {
    method: 'PATCH',
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);
  return (data as AppointmentSingleResponse).appointment;
};

export interface PatientInfo {
  id: number;
  user_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
}

export interface PatientHistoryAppointment {
  id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  duration: number;
  reason: string;
  summary: string | null;
  summary_written_at: string | null;
  doctor: AppointmentDoctor | null;
  created_at: string;
  updated_at: string;
}

export interface PatientHistoryResponse {
  patient: PatientInfo;
  appointments: PatientHistoryAppointment[];
}

export const getPatientHistory = async (
  token: string | null,
  patientId: number
): Promise<PatientHistoryResponse> => {
  const response = await fetch(`${API_BASE}/patients/${patientId}/history`, {
    headers: withAuth(token),
  });

  const data = await parseJsonResponse(response);
  return data as PatientHistoryResponse;
};

export const saveSummary = async (
  token: string | null,
  appointmentId: string,
  summary: string
): Promise<AppointmentRecord> => {
  const response = await fetch(`${API_BASE}/appointments/${appointmentId}/summary`, {
    method: 'PATCH',
    headers: withAuth(token),
    body: JSON.stringify({ summary }),
  });

  const data = await parseJsonResponse(response);
  return (data as AppointmentSingleResponse).appointment;
};

export const markAppointmentComplete = async (
  token: string | null,
  appointmentId: string
): Promise<AppointmentRecord> => {
  const response = await fetch(`${API_BASE}/appointments/${appointmentId}/complete`, {
    method: 'PATCH',
    headers: withAuth(token),
  });

  const data = await parseJsonResponse(response);
  return (data as AppointmentSingleResponse).appointment;
};
