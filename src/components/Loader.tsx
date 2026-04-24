import { cn } from "@/lib/utils";

type LoaderProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullscreen?: boolean;
  className?: string;
};

/**
 * Maison Guide signature loader.
 * A slowly-rotating serif monogram inside a pulsing ink ring,
 * paired with a refined typographic caption.
 */
const sizeMap = {
  sm: { ring: "h-8 w-8", mono: "text-base", gap: "gap-2", label: "text-[10px]" },
  md: { ring: "h-14 w-14", mono: "text-xl", gap: "gap-3", label: "text-[11px]" },
  lg: { ring: "h-20 w-20", mono: "text-3xl", gap: "gap-4", label: "text-xs" },
};

const Loader = ({ label = "Composing", size = "md", fullscreen = false, className }: LoaderProps) => {
  const s = sizeMap[size];

  const inner = (
    <div className={cn("flex flex-col items-center justify-center", s.gap, className)}>
      <div className={cn("relative", s.ring)}>
        {/* Outer slow-rotating dashed ring */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-dashed border-primary/40 animate-[spin_4s_linear_infinite]"
        />
        {/* Inner pulse ring */}
        <span
          aria-hidden
          className="absolute inset-1.5 rounded-full border border-primary/20 animate-[pulse_2.4s_ease-in-out_infinite]"
        />
        {/* Center monogram */}
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "font-heading italic text-primary/90 leading-none",
              s.mono
            )}
          >
            M
          </span>
        </span>
      </div>
      <p
        className={cn(
          "label-mono uppercase tracking-[0.32em] text-muted-foreground",
          s.label
        )}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <span className="inline-flex w-3 justify-start">
            <span className="animate-[pulse_1.4s_ease-in-out_infinite]">.</span>
            <span className="animate-[pulse_1.4s_ease-in-out_0.2s_infinite]">.</span>
            <span className="animate-[pulse_1.4s_ease-in-out_0.4s_infinite]">.</span>
          </span>
        </span>
      </p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {inner}
      </div>
    );
  }

  return inner;
};

export default Loader;