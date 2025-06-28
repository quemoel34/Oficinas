"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  // To prevent hydration errors, we start with a static value (0) and
  // update to the dynamic value on the client after mounting.
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    // A small timeout to ensure the transition is visible
    const timer = setTimeout(() => setProgress(value || 0), 10);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 bg-primary transition-transform duration-500 ease-in-out")}
        style={{ transform: `translateX(-${100 - (progress || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
