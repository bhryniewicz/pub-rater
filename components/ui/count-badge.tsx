import * as React from "react";

import { cn } from "@/lib/utils";

function CountBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="count-badge"
      className={cn(
        "flex items-center justify-center min-w-[18px] px-1 py-0.5 rounded-md bg-gray-700 text-white text-[11px] font-semibold font-sans leading-none shadow-[0_1px_5px_rgba(0,0,0,0.3)]",
        className,
      )}
      {...props}
    />
  );
}

export { CountBadge };
