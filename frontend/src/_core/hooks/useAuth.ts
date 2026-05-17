import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { useCallback } from "react";

export function useAuth(_options?: { redirectOnUnauthenticated?: boolean }) {
  const queryClient = useQueryClient();
  const hasToken = Boolean(localStorage.getItem("auth_token"));

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    enabled: hasToken,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    authApi.logout();
    queryClient.clear();
    window.location.href = "/";
  }, [queryClient]);

  const user = hasToken ? meQuery.data ?? null : null;
  const loading = hasToken && meQuery.isLoading;
  const isAuthenticated = Boolean(user);

  return {
    user,
    loading,
    isAuthenticated,
    error: meQuery.error,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
