const API_BASE = '/api';

export interface ReviewRecord {
  id: number;
  patient_id: number;
  doctor_id: number;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  patient_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorReviewsResponse {
  doctor_id: number;
  doctor_name: string;
  average_rating: number;
  review_count: number;
  reviews: ReviewRecord[];
}

export interface DoctorReviewResponse {
  doctor_id: number;
  review: ReviewRecord | null;
}

export interface UpsertReviewPayload {
  appointment_id: number;
  rating: number;
  comment?: string;
  is_anonymous?: boolean;
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

const parseJson = async (response: Response) => {
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

export const getDoctorReviews = async (doctorId: number | string): Promise<DoctorReviewsResponse> => {
  const response = await fetch(`${API_BASE}/reviews/doctor/${doctorId}`);
  const data = await parseJson(response);
  return data as DoctorReviewsResponse;
};

export const getMyReviewForDoctor = async (
  token: string | null,
  doctorId: number | string
): Promise<DoctorReviewResponse> => {
  const response = await fetch(`${API_BASE}/reviews/my/${doctorId}`, {
    headers: withAuth(token),
  });

  const data = await parseJson(response);
  return data as DoctorReviewResponse;
};

export const upsertReview = async (
  token: string | null,
  payload: UpsertReviewPayload
): Promise<ReviewRecord> => {
  const response = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });

  const data = await parseJson(response);
  return (data as { review: ReviewRecord }).review;
};
