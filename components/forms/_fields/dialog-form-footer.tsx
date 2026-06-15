"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onCancel: () => void;
  cancelLabel: string;
  submitLabel: string;
  isPending: boolean;
};

export function DialogFormFooter({ onCancel, cancelLabel, submitLabel, isPending }: Props) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button variant="outline" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button type="submit" disabled={isPending}>
        {submitLabel}
      </Button>
    </div>
  );
}
