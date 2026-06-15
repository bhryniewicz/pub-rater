"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  LoginSchema,
  type LoginValues,
  SignupStep1Schema,
  type SignupStep1Values,
  SignupStep2Schema,
  type SignupStep2Values,
} from "@/features/auth/schemas";
import {
  TicketLayout,
  TICKET,
  TICKET_LABEL,
} from "@/components/forms/_layout/ticket-layout";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "signup" | "owner-login";
};

function ticketInputClass() {
  return "font-mono bg-transparent border-0 border-b rounded-none focus-visible:ring-0 h-9 px-0 text-sm";
}

export function AuthDialog({ open, onOpenChange, initialMode = "login" }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "owner-login">(initialMode);
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

  function switchMode(newMode: "login" | "signup" | "owner-login") {
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

    if (mode === "owner-login") {
      if (profile?.role !== "owner") {
        await supabase.auth.signOut();
        loginForm.setError("root", { message: "Not an owner account." });
        return;
      }
      onOpenChange(false);
      router.push("/dashboard");
      return;
    }

    if (profile?.role === "admin" || profile?.role === "owner") {
      onOpenChange(false);
      router.push("/dashboard");
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
  const isOwnerLogin = mode === "owner-login";

  const progressBar = isSignupStep ? (
    <div className="h-1 w-full bg-muted">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: step === 1 ? "50%" : "100%" }}
      />
    </div>
  ) : undefined;

  function getTitle(): string {
    if (mode === "login") return "LOG IN";
    if (isOwnerLogin) return "OWNER LOGIN";
    if (mode === "signup" && emailSent) return "CHECK EMAIL";
    return "CREATE ACCOUNT";
  }

  return (
    <TicketLayout
      open={open}
      onOpenChange={onOpenChange}
      title={getTitle()}
      showBarcode={false}
      maxWidth="sm:max-w-sm"
      topSlot={progressBar}
    >
      <div className="px-8 pb-8 flex flex-col gap-5">
        {/* Login */}
        {mode === "login" && (
          <Form {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
              className="flex flex-col gap-4 pt-4"
            >
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>EMAIL</p>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className={ticketInputClass()}
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>PASSWORD</p>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Your password"
                        className={ticketInputClass()}
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />

              {loginForm.formState.errors.root && (
                <p
                  className="font-mono text-[9px] uppercase tracking-wider text-red-700 text-center"
                >
                  {loginForm.formState.errors.root.message}
                </p>
              )}

              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className="w-full py-3 font-mono font-black uppercase tracking-[0.25em] text-sm rounded-sm transition-opacity disabled:opacity-60 mt-1"
                style={{ backgroundColor: TICKET.ACCENT, color: TICKET.BG }}
              >
                {loginForm.formState.isSubmitting ? "LOGGING IN..." : "LOG IN"}
              </button>

              <p
                className="font-mono text-[9px] text-center uppercase tracking-wider"
                style={{ color: TICKET.MUTED }}
              >
                NO ACCOUNT?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="underline"
                  style={{ color: TICKET.TEXT }}
                >
                  SIGN UP
                </button>
              </p>

              <p
                className="font-mono text-[9px] text-center uppercase tracking-wider"
                style={{ color: TICKET.MUTED }}
              >
                <button
                  type="button"
                  onClick={() => switchMode("owner-login")}
                  style={{ color: TICKET.MUTED }}
                >
                  OWNER LOGIN &#8594;
                </button>
              </p>
            </form>
          </Form>
        )}

        {/* Signup step 1 */}
        {isSignupStep && step === 1 && (
          <Form {...step1Form}>
            <form
              onSubmit={step1Form.handleSubmit(onStep1Valid)}
              className="flex flex-col gap-4 pt-4"
            >
              <FormField
                control={step1Form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>EMAIL</p>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className={ticketInputClass()}
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />

              <FormField
                control={step1Form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>PASSWORD</p>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="8+ chars, upper, lower, number, symbol"
                        className={ticketInputClass()}
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between gap-3 pt-2">
                <span
                  className="font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: TICKET.MUTED }}
                >
                  STEP 1 OF 2
                </span>
                <button
                  type="submit"
                  className="py-2 px-5 font-mono font-black uppercase tracking-[0.2em] text-xs rounded-sm"
                  style={{ backgroundColor: TICKET.ACCENT, color: TICKET.BG }}
                >
                  CONTINUE
                </button>
              </div>

              <p
                className="font-mono text-[9px] text-center uppercase tracking-wider"
                style={{ color: TICKET.MUTED }}
              >
                HAVE AN ACCOUNT?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="underline"
                  style={{ color: TICKET.TEXT }}
                >
                  LOG IN
                </button>
              </p>
            </form>
          </Form>
        )}

        {/* Signup step 2 */}
        {isSignupStep && step === 2 && (
          <Form {...step2Form}>
            <form
              onSubmit={step2Form.handleSubmit(onStep2Submit)}
              className="flex flex-col gap-4 pt-4"
            >
              <FormField
                control={step2Form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>DISPLAY NAME</p>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="How you'll appear to others"
                        className={ticketInputClass()}
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />

              <FormField
                control={step2Form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>DATE OF BIRTH</p>
                    <FormControl>
                      <Input
                        type="date"
                        className={ticketInputClass()}
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />

              <FormField
                control={step2Form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>
                      PHONE <span style={{ opacity: 0.55 }}>(OPTIONAL)</span>
                    </p>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+44 7911 123456"
                        className={ticketInputClass()}
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />

              {step2Form.formState.errors.root && (
                <p className="font-mono text-[9px] uppercase tracking-wider text-red-700 text-center">
                  {step2Form.formState.errors.root.message}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: TICKET.MUTED }}
                >
                  &#8592; BACK
                </button>
                <button
                  type="submit"
                  disabled={step2Form.formState.isSubmitting}
                  className="py-2 px-5 font-mono font-black uppercase tracking-[0.2em] text-xs rounded-sm disabled:opacity-60"
                  style={{ backgroundColor: TICKET.ACCENT, color: TICKET.BG }}
                >
                  {step2Form.formState.isSubmitting ? "CREATING..." : "CREATE ACCOUNT"}
                </button>
              </div>
            </form>
          </Form>
        )}

        {/* Owner login */}
        {isOwnerLogin && (
          <Form {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
              className="flex flex-col gap-4 pt-4"
            >
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>EMAIL</p>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="owner@example.com"
                        className={ticketInputClass()}
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>PASSWORD</p>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Your password"
                        className={ticketInputClass()}
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />

              {loginForm.formState.errors.root && (
                <p className="font-mono text-[9px] uppercase tracking-wider text-red-700 text-center">
                  {loginForm.formState.errors.root.message}
                </p>
              )}

              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className="w-full py-3 font-mono font-black uppercase tracking-[0.25em] text-sm rounded-sm transition-opacity disabled:opacity-60 mt-1"
                style={{ backgroundColor: TICKET.ACCENT, color: TICKET.BG }}
              >
                {loginForm.formState.isSubmitting ? "LOGGING IN..." : "LOG IN AS OWNER"}
              </button>

              <p
                className="font-mono text-[9px] text-center uppercase tracking-wider"
                style={{ color: TICKET.MUTED }}
              >
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  style={{ color: TICKET.MUTED }}
                >
                  &#8592; BACK TO LOGIN
                </button>
              </p>
            </form>
          </Form>
        )}

        {/* Email confirmation */}
        {mode === "signup" && emailSent && (
          <div className="flex flex-col gap-4 pt-4">
            <p
              className="font-mono text-[10px] text-center uppercase tracking-wider leading-relaxed"
              style={{ color: TICKET.MUTED }}
            >
              WE SENT A CONFIRMATION LINK TO{" "}
              <span style={{ color: TICKET.TEXT }}>{step1Data?.email}</span>.
              CLICK IT TO ACTIVATE YOUR ACCOUNT, THEN LOG IN.
            </p>

            <button
              type="button"
              onClick={() => switchMode("login")}
              className="w-full py-3 font-mono font-black uppercase tracking-[0.25em] text-sm rounded-sm"
              style={{ backgroundColor: TICKET.ACCENT, color: TICKET.BG }}
            >
              GO TO LOG IN
            </button>
          </div>
        )}
      </div>
    </TicketLayout>
  );
}
