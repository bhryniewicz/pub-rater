"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
          <DialogTitle>Age Verification</DialogTitle>
          <DialogDescription>
            This site contains alcohol-related content. You must be 18 or older
            to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleDeny}>
            No, I&apos;m under 18
          </Button>
          <Button onClick={handleConfirm}>Yes, I&apos;m 18+</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
