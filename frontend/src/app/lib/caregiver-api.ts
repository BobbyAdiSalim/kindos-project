import type { AppointmentRecord, BookAppointmentPayload } from './appointment-api';

const API_BASE = '/api';

export interface LinkedPatient {
  id: number;
  caregiver_id: number;
  patient_id: number;
  status: 'pending' | 'approved' | 'rejected';
  relationship: string | null;
  created_at: string;
  patient: {
    id: number;
    full_name: string;
    user_id: number;
    user: { id: number; email: string };
  };
}

export interface CaregiverRequest {
  id: number;
  caregiver_id: number;
  patient_id: number;
  status: 'pending' | 'approved' | 'rejected';
  relationship: string | null;
  created_at: string;
  caregiver: {
    id: number;
    full_name: string;
    user: { id: number; email: string };
  };
}

const headers = (): HeadersInit => ({ 'Content-Type': 'application/json' });

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(text || 'Unexpected server response.');
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Request failed.');
  }
  return data;
};

// ── Caregiver endpoints ──

export const sendLinkRequest = async (email: string, relationship?: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/caregiver/link-request`, {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ email, relationship }),
  });
  await parseResponse(response);
};

export const getLinkedPatients = async (): Promise<LinkedPatient[]> => {
  const response = await fetch(`${API_BASE}/caregiver/patients`, {
    headers: headers(),
    credentials: 'include',
  });
  const data = await parseResponse(response);
  return data.patients;
};

export const removeLinkedPatient = async (patientId: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/caregiver/patients/${patientId}`, {
    method: 'DELETE',
    headers: headers(),
    credentials: 'include',
  });
  await parseResponse(response);
};

export const getPatientAppointments = async (patientId: number): Promise<AppointmentRecord[]> => {
  const response = await fetch(`${API_BASE}/caregiver/patients/${patientId}/appointments`, {
    headers: headers(),
    credentials: 'include',
  });
  const data = await parseResponse(response);
  return data.appointments;
};

export const bookForPatient = async (
  patientId: number,
  payload: BookAppointmentPayload
): Promise<AppointmentRecord> => {
  const response = await fetch(`${API_BASE}/caregiver/patients/${patientId}/appointments`, {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(response);
  return data.appointment;
};

export const cancelForPatient = async (
  patientId: number,
  appointmentId: number,
  reason?: string
): Promise<void> => {
  const response = await fetch(
    `${API_BASE}/caregiver/patients/${patientId}/appointments/${appointmentId}/cancel`,
    {
      method: 'PATCH',
      headers: headers(),
      credentials: 'include',
      body: JSON.stringify({ reason }),
    }
  );
  await parseResponse(response);
};

// ── Patient-side endpoints ──

export const getCaregiverRequests = async (): Promise<CaregiverRequest[]> => {
  const response = await fetch(`${API_BASE}/patient/caregiver-requests`, {
    headers: headers(),
    credentials: 'include',
  });
  const data = await parseResponse(response);
  return data.requests;
};

export const respondToCaregiverRequest = async (
  requestId: number,
  status: 'approved' | 'rejected'
): Promise<void> => {
  const response = await fetch(`${API_BASE}/patient/caregiver-requests/${requestId}`, {
    method: 'PATCH',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  await parseResponse(response);
};
