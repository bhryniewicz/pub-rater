"use client";

type Props = { message: string };

export function MutationErrorMessage({ message }: Props) {
  return (
    <p className="text-sm text-red-400 bg-red-950/60 border border-red-900 rounded-lg px-3 py-2">
      {message}
    </p>
  );
}
