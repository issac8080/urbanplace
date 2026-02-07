import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export type UserRole = "customer" | "worker" | "tutor";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  trust_score: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ProviderSearchResult {
  id: number;
  name: string;
  email: string;
  role: string;
  trust_score: number;
  service_type?: string;
  subject?: string;
  verification_status: string;
  rating?: number;
  qualification_score?: number;
  skill_score?: number;
  profile_summary?: string;
}

export interface Booking {
  id: number;
  customer_id: number;
  provider_id: number;
  service_type: string;
  subject?: string;
  total_price: number;
  status: string;
  created_at: string;
}

export interface WorkerProfile {
  id: number;
  user_id: number;
  service_type: string;
  verification_status: string;
  rating: number;
  price?: number;
  created_at: string;
}

export interface TutorProfile {
  id: number;
  user_id: number;
  subject: string;
  qualification_score?: number;
  skill_score?: number;
  verification_status: string;
  profile_summary?: string;
  price?: number;
  created_at: string;
}

export const auth = {
  register: (name: string, email: string, password: string, role: UserRole) =>
    api.post<TokenResponse>("/api/auth/register", { name, email, password, role }),
  login: (email: string, password: string) =>
    api.post<TokenResponse>("/api/auth/login", { email, password }),
  me: () => api.get<User>("/api/auth/me"),
};

export const constants = {
  serviceTypes: () => api.get<{ home_services: string[]; tutor_subjects: string[] }>("/api/constants/service-types"),
};

export const workers = {
  createProfile: (serviceType: string, price: number, idDocument?: File) => {
    const form = new FormData();
    form.append("service_type", serviceType);
    form.append("price", String(price));
    if (idDocument) form.append("id_document", idDocument);
    return api.post<WorkerProfile>("/api/workers/profile", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getProfile: () => api.get<WorkerProfile>("/api/workers/profile"),
};

export const tutors = {
  createProfile: (data: {
    subject: string;
    price: number;
    qualification_text?: string;
    experience_description?: string;
    demo_transcript: string;
    id_document?: File;
    qualification_document?: File;
  }) => {
    const form = new FormData();
    form.append("subject", data.subject);
    form.append("price", String(data.price));
    form.append("qualification_text", data.qualification_text || "");
    form.append("experience_description", data.experience_description || "");
    form.append("demo_transcript", data.demo_transcript);
    if (data.id_document) form.append("id_document", data.id_document);
    if (data.qualification_document) form.append("qualification_document", data.qualification_document);
    return api.post<TutorProfile>("/api/tutors/profile", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getProfile: () => api.get<TutorProfile>("/api/tutors/profile"),
};

export const providers = {
  search: (params: { service_type?: string; subject?: string }) =>
    api.get<ProviderSearchResult[]>("/api/providers/search", { params }),
};

export const bookings = {
  list: () => api.get<Booking[]>("/api/bookings"),
  create: (provider_id: number, service_type: string, total_price: number, subject?: string) =>
    api.post<Booking>("/api/bookings", { provider_id, service_type, total_price, subject }),
  updateStatus: (bookingId: number, status: string) =>
    api.patch<Booking>(`/api/bookings/${bookingId}`, { status }),
};

export const ratings = {
  create: (provider_id: number, score: number, comment?: string, booking_id?: number) =>
    api.post("/api/ratings", { provider_id, score, comment, booking_id }),
};

// ——— Chat (AI assistant) ———
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RecommendedProvider {
  id: number;
  name: string;
  service_type: string;
  rating: number;
  trust_score: number;
  price: number;
  distance: number;
}

export interface ChatResponse {
  reply: string;
  recommended_providers: RecommendedProvider[] | null;
}

export const chat = {
  send: (message: string, conversation_history: ChatMessage[]) =>
    api.post<ChatResponse>("/api/chat", { message, conversation_history }),
};
