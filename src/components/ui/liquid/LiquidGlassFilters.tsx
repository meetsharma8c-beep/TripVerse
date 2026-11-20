import React from 'react';

/**
 * Global hidden SVG optical lens refraction filter definitions.
 * Referenced progressively via CSS `@supports (backdrop-filter: url(#tv-liquid-lens))`
 * so unsupported browsers cleanly fall back to the pure CSS multi-layer specular stack.
 */
export const LiquidGlassFilters: React.FC = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    style={{
      position: 'fixed',
      width: 0,
      height: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}
  >
    <defs>
      <filter
        id="tv-liquid-lens"
        x="-10%"
        y="-10%"
        width="120%"
        height="120%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012 0.018"
          numOctaves={2}
          seed={7}
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="2.5" result="softNoise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softNoise"
          scale={5}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>

      <filter
        id="tv-liquid-lens-subtle"
        x="-8%"
        y="-8%"
        width="116%"
        height="116%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.015 0.015"
          numOctaves={1}
          seed={11}
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softNoise"
          scale={2.5}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  </svg>
);
