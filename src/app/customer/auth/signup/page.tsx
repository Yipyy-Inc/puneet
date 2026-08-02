"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { facilities } from "@/data/facilities";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getEnabledCustomerLanguageOptions,
  getCustomerLanguageLabel,
  setClientLocaleCookie,
  type AppLocale,
} from "@/lib/language-settings";
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";
import { signUp } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/form-state";

const SIGNUP_PREFERRED_LANGUAGE_STORAGE_KEY =
  "customer-signup-preferred-language-by-email";
const YIPYY_WEBSITE_URL = "https://yipyy.com";

function savePreferredLanguageForEmail(
  email: string,
  languageCode: string | undefined,
): void {
  if (typeof window === "undefined") return;
  if (!languageCode) return;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  let existing: Record<string, string> = {};

  try {
    const raw = window.localStorage.getItem(
      SIGNUP_PREFERRED_LANGUAGE_STORAGE_KEY,
    );
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        existing = parsed as Record<string, string>;
      }
    }
  } catch {
    existing = {};
  }

  existing[normalizedEmail] = languageCode;
  window.localStorage.setItem(
    SIGNUP_PREFERRED_LANGUAGE_STORAGE_KEY,
    JSON.stringify(existing),
  );
}

function applyAccountLocale(languageCode: string | undefined): void {
  if (!languageCode) return;
  if (languageCode !== "en" && languageCode !== "fr") return;

  setClientLocaleCookie(languageCode as AppLocale);
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { languageSettings } = useSettings();
  const fromEstimate = searchParams.get("from") === "estimate";
  const estimateToken = searchParams.get("token");
  const prefilledEmail = searchParams.get("email") ?? "";
  const facilityParam = searchParams.get("facility");

  const targetFacility = useMemo(() => {
    if (!facilityParam) {
      return facilities.find((facility) => facility.status === "active");
    }

    const numericId = Number(facilityParam);
    if (!Number.isNaN(numericId)) {
      return facilities.find((facility) => facility.id === numericId);
    }

    const normalizedFacility = facilityParam.trim().toLowerCase();
    return facilities.find(
      (facility) => facility.name.trim().toLowerCase() === normalizedFacility,
    );
  }, [facilityParam]);
  const targetFacilityName = targetFacility?.name;
  const facilityLogoSrc = targetFacility?.logo || "/yipyy-transparent.png";
  const facilityLogoAlt = targetFacilityName
    ? `${targetFacilityName} logo`
    : "Facility logo";

  const customerLanguageOptions = useMemo(
    () => getEnabledCustomerLanguageOptions(languageSettings),
    [languageSettings],
  );
  const preferredLanguageEnabledByFacility =
    languageSettings.customerLanguagePreferenceEnabled &&
    customerLanguageOptions.length > 0;
  const [hasHydrated, setHasHydrated] = useState(false);
  const showPreferredLanguageField =
    hasHydrated && preferredLanguageEnabledByFacility;

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: prefilledEmail,
    password: "",
    confirmPassword: "",
    preferredLanguage: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Set when the account was created but a confirmation email must be opened
  // before there is a session to redirect into.
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!preferredLanguageEnabledByFacility) return;

    const selectedIsValid = customerLanguageOptions.some(
      (option) => option.code === formData.preferredLanguage,
    );

    if (selectedIsValid || !formData.preferredLanguage) return;

    setFormData((current) => ({
      ...current,
      preferredLanguage: "",
    }));
  }, [
    customerLanguageOptions,
    formData.preferredLanguage,
    preferredLanguageEnabledByFacility,
  ]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 12) {
      // Matches the server policy in lib/auth/actions. Checking a weaker rule
      // here would just mean the server rejects what this page accepted.
      newErrors.password = "Password must be at least 12 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (preferredLanguageEnabledByFacility) {
      const selectedIsValid = customerLanguageOptions.some(
        (option) => option.code === formData.preferredLanguage,
      );

      if (!selectedIsValid) {
        newErrors.preferredLanguage = "Please choose a preferred language";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const language = preferredLanguageEnabledByFacility
      ? formData.preferredLanguage
      : undefined;

    const redirectTo =
      fromEstimate && estimateToken
        ? `/customer/estimates/${estimateToken}`
        : "/customer/dashboard";

    // Real account creation. The action owns validation, the enumeration-safe
    // messaging, and the confirmation email pointed at /auth/callback.
    const payload = new FormData();
    payload.set("fullName", formData.name);
    payload.set("email", formData.email);
    payload.set("password", formData.password);
    payload.set("redirectTo", redirectTo);

    const result = await signUp(AUTH_INITIAL_STATE, payload);

    if (result.error) {
      setIsLoading(false);
      toast.error(result.error);
      return;
    }

    // Language preference is a local display setting, not account data, so it
    // is stored regardless of whether confirmation is still pending.
    savePreferredLanguageForEmail(formData.email, language);
    applyAccountLocale(language);

    setIsLoading(false);

    if (result.success) {
      // Confirmation is on: no session yet, so there is nowhere to send them.
      setPendingConfirmation(result.success);
      return;
    }

    // Confirmation off — signUp redirected server-side and we never get here.
    toast.success("Account created successfully!");
    router.push(redirectTo);
  };

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md flex-col">
        <div className="flex flex-col items-center pt-4 pb-3 text-center sm:pt-6">
          <Image
            src={facilityLogoSrc}
            alt={facilityLogoAlt}
            width={170}
            height={60}
            className="h-14 w-auto object-contain"
          />
          {targetFacilityName && (
            <p className="text-muted-foreground mt-1.5 text-xs font-medium">
              {targetFacilityName}
            </p>
          )}
        </div>

        <div className="flex flex-1 items-center">
          <Card className="w-full">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">
                {fromEstimate ? "Complete your account" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {fromEstimate
                  ? "Set up your account to view your estimate and book your pet's stay"
                  : "Sign up to manage your pets and book services"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {showPreferredLanguageField && (
                <div className="space-y-2 rounded-lg border border-sky-100 bg-sky-50/60 p-3">
                  <Label
                    htmlFor="preferredLanguage"
                    className="block text-center"
                  >
                    Preferred Language
                  </Label>
                  <Select
                    value={formData.preferredLanguage}
                    onValueChange={(value) => {
                      setFormData({ ...formData, preferredLanguage: value });
                      if (errors.preferredLanguage) {
                        setErrors((current) => ({
                          ...current,
                          preferredLanguage: "",
                        }));
                      }
                    }}
                  >
                    <SelectTrigger
                      id="preferredLanguage"
                      className="mx-auto w-full max-w-xs [&>span]:w-full [&>span]:text-center"
                    >
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerLanguageOptions.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {getCustomerLanguageLabel(option.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-center text-xs">
                    This language will be used for account communications when
                    supported.
                  </p>
                  {errors.preferredLanguage && (
                    <p className="text-destructive text-center text-sm">
                      {errors.preferredLanguage}
                    </p>
                  )}
                </div>
              )}

              {/*
                "Continue with Google" was removed here, as on the login page.
                It called a stub returning a hardcoded user@example.com and
                created a local client record for that fake person. Turning it
                on for real means enabling Google under Authentication >
                Providers and calling signInWithOAuth against /auth/callback.
              */}

              {pendingConfirmation && (
                <p
                  role="status"
                  className="rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
                >
                  {pendingConfirmation}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="pl-9"
                      aria-invalid={errors.name ? "true" : "false"}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="pl-9"
                      aria-invalid={errors.email ? "true" : "false"}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="px-9"
                      aria-invalid={errors.password ? "true" : "false"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-destructive text-sm">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="px-9"
                      aria-invalid={errors.confirmPassword ? "true" : "false"}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-destructive text-sm">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>

              <p className="text-muted-foreground text-center text-sm">
                Already have an account?{" "}
                <Link
                  href="/customer/auth/login"
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-3 pb-2 sm:pb-4">
          <Link
            href={YIPYY_WEBSITE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs"
          >
            <span>Powered by</span>
            <Image
              src="/yipyy-transparent.png"
              alt="Yipyy"
              width={56}
              height={20}
              className="h-4 w-auto"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
