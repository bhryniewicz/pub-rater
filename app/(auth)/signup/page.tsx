"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, X, Check } from "lucide-react";
import {
  FaLinkedin,
  FaGoogle,
  FaFacebook,
  FaGithub,
  FaApple,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { SignupSchema, SignupValues } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const PROVIDERS = [
  { id: "linkedin", icon: FaLinkedin },
  { id: "google", icon: FaGoogle },
  { id: "facebook", icon: FaFacebook },
  { id: "github", icon: FaGithub },
  { id: "apple", icon: FaApple },
] as const;

const PASSWORD_RULES = [
  { label: "Minimum 8 characters", test: (p: string) => p.length >= 8 },
  { label: "At least one digit (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "At least one uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "At least one lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "At least one special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      email: "",
      password: "",
      display_name: "",
      birth_date: "",
      pub_preference: false,
      bar_preference: false,
    },
  });

  const password = form.watch("password");

  async function onSubmit(values: SignupValues) {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { display_name: values.display_name, birth_date: values.birth_date },
      },
    });

    if (error) {
      form.setError("root", { message: error.message });
      return;
    }

    let userId = data.session?.user.id;

    if (!userId) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        form.setError("root", {
          message: "Check your email to confirm your account, then log in.",
        });
        return;
      }

      userId = signInData.session?.user.id;
    }

    if (userId) {
      await supabase
        .from("profiles")
        .update({
          is_onboarded: true,
          preferences: {
            pub_preference: values.pub_preference,
            bar_preference: values.bar_preference,
          },
        })
        .eq("id", userId);
    }

    router.push("/");
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Create account</h1>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          {/* Social provider icons */}
          <div className="flex justify-center gap-3">
            {PROVIDERS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                disabled
                aria-label={`Sign up with ${id}`}
                className="w-12 h-12 rounded-full border border-border bg-secondary/40 flex items-center justify-center cursor-not-allowed opacity-60"
              >
                <Icon size={22} />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email address <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jan.kowalski@gmail.com"
                        className="h-11 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Password <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          className="h-11 rounded-xl pr-11"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password requirements */}
              <ul className="flex flex-col gap-1.5">
                {PASSWORD_RULES.map(({ label, test }) => {
                  const passed = password ? test(password) : false;
                  return (
                    <li key={label} className="flex items-center gap-2 text-sm">
                      {passed ? (
                        <Check size={14} className="text-green-500 shrink-0" />
                      ) : (
                        <X size={14} className="text-muted-foreground shrink-0" />
                      )}
                      <span className={passed ? "text-foreground" : "text-muted-foreground"}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Display name */}
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Display name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="How you'll appear to others"
                        className="h-11 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date of birth */}
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Date of birth <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-11 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preferences */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium leading-none">
                  What are you into?
                </span>
                <div className="flex flex-col gap-2 pt-1">
                  <Controller
                    control={form.control}
                    name="pub_preference"
                    render={({ field }) => (
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          🍺 Pubs
                        </span>
                      </label>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="bar_preference"
                    render={({ field }) => (
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          🥂 Bars
                        </span>
                      </label>
                    )}
                  />
                </div>
              </div>

              {form.formState.errors.root && (
                <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {form.formState.errors.root.message}
                </p>
              )}

              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {form.formState.isSubmitting ? "Creating…" : "Create account"}
              </button>
            </form>
          </Form>

          <p className="text-center text-sm font-semibold text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
