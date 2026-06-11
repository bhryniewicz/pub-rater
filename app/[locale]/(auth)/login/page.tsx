"use client";

import { useState } from "react";
import { Link } from "@/lib/navigation";
import { useRouter } from "@/lib/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
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

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const PROVIDERS = [
    { id: "linkedin", label: t("continueLinkedIn"), icon: FaLinkedin },
    { id: "google", label: t("continueGoogle"), icon: FaGoogle },
    { id: "facebook", label: t("continueFacebook"), icon: FaFacebook },
    { id: "github", label: t("continueGithub"), icon: FaGithub },
    { id: "apple", label: t("continueApple"), icon: FaApple },
  ] as const;

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
      .select("is_onboarded, role, banned")
      .eq("id", userId)
      .single();

    if (profile?.banned) {
      await supabase.auth.signOut();
      form.setError("root", {
        message:
          "Your account has been banned. You cannot access this account.",
      });
      return;
    }

    if (profile?.role === "owner") {
      await supabase.auth.signOut();
      form.setError("root", {
        message: "No user account found with these credentials.",
      });
      return;
    }

    if (profile?.role === "admin") {
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
        <h1 className="text-2xl font-bold text-center mb-6">{t("title")}</h1>

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
            <span className="text-xs text-muted-foreground">{tCommon("or")}</span>
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
                      {t("emailLabel")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("emailPlaceholder")}
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
                      {t("passwordLabel")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t("passwordPlaceholder")}
                          className="h-11 rounded-xl pr-11"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? t("hidePassword") : t("showPassword")}
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
                {form.formState.isSubmitting ? t("loggingIn") : t("loginButton")}
              </button>
            </form>
          </Form>

          <p className="text-center text-sm font-semibold text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/signup" className="text-foreground hover:underline">
              {t("signUp")}
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}
