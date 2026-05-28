import { type CSSProperties, type ReactNode } from "react";

type Variant = "soft" | "default" | "strong";

export type GlassProps = {
  children: ReactNode;
  /** Border radius in px. 999 = pill. */
  cornerRadius?: number;
  /** CSS padding shorthand. */
  padding?: string;
  /** Visual weight. `strong` has more opacity and a stronger displacement. */
  variant?: Variant;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
};

const VARIANT_CLASS: Record<Variant, string> = {
  soft: "glass-soft",
  default: "glass",
  strong: "glass-strong",
};

export function Glass({
  children,
  className = "",
  cornerRadius = 24,
  padding,
  variant = "strong",
  style,
  onClick,
}: GlassProps) {
  return (
    <div
      className={`${VARIANT_CLASS[variant]} ${className}`.trim()}
      style={{ borderRadius: cornerRadius, padding, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
