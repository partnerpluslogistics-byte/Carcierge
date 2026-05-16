import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export { api };

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  register: async (email: string, name: string, password: string) => {
    const res = await api.post<{ access_token: string; token_type: string; user: unknown }>("/auth/register", {
      email,
      name,
      password,
    });
    localStorage.setItem("auth_token", res.data.access_token);
    localStorage.setItem("auth_user", JSON.stringify(res.data.user));
    return res.data;
  },

  login: async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; token_type: string; user: unknown }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("auth_token", res.data.access_token);
    localStorage.setItem("auth_user", JSON.stringify(res.data.user));
    return res.data;
  },

  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  },

  me: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const userApi = {
  getProfile: async () => {
    const res = await api.get("/users/profile");
    return res.data;
  },

  updateProfile: async (data: Record<string, unknown>) => {
    const res = await api.put("/users/profile", data);
    return res.data;
  },

  updateNotifications: async (data: Record<string, unknown>) => {
    const res = await api.put("/users/notifications", data);
    return res.data;
  },

  deleteAccount: async () => {
    const res = await api.delete("/users/account");
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Admin Users
// ---------------------------------------------------------------------------

export const adminUserApi = {
  listAll: async () => {
    const res = await api.get("/admin/users");
    return res.data;
  },

  update: async (id: number | string, data: Record<string, unknown>) => {
    const res = await api.put(`/admin/users/${id}`, data);
    return res.data;
  },

  archive: async (id: number | string) => {
    const res = await api.post(`/admin/users/${id}/archive`);
    return res.data;
  },

  unarchive: async (id: number | string) => {
    const res = await api.post(`/admin/users/${id}/unarchive`);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Owners
// ---------------------------------------------------------------------------

export const ownerApi = {
  list: async () => {
    const res = await api.get("/owners");
    return res.data;
  },

  getById: async (id: number | string) => {
    const res = await api.get(`/owners/${id}`);
    return res.data;
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/owners", data);
    return res.data;
  },

  update: async (id: number | string, data: Record<string, unknown>) => {
    const res = await api.put(`/owners/${id}`, data);
    return res.data;
  },

  delete: async (id: number | string) => {
    const res = await api.delete(`/owners/${id}`);
    return res.data;
  },

  search: async (query: string) => {
    const res = await api.get("/owners/search", { params: { q: query } });
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export const vehicleApi = {
  list: async () => {
    const res = await api.get("/vehicles");
    return res.data;
  },

  getById: async (id: number | string) => {
    const res = await api.get(`/vehicles/${id}`);
    return res.data;
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/vehicles", data);
    return res.data;
  },

  update: async (id: number | string, data: Record<string, unknown>) => {
    const res = await api.put(`/vehicles/${id}`, data);
    return res.data;
  },

  delete: async (id: number | string) => {
    const res = await api.delete(`/vehicles/${id}`);
    return res.data;
  },

  search: async (query: string) => {
    const res = await api.get("/vehicles/search", { params: { q: query } });
    return res.data;
  },

  adminCreate: async (data: Record<string, unknown>) => {
    const res = await api.post("/admin/vehicles", data);
    return res.data;
  },

  adminListAll: async () => {
    const res = await api.get("/admin/vehicles");
    return res.data;
  },

  adminBulkImport: async (formData: FormData) => {
    const res = await api.post("/admin/vehicles/bulk-import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Registrations
// ---------------------------------------------------------------------------

export const registrationApi = {
  getByVehicleId: async (vehicleId: number | string) => {
    const res = await api.get("/registrations", { params: { vehicle_id: vehicleId } });
    return res.data;
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/registrations", data);
    return res.data;
  },

  update: async (id: number | string, data: Record<string, unknown>) => {
    const res = await api.put(`/registrations/${id}`, data);
    return res.data;
  },

  delete: async (id: number | string) => {
    const res = await api.delete(`/registrations/${id}`);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

export const insuranceApi = {
  getByVehicleId: async (vehicleId: number | string) => {
    const res = await api.get("/insurance", { params: { vehicle_id: vehicleId } });
    return res.data;
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/insurance", data);
    return res.data;
  },

  update: async (id: number | string, data: Record<string, unknown>) => {
    const res = await api.put(`/insurance/${id}`, data);
    return res.data;
  },

  delete: async (id: number | string) => {
    const res = await api.delete(`/insurance/${id}`);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Inspections
// ---------------------------------------------------------------------------

export const inspectionApi = {
  getByVehicleId: async (vehicleId: number | string) => {
    const res = await api.get("/inspections", { params: { vehicle_id: vehicleId } });
    return res.data;
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/inspections", data);
    return res.data;
  },

  update: async (id: number | string, data: Record<string, unknown>) => {
    const res = await api.put(`/inspections/${id}`, data);
    return res.data;
  },

  delete: async (id: number | string) => {
    const res = await api.delete(`/inspections/${id}`);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const documentApi = {
  getByVehicleId: async (vehicleId: number | string) => {
    const res = await api.get("/documents", { params: { vehicle_id: vehicleId } });
    return res.data;
  },

  upload: async (formData: FormData) => {
    const res = await api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/documents", data);
    return res.data;
  },

  delete: async (id: number | string) => {
    const res = await api.delete(`/documents/${id}`);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboardApi = {
  getSummary: async () => {
    const res = await api.get("/dashboard/summary");
    return res.data;
  },

  getExpiryAlerts: async () => {
    const res = await api.get("/dashboard/expiry-alerts");
    return res.data;
  },

  getCalendarEvents: async () => {
    const res = await api.get("/dashboard/calendar-events");
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Service Requests
// ---------------------------------------------------------------------------

export const serviceRequestApi = {
  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/service-requests", data);
    return res.data;
  },

  listMine: async () => {
    const res = await api.get("/service-requests/mine");
    return res.data;
  },

  listAll: async () => {
    const res = await api.get("/service-requests/all");
    return res.data;
  },

  updateStatus: async (
    id: number | string,
    status: string,
    adminNotes?: string
  ) => {
    const res = await api.put(`/service-requests/${id}/status`, {
      status,
      adminNotes,
    });
    return res.data;
  },

  update: async (id: number | string, data: Record<string, unknown>) => {
    const res = await api.put(`/service-requests/${id}`, data);
    return res.data;
  },

  cancel: async (id: number | string) => {
    const res = await api.post(`/service-requests/${id}/cancel`);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const paymentApi = {
  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/payments", data);
    return res.data;
  },

  listMine: async () => {
    const res = await api.get("/payments/mine");
    return res.data;
  },

  listAll: async () => {
    const res = await api.get("/payments/all");
    return res.data;
  },

  listByVehicle: async (vehicleId: number | string) => {
    const res = await api.get(`/payments/vehicle/${vehicleId}`);
    return res.data;
  },

  listByServiceRequest: async (srId: number | string) => {
    const res = await api.get(`/payments/service-request/${srId}`);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export const subscriptionApi = {
  getMine: async () => {
    const res = await api.get("/subscriptions/mine");
    return res.data;
  },

  getActive: async () => {
    const res = await api.get("/subscriptions/active");
    return res.data;
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/subscriptions", data);
    return res.data;
  },

  listAll: async () => {
    const res = await api.get("/subscriptions/all");
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Bank Transfers
// ---------------------------------------------------------------------------

export const bankTransferApi = {
  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/bank-transfers", data);
    return res.data;
  },

  confirm: async (id: number | string) => {
    const res = await api.post(`/bank-transfers/${id}/confirm`);
    return res.data;
  },

  approve: async (id: number | string, adminNotes?: string) => {
    const res = await api.post(`/bank-transfers/${id}/approve`, { adminNotes });
    return res.data;
  },

  reject: async (id: number | string, reason: string) => {
    const res = await api.post(`/bank-transfers/${id}/reject`, { reason });
    return res.data;
  },

  getPending: async () => {
    const res = await api.get("/bank-transfers/pending");
    return res.data;
  },

  getAll: async () => {
    const res = await api.get("/bank-transfers/all");
    return res.data;
  },

  getMine: async () => {
    const res = await api.get("/bank-transfers/mine");
    return res.data;
  },

  archive: async (id: number | string) => {
    const res = await api.post(`/bank-transfers/${id}/archive`);
    return res.data;
  },

  unarchive: async (id: number | string) => {
    const res = await api.post(`/bank-transfers/${id}/unarchive`);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationApi = {
  list: async () => {
    const res = await api.get("/notifications");
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await api.get("/notifications/unread-count");
    return res.data;
  },

  markAsRead: async (id: number | string) => {
    const res = await api.post(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.post("/notifications/read-all");
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminApi = {
  getAnalytics: async () => {
    const res = await api.get("/admin/analytics");
    return res.data;
  },

  getOwnersForUser: async (userId: number | string) => {
    const res = await api.get("/admin/owners", { params: { user_id: userId } });
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Vehicle History
// ---------------------------------------------------------------------------

export const vehicleHistoryApi = {
  list: async (vehicleId: number | string) => {
    const res = await api.get("/vehicle-history", { params: { vehicle_id: vehicleId } });
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const searchApi = {
  search: async (q: string) => {
    const res = await api.get("/search", { params: { q } });
    return res.data;
  },
};
