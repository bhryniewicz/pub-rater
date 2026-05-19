"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { LuShield } from "react-icons/lu";
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

export default function AdminLoginPage() {
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
      form.setError("root", { message: "Sign-in failed. Try again." });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      form.setError("root", { message: "Not an admin account." });
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
            <LuShield size={24} className="text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">Admin login</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Only admin accounts can access the dashboard.
        </p>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
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
                        placeholder="admin@example.com"
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
                {form.formState.isSubmitting ? "Logging in…" : "Log in as admin"}
              </button>
            </form>
          </Form>

          <p className="text-center text-sm font-semibold text-muted-foreground">
            <Link href="/login" className="text-foreground hover:underline">
              ← Back to user login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
