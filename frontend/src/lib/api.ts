import axios from "axios";

const snakeToCamel = (key: string) =>
  key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const camelToSnake = (key: string) =>
  key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";

const shouldTransform = (value: unknown) => {
  if (value == null) return false;
  if (typeof FormData !== "undefined" && value instanceof FormData) return false;
  if (typeof Blob !== "undefined" && value instanceof Blob) return false;
  if (typeof File !== "undefined" && value instanceof File) return false;
  if (value instanceof Date) return false;
  return true;
};

const transformKeys = (value: unknown, transform: (key: string) => string): unknown => {
  if (!shouldTransform(value)) return value;
  if (Array.isArray(value)) return value.map((item) => transformKeys(item, transform));
  if (!isPlainObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      transform(key),
      transformKeys(nested, transform),
    ])
  );
};

const detailToMessage = (detail: unknown): string | undefined => {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (isPlainObject(item)) {
          const msg = item.msg ?? item.message ?? item.detail;
          return typeof msg === "string" ? msg : undefined;
        }
        return undefined;
      })
      .filter(Boolean);

    return messages.length ? messages.join(", ") : undefined;
  }

  if (isPlainObject(detail)) {
    const msg = detail.msg ?? detail.message ?? detail.detail;
    return typeof msg === "string" ? msg : undefined;
  }

  return undefined;
};

const normalizeErrorData = (data: unknown): unknown => {
  const transformed = transformKeys(data, snakeToCamel);
  if (!isPlainObject(transformed)) return transformed;

  const detailMessage = detailToMessage(transformed.detail);
  if (detailMessage) {
    if (typeof transformed.message !== "string") transformed.message = detailMessage;
    if (typeof transformed.error !== "string") transformed.error = detailMessage;
  }

  return transformed;
};

type TokenResponse = {
  accessToken: string;
  tokenType: string;
  user: unknown;
};

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Add auth token and convert frontend camelCase payloads to backend snake_case.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data) config.data = transformKeys(config.data, camelToSnake);
  if (config.params) config.params = transformKeys(config.params, camelToSnake);
  return config;
});

// Convert backend snake_case responses to the camelCase shape used by the app.
api.interceptors.response.use(
  (res) => {
    res.data = transformKeys(res.data, snakeToCamel);
    return res;
  },
  (err) => {
    if (err.response?.data) {
      err.response.data = normalizeErrorData(err.response.data);
    }
    const requestUrl = err.config?.url ?? "";
    const isAuthRequest = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");
    const hadToken = Boolean(localStorage.getItem("auth_token"));
    if (err.response?.status === 401 && hadToken && !isAuthRequest) {
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
    const res = await api.post<TokenResponse>("/auth/register", {
      email,
      name,
      password,
    });
    localStorage.setItem("auth_token", res.data.accessToken);
    localStorage.setItem("auth_user", JSON.stringify(res.data.user));
    return res.data;
  },

  login: async (email: string, password: string) => {
    const res = await api.post<TokenResponse>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("auth_token", res.data.accessToken);
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
    try {
      const res = await api.get("/subscriptions/active");
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
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
