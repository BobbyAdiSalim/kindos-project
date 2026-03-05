export type ProfileRole = 'patient' | 'doctor' | 'admin';

export interface ProfileUser {
  id: number;
  username: string;
  email?: string;
  role: ProfileRole;
}

export interface PatientProfile {
  id: number;
  full_name: string;
  profile_complete: boolean;
  date_of_birth?: string | null;
  phone?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  accessibility_preferences?: string[];
}

export interface DoctorProfile {
  id: number;
  full_name: string;
  specialty?: string;
  verification_status?: 'pending' | 'approved' | 'denied';
  profile_complete: boolean;
  phone?: string | null;
  license_number?: string | null;
  bio?: string | null;
  languages?: string[];
  clinic_location?: string | null;
  virtual_available?: boolean;
  in_person_available?: boolean;
  latitude?: string | null;
  longitude?: string | null;
}

export interface ProfileResponse {
  user: ProfileUser;
  profile: PatientProfile | DoctorProfile | null;
}

const API_BASE = '/api';

const withAuth = (token: string | null) => {
  if (!token) {
    throw new Error('Authentication required.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const getMyProfile = async (token: string | null): Promise<ProfileResponse> => {
  const response = await fetch(`${API_BASE}/profile/me`, {
    headers: withAuth(token),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load profile.');
  }

  return data as ProfileResponse;
};

export const updateMyProfile = async (
  token: string | null,
  body: Record<string, unknown>
): Promise<ProfileResponse> => {
  const response = await fetch(`${API_BASE}/profile/me`, {
    method: 'PUT',
    headers: withAuth(token),
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to update profile.');
  }

  return data as ProfileResponse;
};

export const getPublicProfile = async (userId: string): Promise<ProfileResponse> => {
  const response = await fetch(`${API_BASE}/profile/${userId}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load profile.');
  }

  return data as ProfileResponse;
};
