import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { useCallback } from "react";

export function useAuth(_options?: { redirectOnUnauthenticated?: boolean }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    authApi.logout();
    queryClient.clear();
    window.location.href = "/";
  }, [queryClient]);

  const user = meQuery.data ?? null;
  const loading = meQuery.isLoading;
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
