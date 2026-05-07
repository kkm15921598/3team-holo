import type { ButtonHTMLAttributes, ReactNode } from "react";

type GradientButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gradient" | "black" | "muted";
  children: ReactNode;
};

export function GradientButton({
  variant = "gradient",
  className = "",
  children,
  ...rest
}: GradientButtonProps) {
  const base =
    "h-[60px] w-full rounded-holo-pill text-[16px] font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed";
  const variants = {
    gradient: "bg-holo-gradient text-white shadow-md",
    black: "bg-holo-ink text-white",
    muted: "bg-holo-ink-4 text-white",
  } as const;

  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
