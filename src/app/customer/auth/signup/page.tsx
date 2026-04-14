"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { clients } from "@/data/clients";
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
import { Separator } from "@/components/ui/separator";
import {
  getEnabledCustomerLanguageOptions,
  getCustomerLanguageLabel,
  setClientLocaleCookie,
  type AppLocale,
} from "@/lib/language-settings";
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

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

  const validatePreferredLanguageSelection = () => {
    if (!preferredLanguageEnabledByFacility) return true;

    const selectedIsValid = customerLanguageOptions.some(
      (option) => option.code === formData.preferredLanguage,
    );

    if (selectedIsValid) {
      setErrors((current) => ({
        ...current,
        preferredLanguage: "",
      }));
      return true;
    }

    setErrors((current) => ({
      ...current,
      preferredLanguage: "Please choose a preferred language",
    }));
    return false;
  };

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
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
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

    try {
      // TODO: Replace with actual API call
      // Check if customer exists with same email
      const existingCustomer = await checkExistingCustomer(formData.email);

      const redirectTo =
        fromEstimate && estimateToken
          ? `/customer/estimates/${estimateToken}`
          : "/customer/dashboard";

      if (existingCustomer) {
        await linkAccount(formData.email, formData.password);
        savePreferredLanguageForEmail(
          formData.email,
          preferredLanguageEnabledByFacility
            ? formData.preferredLanguage
            : undefined,
        );
        applyAccountLocale(
          preferredLanguageEnabledByFacility
            ? formData.preferredLanguage
            : undefined,
        );
        toast.success("Account connected successfully!");
        router.push(redirectTo);
      } else {
        await createAccount(formData);
        savePreferredLanguageForEmail(
          formData.email,
          preferredLanguageEnabledByFacility
            ? formData.preferredLanguage
            : undefined,
        );
        applyAccountLocale(
          preferredLanguageEnabledByFacility
            ? formData.preferredLanguage
            : undefined,
        );
        toast.success("Account created successfully!");
        router.push(redirectTo);
      }
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error) || "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!validatePreferredLanguageSelection()) {
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with actual Google OAuth implementation
      const googleUser = await signInWithGoogle();

      // Check if customer exists with same email
      const existingCustomer = await checkExistingCustomer(googleUser.email);

      if (existingCustomer) {
        // Link Google account to existing customer
        await linkGoogleAccount(googleUser);
        savePreferredLanguageForEmail(
          googleUser.email,
          preferredLanguageEnabledByFacility
            ? formData.preferredLanguage
            : undefined,
        );
        applyAccountLocale(
          preferredLanguageEnabledByFacility
            ? formData.preferredLanguage
            : undefined,
        );
        toast.success("Account connected successfully!");
      } else {
        // Create new account with Google
        await createAccountWithGoogle(
          googleUser,
          preferredLanguageEnabledByFacility
            ? formData.preferredLanguage
            : undefined,
        );
        savePreferredLanguageForEmail(
          googleUser.email,
          preferredLanguageEnabledByFacility
            ? formData.preferredLanguage
            : undefined,
        );
        applyAccountLocale(
          preferredLanguageEnabledByFacility
            ? formData.preferredLanguage
            : undefined,
        );
        toast.success("Account created successfully!");
      }

      router.push("/customer/dashboard");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to sign up with Google");
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder functions - replace with actual API calls
  const checkExistingCustomer = async (_email: string) => {
    // TODO: API call to check if customer exists
    await new Promise((resolve) => setTimeout(resolve, 500));
    return false; // Mock: no existing customer
  };

  const linkAccount = async (_email: string, _password: string) => {
    // TODO: API call to link account
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const createAccount = async (data: typeof formData) => {
    // TODO: API call to create account
    const existingByEmail = clients.some(
      (client) =>
        client.email.trim().toLowerCase() === data.email.trim().toLowerCase(),
    );

    if (!existingByEmail) {
      const maxId = clients.reduce(
        (max, client) => Math.max(max, client.id),
        0,
      );

      clients.push({
        id: maxId + 1,
        name: data.name.trim(),
        email: data.email.trim(),
        phone: "",
        preferredLanguage: data.preferredLanguage,
        status: "active",
        facility: targetFacilityName ?? "Example Pet Care Facility",
        address: {
          street: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        },
        emergencyContact: {
          name: "",
          relationship: "",
          phone: "",
          email: "",
        },
        pets: [],
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const signInWithGoogle = async () => {
    // TODO: Implement Google OAuth
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { email: "user@example.com", name: "User Name" };
  };

  const linkGoogleAccount = async (_googleUser: unknown) => {
    // TODO: API call to link Google account
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const createAccountWithGoogle = async (
    googleUser: { email: string; name: string },
    preferredLanguage?: string,
  ) => {
    // TODO: API call to create account with Google
    const existingByEmail = clients.some(
      (client) =>
        client.email.trim().toLowerCase() === googleUser.email.toLowerCase(),
    );

    if (!existingByEmail) {
      const maxId = clients.reduce(
        (max, client) => Math.max(max, client.id),
        0,
      );

      clients.push({
        id: maxId + 1,
        name: googleUser.name,
        email: googleUser.email,
        phone: "",
        preferredLanguage,
        status: "active",
        facility: targetFacilityName ?? "Example Pet Care Facility",
        address: {
          street: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        },
        emergencyContact: {
          name: "",
          relationship: "",
          phone: "",
          email: "",
        },
        pets: [],
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
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

              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full border-slate-300 bg-white shadow-xs hover:bg-slate-100"
                  onClick={handleGoogleSignUp}
                  disabled={isLoading}
                >
                  <svg className="mr-2 size-4" viewBox="0 0 24 24">
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

                <div className="relative py-0.5">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="text-muted-foreground bg-slate-50/80 px-2">
                      Or continue with email
                    </span>
                  </div>
                </div>
              </div>

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
