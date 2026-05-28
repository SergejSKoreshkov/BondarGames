"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

// `liquid-glass-react` reaches for `document` on mount, so it must be loaded
// after hydration. While the chunk is in flight we show an identical-looking
// CSS frosted card — no flash, no layout shift.

type Mode = "standard" | "polar" | "prominent" | "shader";

export type GlassProps = {
  children: ReactNode;
  cornerRadius?: number;
  displacementScale?: number;
  blurAmount?: number;
  saturation?: number;
  aberrationIntensity?: number;
  elasticity?: number;
  padding?: string;
  overLight?: boolean;
  mode?: Mode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
};

type LGComponent = React.ComponentType<GlassProps & { children: ReactNode }>;

let cachedLG: LGComponent | null = null;
let pendingLG: Promise<LGComponent> | null = null;

function loadLiquidGlass(): Promise<LGComponent> {
  if (cachedLG) return Promise.resolve(cachedLG);
  if (pendingLG) return pendingLG;
  pendingLG = import("liquid-glass-react").then((mod) => {
    cachedLG = mod.default as LGComponent;
    return cachedLG;
  });
  return pendingLG;
}

export function Glass({
  children,
  className,
  style,
  padding,
  cornerRadius = 24,
  displacementScale = 70,
  blurAmount = 0.06,
  saturation = 170,
  aberrationIntensity = 2,
  elasticity = 0.15,
  overLight = true,
  mode = "standard",
  onClick,
}: GlassProps) {
  const [LG, setLG] = useState<LGComponent | null>(cachedLG);

  useEffect(() => {
    if (cachedLG) return;
    let cancelled = false;
    loadLiquidGlass().then((c) => {
      if (!cancelled) setLG(() => c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!LG) {
    // SSR / pre-hydration fallback — CSS frosted card.
    return (
      <div
        className={`glass-strong ${className ?? ""}`}
        style={{
          borderRadius: cornerRadius,
          padding,
          ...style,
        }}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <LG
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
    </LG>
  );
}
