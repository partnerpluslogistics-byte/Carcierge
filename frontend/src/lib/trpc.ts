/**
 * tRPC compatibility layer — exposes the same hook interface as the original
 * tRPC client but drives REST calls through React Query + axios.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  authApi,
  userApi,
  adminUserApi,
  ownerApi,
  vehicleApi,
  registrationApi,
  insuranceApi,
  inspectionApi,
  documentApi,
  dashboardApi,
  serviceRequestApi,
  paymentApi,
  subscriptionApi,
  bankTransferApi,
  notificationApi,
  adminApi,
  vehicleHistoryApi,
} from "./api";

// ─── helpers ────────────────────────────────────────────────────────────────

type QueryOpts<T = unknown> = {
  enabled?: boolean;
  refetchInterval?: number | false;
  retry?: boolean | number;
  refetchOnWindowFocus?: boolean;
  initialData?: T;
};

type MutationOpts<TData = unknown, TVars = unknown> = {
  onSuccess?: (data: TData, variables: TVars) => void;
  onError?: (error: Error, variables: TVars) => void;
  onSettled?: () => void;
};

// ────────────────────────────────────────────────────────────────────────────

export const trpc = {
  // ── auth ──────────────────────────────────────────────────────────────────
  auth: {
    me: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["auth", "me"],
          queryFn: () => authApi.me().catch(() => null),
          retry: false,
          refetchOnWindowFocus: false,
          ...opts,
        }),
    },
    logout: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: () => {
            authApi.logout();
            return Promise.resolve({ success: true });
          },
          ...opts,
        }),
    },
  },

  // ── userProfile ───────────────────────────────────────────────────────────
  userProfile: {
    get: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["userProfile"],
          queryFn: () => userApi.getProfile(),
          ...opts,
        }),
    },
    update: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            userApi.updateProfile(data),
          ...opts,
        }),
    },
    updateNotifications: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            userApi.updateNotifications(data),
          ...opts,
        }),
    },
    deleteAccount: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (_input?: { confirmText: string }) =>
            userApi.deleteAccount(),
          ...opts,
        }),
    },
  },

  // ── owners ────────────────────────────────────────────────────────────────
  owners: {
    list: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["owners"],
          queryFn: () => ownerApi.list(),
          ...opts,
        }),
    },
    getById: {
      useQuery: (input?: { id: number }, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["owners", input?.id],
          queryFn: () => ownerApi.getById(input!.id),
          enabled: input?.id != null,
          ...opts,
        }),
    },
    create: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) => ownerApi.create(data),
          ...opts,
        }),
    },
    update: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id, ...data }: { id: number; [k: string]: unknown }) =>
            ownerApi.update(id, data),
          ...opts,
        }),
    },
    delete: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) => ownerApi.delete(id),
          ...opts,
        }),
    },
    search: {
      useQuery: (input?: { query: string }, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["owners", "search", input?.query],
          queryFn: () => ownerApi.search(input?.query ?? ""),
          ...opts,
        }),
    },
  },

  // ── vehicles ──────────────────────────────────────────────────────────────
  vehicles: {
    list: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["vehicles"],
          queryFn: () => vehicleApi.list(),
          ...opts,
        }),
    },
    getById: {
      useQuery: (input?: { id: number }, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["vehicles", input?.id],
          queryFn: () => vehicleApi.getById(input!.id),
          enabled: input?.id != null,
          ...opts,
        }),
    },
    create: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            vehicleApi.create(data),
          ...opts,
        }),
    },
    update: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id, ...data }: { id: number; [k: string]: unknown }) =>
            vehicleApi.update(id, data),
          ...opts,
        }),
    },
    delete: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) => vehicleApi.delete(id),
          ...opts,
        }),
    },
    search: {
      useQuery: (input?: { query: string }, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["vehicles", "search", input?.query],
          queryFn: () => vehicleApi.search(input?.query ?? ""),
          ...opts,
        }),
    },
    adminCreate: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            vehicleApi.adminCreate(data),
          ...opts,
        }),
    },
    bulkImport: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (formData: FormData) =>
            vehicleApi.adminBulkImport(formData),
          ...opts,
        }),
    },
  },

  // ── adminVehicles ─────────────────────────────────────────────────────────
  adminVehicles: {
    listAll: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["admin", "vehicles"],
          queryFn: () => vehicleApi.adminListAll(),
          ...opts,
        }),
    },
  },

  // ── registrations ─────────────────────────────────────────────────────────
  registrations: {
    getByVehicleId: {
      useQuery: (input?: { vehicleId: number }, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["registrations", input?.vehicleId],
          queryFn: () => registrationApi.getByVehicleId(input!.vehicleId),
          enabled: input?.vehicleId != null,
          ...opts,
        }),
    },
    create: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            registrationApi.create(data),
          ...opts,
        }),
    },
    update: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id, ...data }: { id: number; [k: string]: unknown }) =>
            registrationApi.update(id, data),
          ...opts,
        }),
    },
    delete: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) => registrationApi.delete(id),
          ...opts,
        }),
    },
  },

  // ── insurancePolicies ─────────────────────────────────────────────────────
  insurancePolicies: {
    getByVehicleId: {
      useQuery: (input?: { vehicleId: number }, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["insurance", input?.vehicleId],
          queryFn: () => insuranceApi.getByVehicleId(input!.vehicleId),
          enabled: input?.vehicleId != null,
          ...opts,
        }),
    },
    create: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            insuranceApi.create(data),
          ...opts,
        }),
    },
    update: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id, ...data }: { id: number; [k: string]: unknown }) =>
            insuranceApi.update(id, data),
          ...opts,
        }),
    },
    delete: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) => insuranceApi.delete(id),
          ...opts,
        }),
    },
  },

  // ── inspections ───────────────────────────────────────────────────────────
  inspections: {
    create: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            inspectionApi.create(data),
          ...opts,
        }),
    },
    update: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id, ...data }: { id: number; [k: string]: unknown }) =>
            inspectionApi.update(id, data),
          ...opts,
        }),
    },
    delete: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) => inspectionApi.delete(id),
          ...opts,
        }),
    },
  },

  // ── documents ─────────────────────────────────────────────────────────────
  documents: {
    getByVehicleId: {
      useQuery: (input?: { vehicleId: number }, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["documents", input?.vehicleId],
          queryFn: () => documentApi.getByVehicleId(input!.vehicleId),
          enabled: input?.vehicleId != null,
          ...opts,
        }),
    },
    create: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            documentApi.create(data),
          ...opts,
        }),
    },
    delete: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) => documentApi.delete(id),
          ...opts,
        }),
    },
  },

  // ── dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    getSummary: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["dashboard", "summary"],
          queryFn: () => dashboardApi.getSummary(),
          ...opts,
        }),
    },
    getExpiryAlerts: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["dashboard", "alerts"],
          queryFn: () => dashboardApi.getExpiryAlerts(),
          ...opts,
        }),
    },
    getCalendarEvents: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["dashboard", "calendar"],
          queryFn: () => dashboardApi.getCalendarEvents(),
          ...opts,
        }),
    },
  },

  // ── serviceRequests ───────────────────────────────────────────────────────
  serviceRequests: {
    create: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            serviceRequestApi.create(data),
          ...opts,
        }),
    },
    listMine: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["serviceRequests", "mine"],
          queryFn: () => serviceRequestApi.listMine(),
          ...opts,
        }),
    },
    listAll: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["serviceRequests", "all"],
          queryFn: () => serviceRequestApi.listAll(),
          ...opts,
        }),
    },
    updateStatus: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({
            id,
            status,
            adminNotes,
          }: {
            id: number;
            status: string;
            adminNotes?: string;
          }) => serviceRequestApi.updateStatus(id, status, adminNotes),
          ...opts,
        }),
    },
    update: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id, ...data }: { id: number; [k: string]: unknown }) =>
            serviceRequestApi.update(id, data),
          ...opts,
        }),
    },
    cancel: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) => serviceRequestApi.cancel(id),
          ...opts,
        }),
    },
  },

  // ── payments ──────────────────────────────────────────────────────────────
  payments: {
    create: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            paymentApi.create(data),
          ...opts,
        }),
    },
    listMine: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["payments", "mine"],
          queryFn: () => paymentApi.listMine(),
          ...opts,
        }),
    },
    listAll: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["payments", "all"],
          queryFn: () => paymentApi.listAll(),
          ...opts,
        }),
    },
  },

  // ── subscriptions ─────────────────────────────────────────────────────────
  subscriptions: {
    getMine: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["subscriptions", "mine"],
          queryFn: () => subscriptionApi.getMine(),
          ...opts,
        }),
    },
    getActive: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["subscriptions", "active"],
          queryFn: () => subscriptionApi.getActive().catch(() => null),
          ...opts,
        }),
    },
    create: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            subscriptionApi.create(data),
          ...opts,
        }),
    },
    listAll: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["subscriptions", "all"],
          queryFn: () => subscriptionApi.listAll(),
          ...opts,
        }),
    },
  },

  // ── bankTransfers ─────────────────────────────────────────────────────────
  bankTransfers: {
    create: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: (data: Record<string, unknown>) =>
            bankTransferApi.create(data),
          ...opts,
        }),
    },
    confirmByUser: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id, referenceNumber }: { id: number; referenceNumber?: string }) =>
            bankTransferApi.confirm(id),
          ...opts,
        }),
    },
    approveByAdmin: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({
            id,
            adminNotes,
          }: {
            id: number;
            adminNotes?: string;
          }) => bankTransferApi.approve(id, adminNotes),
          ...opts,
        }),
    },
    rejectByAdmin: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({
            id,
            reason,
          }: {
            id: number;
            reason: string;
          }) => bankTransferApi.reject(id, reason),
          ...opts,
        }),
    },
    getAllPending: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["bankTransfers", "pending"],
          queryFn: () => bankTransferApi.getPending(),
          ...opts,
        }),
    },
    getAll: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["bankTransfers", "all"],
          queryFn: () => bankTransferApi.getAll(),
          ...opts,
        }),
    },
    getMine: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["bankTransfers", "mine"],
          queryFn: () => bankTransferApi.getMine(),
          ...opts,
        }),
    },
    archive: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) => bankTransferApi.archive(id),
          ...opts,
        }),
    },
    unarchive: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) =>
            bankTransferApi.unarchive(id),
          ...opts,
        }),
    },
  },

  // ── notifications ─────────────────────────────────────────────────────────
  notifications: {
    list: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["notifications"],
          queryFn: () => notificationApi.list(),
          ...opts,
        }),
    },
    unreadCount: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["notifications", "unread"],
          queryFn: async () => {
            const res = await notificationApi.getUnreadCount();
            return typeof res === "number" ? res : (res as { count: number }).count ?? 0;
          },
          ...opts,
        }),
    },
    markAsRead: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) =>
            notificationApi.markAsRead(id),
          ...opts,
        }),
    },
    markAllAsRead: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: () => notificationApi.markAllAsRead(),
          ...opts,
        }),
    },
  },

  // ── admin ─────────────────────────────────────────────────────────────────
  admin: {
    getAnalytics: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["admin", "analytics"],
          queryFn: () => adminApi.getAnalytics(),
          ...opts,
        }),
    },
    listUsers: {
      useQuery: (input?: undefined, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["admin", "users"],
          queryFn: () => adminUserApi.listAll(),
          ...opts,
        }),
    },
    updateUser: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id, ...data }: { id: number; [k: string]: unknown }) =>
            adminUserApi.update(id, data),
          ...opts,
        }),
    },
    archiveUser: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) => adminUserApi.archive(id),
          ...opts,
        }),
    },
    unarchiveUser: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: ({ id }: { id: number }) => adminUserApi.unarchive(id),
          ...opts,
        }),
    },
  },

  // ── vehicleHistory ────────────────────────────────────────────────────────
  vehicleHistory: {
    list: {
      useQuery: (input?: { vehicleId: number }, opts?: QueryOpts) =>
        useQuery({
          queryKey: ["vehicleHistory", input?.vehicleId],
          queryFn: () => vehicleHistoryApi.list(input!.vehicleId),
          enabled: input?.vehicleId != null,
          ...opts,
        }),
    },
  },

  // ── ai (stub — not implemented in Python backend) ─────────────────────────
  ai: {
    chat: {
      useMutation: (opts?: MutationOpts) =>
        useMutation({
          mutationFn: async (data: { message: string }) => ({
            reply: "AI chat is not available in this version.",
          }),
          ...opts,
        }),
    },
  },

  // ── useUtils (cache invalidation) ─────────────────────────────────────────
  useUtils: () => {
    const queryClient = useQueryClient();
    return {
      auth: {
        me: {
          setData: (_: undefined, data: unknown) =>
            queryClient.setQueryData(["auth", "me"], data),
          invalidate: () =>
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
        },
      },
      vehicles: {
        list: { invalidate: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }) },
      },
      owners: {
        list: { invalidate: () => queryClient.invalidateQueries({ queryKey: ["owners"] }) },
      },
    };
  },
};
