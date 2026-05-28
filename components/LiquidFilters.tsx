/**
 * Invisible SVG defs containing the displacement filters used by `.glass*`.
 * Two strengths so different surface variants can pick the right scale.
 * The animated `seed` gives each surface a slow, near-imperceptible shimmer
 * (the actual frame rate is throttled by the browser for SMIL on hidden SVG,
 * so this is cheap).
 */
export function LiquidFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter id="liquid-distort" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves="2"
            seed="5"
            result="noise"
          >
            <animate
              attributeName="seed"
              values="5;13;5"
              dur="22s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="14"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter id="liquid-distort-strong" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01 0.014"
            numOctaves="2"
            seed="9"
            result="noise"
          >
            <animate
              attributeName="seed"
              values="9;19;9"
              dur="26s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="24"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
