"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  LoginSchema,
  LoginValues,
  SignupStep1Schema,
  SignupStep1Values,
  SignupStep2Schema,
  SignupStep2Values,
} from "@/lib/schemas";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "signup" | "admin-login";
};

export function AuthDialog({ open, onOpenChange, initialMode = "login" }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "admin-login">(initialMode);
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Data, setStep1Data] = useState<SignupStep1Values | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const step1Form = useForm<SignupStep1Values>({
    resolver: zodResolver(SignupStep1Schema),
    defaultValues: { email: "", password: "" },
  });

  const step2Form = useForm<SignupStep2Values>({
    resolver: zodResolver(SignupStep2Schema),
    defaultValues: { display_name: "", birth_date: "", phone: "" },
  });

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setStep(1);
      setStep1Data(null);
      setEmailSent(false);
      loginForm.reset();
      step1Form.reset();
      step2Form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMode]);

  function switchMode(newMode: "login" | "signup" | "admin-login") {
    setMode(newMode);
    setStep(1);
    setStep1Data(null);
    setEmailSent(false);
    loginForm.reset();
    step1Form.reset();
    step2Form.reset();
  }

  function onStep1Valid(values: SignupStep1Values) {
    setStep1Data(values);
    setStep(2);
  }

  async function onStep2Submit(values: SignupStep2Values) {
    if (!step1Data) return;

    const metadata: Record<string, string> = {
      display_name: values.display_name,
      birth_date: values.birth_date,
    };
    if (values.phone) metadata.phone = values.phone;

    const { data, error } = await supabase.auth.signUp({
      email: step1Data.email,
      password: step1Data.password,
      options: { data: metadata },
    });

    if (error) {
      step2Form.setError("root", { message: error.message });
      return;
    }

    if (data.session) {
      onOpenChange(false);
      router.push("/onboard");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: step1Data.email,
      password: step1Data.password,
    });

    if (signInError) {
      setEmailSent(true);
      return;
    }

    onOpenChange(false);
    router.push("/onboard");
  }

  async function onLoginSubmit(values: LoginValues) {
    const { data, error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      loginForm.setError("root", { message: error.message });
      return;
    }

    const userId = data.session?.user.id;
    if (!userId) {
      onOpenChange(false);
      router.push("/");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_onboarded, role")
      .eq("id", userId)
      .single();

    if (mode === "admin-login") {
      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        loginForm.setError("root", { message: "Not an admin account." });
        return;
      }
      onOpenChange(false);
      router.push("/dashboard");
      return;
    }

    if (profile?.role === "admin") {
      await supabase.auth.signOut();
      loginForm.setError("root", { message: "Admin accounts must sign in via the Admin zone." });
      return;
    }

    if (profile && !profile.is_onboarded) {
      onOpenChange(false);
      router.push("/onboard");
      return;
    }

    onOpenChange(false);
    router.push("/");
  }

  const isSignupStep = mode === "signup" && !emailSent;
  const isAdminLogin = mode === "admin-login";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden sm:max-w-sm">
        {isSignupStep && (
          <div className="h-1 w-full bg-zinc-800">
            <div
              className="h-full bg-yellow-400 transition-all duration-300"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
        )}

        <div className="px-8 pt-10 pb-8 flex flex-col gap-6">
          <div className="flex justify-center">
            <span className="text-5xl">🍺</span>
          </div>

          {/* ── Login ──────────────────────────────────────────── */}
          {mode === "login" && (
            <>
              <div className="flex flex-col gap-1.5 text-center">
                <DialogTitle className="text-xl font-bold text-center">
                  Log in
                </DialogTitle>
                <DialogDescription className="text-center">
                  Welcome back to Pub Rater.
                </DialogDescription>
              </div>

              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  className="flex flex-col gap-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Your password"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {loginForm.formState.errors.root && (
                    <p className="text-sm text-red-400 bg-red-950/60 border border-red-900 rounded-lg px-3 py-2">
                      {loginForm.formState.errors.root.message}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={loginForm.formState.isSubmitting}
                    className="w-full mt-1"
                  >
                    {loginForm.formState.isSubmitting ? "Logging in…" : "Log in"}
                  </Button>

                  <p className="text-center text-sm text-zinc-400">
                    No account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="text-yellow-400 font-medium hover:underline"
                    >
                      Sign up
                    </button>
                  </p>

                  <p className="text-center text-sm text-zinc-600">
                    <button
                      type="button"
                      onClick={() => switchMode("admin-login")}
                      className="hover:text-zinc-400 transition-colors"
                    >
                      Admin login →
                    </button>
                  </p>
                </form>
              </Form>
            </>
          )}

          {/* ── Signup step 1 ──────────────────────────────────── */}
          {isSignupStep && step === 1 && (
            <>
              <div className="flex flex-col gap-1.5 text-center">
                <DialogTitle className="text-xl font-bold text-center">
                  Create your account
                </DialogTitle>
                <DialogDescription className="text-center">
                  Start with your email and a strong password.
                </DialogDescription>
              </div>

              <Form {...step1Form}>
                <form
                  onSubmit={step1Form.handleSubmit(onStep1Valid)}
                  className="flex flex-col gap-4"
                >
                  <FormField
                    control={step1Form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step1Form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="8+ chars, upper, lower, number, symbol"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <span className="text-sm text-zinc-500">Step 1 of 2</span>
                    <Button type="submit" size="lg">
                      Continue
                    </Button>
                  </div>

                  <p className="text-center text-sm text-zinc-400">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-yellow-400 font-medium hover:underline"
                    >
                      Log in
                    </button>
                  </p>
                </form>
              </Form>
            </>
          )}

          {/* ── Signup step 2 ──────────────────────────────────── */}
          {isSignupStep && step === 2 && (
            <>
              <div className="flex flex-col gap-1.5 text-center">
                <DialogTitle className="text-xl font-bold text-center">
                  Your profile
                </DialogTitle>
                <DialogDescription className="text-center">
                  A few details to finish setting up your account.
                </DialogDescription>
              </div>

              <Form {...step2Form}>
                <form
                  onSubmit={step2Form.handleSubmit(onStep2Submit)}
                  className="flex flex-col gap-4"
                >
                  <FormField
                    control={step2Form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display name</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="How you'll appear to others"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step2Form.control}
                    name="birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of birth</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step2Form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Phone number{" "}
                          <span className="text-zinc-500 font-normal">
                            (optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+44 7911 123456"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {step2Form.formState.errors.root && (
                    <p className="text-sm text-red-400 bg-red-950/60 border border-red-900 rounded-lg px-3 py-2">
                      {step2Form.formState.errors.root.message}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      ← Back
                    </button>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={step2Form.formState.isSubmitting}
                    >
                      {step2Form.formState.isSubmitting
                        ? "Creating…"
                        : "Create account"}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}

          {/* ── Admin login ────────────────────────────────────── */}
          {isAdminLogin && (
            <>
              <div className="flex flex-col gap-1.5 text-center">
                <DialogTitle className="text-xl font-bold text-center">
                  Admin login
                </DialogTitle>
                <DialogDescription className="text-center">
                  Only admin accounts can access the dashboard.
                </DialogDescription>
              </div>

              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  className="flex flex-col gap-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="admin@example.com"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Your password"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {loginForm.formState.errors.root && (
                    <p className="text-sm text-red-400 bg-red-950/60 border border-red-900 rounded-lg px-3 py-2">
                      {loginForm.formState.errors.root.message}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={loginForm.formState.isSubmitting}
                    className="w-full mt-1"
                  >
                    {loginForm.formState.isSubmitting ? "Logging in…" : "Log in as admin"}
                  </Button>

                  <p className="text-center text-sm text-zinc-400">
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="hover:text-zinc-300 transition-colors"
                    >
                      ← Back to login
                    </button>
                  </p>
                </form>
              </Form>
            </>
          )}

          {/* ── Email confirmation ─────────────────────────────── */}
          {mode === "signup" && emailSent && (
            <>
              <div className="flex flex-col gap-1.5 text-center">
                <DialogTitle className="text-xl font-bold text-center">
                  Check your email
                </DialogTitle>
                <DialogDescription className="text-center">
                  We sent a confirmation link to{" "}
                  <span className="text-foreground font-medium">
                    {step1Data?.email}
                  </span>
                  . Click it to activate your account, then log in.
                </DialogDescription>
              </div>

              <Button
                size="lg"
                onClick={() => switchMode("login")}
                className="w-full"
              >
                Go to log in
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
