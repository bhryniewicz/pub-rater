"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const signupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupValues) {
    const { data, error: signUpError } = await supabase.auth.signUp(values);

    if (signUpError) {
      setError("root", { message: signUpError.message });
      return;
    }

    if (data.session) {
      router.push("/onboard");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword(values);

    if (signInError) {
      setError("root", {
        message: "Account created! Check your email to confirm it, then log in.",
      });
      return;
    }

    router.push("/");
  }

  return (
    <main className="flex flex-col h-screen">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 bg-white shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🍺</span>
          <h1 className="font-semibold text-zinc-900">Pub Rater</h1>
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center bg-zinc-50">
        <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900 mb-6">
            Create account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link href="/login" className="text-zinc-900 font-medium hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
