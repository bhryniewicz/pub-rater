"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import {
  FaLinkedin,
  FaGoogle,
  FaFacebook,
  FaGithub,
  FaApple,
} from "react-icons/fa";

import { supabase } from "@/lib/supabase";
import { LoginSchema, LoginValues } from "@/lib/schemas";
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
  { id: "linkedin", label: "Continue with LinkedIn", icon: FaLinkedin },
  { id: "google", label: "Continue with Google", icon: FaGoogle },
  { id: "facebook", label: "Continue with Facebook", icon: FaFacebook },
  { id: "github", label: "Continue with GitHub", icon: FaGithub },
  { id: "apple", label: "Continue with Apple", icon: FaApple },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    const { data, error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      form.setError("root", { message: error.message });
      return;
    }

    const userId = data.session?.user.id;
    if (!userId) {
      router.push("/");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_onboarded, role")
      .eq("id", userId)
      .single();

    if (profile?.role === "admin" || profile?.role === "owner") {
      router.push("/dashboard");
      return;
    }

    if (profile && !profile.is_onboarded) {
      router.push("/onboard");
      return;
    }

    router.push("/");
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Log in</h1>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          {/* Social providers */}
          <div className="flex flex-col gap-2">
            {PROVIDERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                disabled
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border bg-secondary/40 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-60"
              >
                <Icon size={20} />
                {label}
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
                {form.formState.isSubmitting ? "Logging in…" : "Log in"}
              </button>
            </form>
          </Form>

          <p className="text-center text-sm font-semibold text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="text-foreground hover:underline">
              Sign up
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}
