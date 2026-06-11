"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const AGE_GATE_KEY = "pub-rater-age-verified";

export function AgeGate() {
  const t = useTranslations("ageGate");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem(AGE_GATE_KEY)) {
      setOpen(true);
    }
  }, []);

  function handleConfirm() {
    localStorage.setItem(AGE_GATE_KEY, "1");
    setOpen(false);
  }

  function handleDeny() {
    router.push("/underage");
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleDeny}>
            {t("deny")}
          </Button>
          <Button onClick={handleConfirm}>{t("confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
