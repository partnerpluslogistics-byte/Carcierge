import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Car, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement, config: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_AUTH_KEY = "carcierge_google_auth";

export default function Login() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const handleGoogleCredential = useCallback(
    async (response: { credential: string }) => {
      try {
        setIsSubmitting(true);
        const parts = response.credential.split(".");
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const gEmail: string = (payload.email as string)?.toLowerCase().trim();
        const gName: string =
          payload.name || payload.given_name || gEmail.split("@")[0];

        if (!gEmail) {
          toast.error("Could not retrieve email from Google account.");
          return;
        }

        const googleAuth: Record<string, string> = JSON.parse(
          localStorage.getItem(GOOGLE_AUTH_KEY) || "{}"
        );

        if (googleAuth[gEmail]) {
          const { user } = await authApi.login(gEmail, googleAuth[gEmail]);
          queryClient.setQueryData(["auth", "me"], user);
          navigate("/dashboard");
        } else {
          const password = `Gcl_${Math.random().toString(36).slice(2, 18)}`;
          try {
            await authApi.register(gEmail, gName, password);
            googleAuth[gEmail] = password;
            localStorage.setItem(GOOGLE_AUTH_KEY, JSON.stringify(googleAuth));
            const { user } = await authApi.login(gEmail, password);
            queryClient.setQueryData(["auth", "me"], user);
            toast.success("Welcome to Carcierge! Account created via Google.");
            navigate("/dashboard");
          } catch (regErr: any) {
            const msg =
              regErr?.response?.data?.error ||
              regErr?.response?.data?.message ||
              "";
            if (
              msg.toLowerCase().includes("exist") ||
              msg.toLowerCase().includes("email")
            ) {
              toast.error(
                "This email is already registered. Please sign in with your email and password."
              );
            } else {
              toast.error("Google sign-in failed. Please try again.");
            }
          }
        }
      } catch {
        toast.error("Google sign-in failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [queryClient, navigate]
  );

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID",
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: googleBtnRef.current.offsetWidth || 300,
        text: "continue_with",
      });
    };

    if (window.google) {
      initGoogle();
    } else {
      const existing = document.querySelector(
        'script[src*="accounts.google.com/gsi"]'
      );
      if (existing) {
        existing.addEventListener("load", initGoogle);
      }
    }
  }, [handleGoogleCredential]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setIsSubmitting(true);
    try {
      const { user } = await authApi.login(email.trim().toLowerCase(), password);
      queryClient.setQueryData(["auth", "me"], user);
      navigate("/dashboard");
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please check your credentials.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleButtonClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      toast.info("Google sign-in requires a configured Google Client ID. Please use email and password.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4 shadow-lg">
            <Car className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Carcierge</h1>
          <p className="text-sm text-muted-foreground mt-1">Vehicle & Insurance Management</p>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Sign in</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Google Sign-In — rendered by GSI if client_id is configured */}
            <div ref={googleBtnRef} className="w-full" />

            {/* Fallback Google button always shown */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 mt-2 border-border"
              onClick={handleGoogleButtonClick}
              disabled={isSubmitting}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-accent hover:underline underline-offset-4"
              >
                Register
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
