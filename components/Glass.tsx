"use client";

import dynamic from "next/dynamic";
import { type ReactNode, type CSSProperties } from "react";

// `liquid-glass-react` uses canvas + SVG feDisplacementMap on mount, so it
// must be client-only. We render a CSS-only frosted fallback during SSR and
// while the chunk loads, then swap in the real refractive surface.
const LiquidGlass = dynamic(() => import("liquid-glass-react"), {
  ssr: false,
  loading: () => null,
});

export type GlassProps = {
  children: ReactNode;
  /** Border radius in px. 999 = pill. */
  cornerRadius?: number;
  /** Strength of refractive displacement (0–200). */
  displacementScale?: number;
  /** Backdrop blur (0–0.2 typical). */
  blurAmount?: number;
  /** Saturation multiplier of the warped backdrop. */
  saturation?: number;
  /** RGB fringe strength along edges. */
  aberrationIntensity?: number;
  /** Mouse-follow "wobble" strength (0–1). */
  elasticity?: number;
  /** CSS padding around content. */
  padding?: string;
  /** Set true if the surface sits on a light background (subtle inner edge). */
  overLight?: boolean;
  mode?: "standard" | "polar" | "prominent" | "shader";
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
};

const DEFAULTS = {
  cornerRadius: 24,
  displacementScale: 70,
  blurAmount: 0.06,
  saturation: 170,
  aberrationIntensity: 2,
  elasticity: 0.15,
  overLight: true,
  mode: "standard" as const,
};

export function Glass({
  children,
  className,
  cornerRadius = DEFAULTS.cornerRadius,
  displacementScale = DEFAULTS.displacementScale,
  blurAmount = DEFAULTS.blurAmount,
  saturation = DEFAULTS.saturation,
  aberrationIntensity = DEFAULTS.aberrationIntensity,
  elasticity = DEFAULTS.elasticity,
  overLight = DEFAULTS.overLight,
  mode = DEFAULTS.mode,
  padding,
  style,
  onClick,
}: GlassProps) {
  return (
    <LiquidGlass
      cornerRadius={cornerRadius}
      displacementScale={displacementScale}
      blurAmount={blurAmount}
      saturation={saturation}
      aberrationIntensity={aberrationIntensity}
      elasticity={elasticity}
      overLight={overLight}
      mode={mode}
      padding={padding}
      className={className}
      style={style}
      onClick={onClick}
    >
      {children}
    </LiquidGlass>
  );
}
