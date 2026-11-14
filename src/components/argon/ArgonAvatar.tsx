import React, { useEffect, useId, useState } from 'react';
import { ARGON_STATE_THEME, ArgonState } from './argon.types';

export interface ArgonAvatarProps {
  state?: ArgonState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional URL to the 3D render image to use as a hybrid base under vector overlays */
  baseImageUrl?: string;
  /** Audio/token intensity (0 to 1) when state === 'speaking' */
  speechIntensity?: number;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

export const ArgonAvatar: React.FC<ArgonAvatarProps> = ({
  state = 'idle',
  size = 'md',
  baseImageUrl,
  speechIntensity = 0.7,
  className = '',
  onClick,
}) => {
  const uid = useId().replace(/:/g, '');
  const theme = ARGON_STATE_THEME[state];

  // Natural randomized eye-blink engine
  const [isBlinking, setIsBlinking] = useState(false);
  // Mouth oscillation tick for streaming speech
  const [mouthPhase, setMouthPhase] = useState(0);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    let closeTimeout: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const nextInterval = 2400 + Math.random() * 3200;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        closeTimeout = setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, nextInterval);
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(closeTimeout);
    };
  }, []);

  useEffect(() => {
    if (state !== 'speaking') {
      setMouthPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setMouthPhase((prev) => (prev + 1) % 4);
    }, 110);
    return () => clearInterval(interval);
  }, [state]);

  // Dynamic head posture transforms per state
  const getHeadTransform = (): string => {
    switch (state) {
      case 'listening':
        return 'rotate(-5deg) translateY(-2px) scale(1.03)';
      case 'thinking':
        return 'rotate(4deg) translate(-2px, -5px)';
      case 'excited':
        return 'translateY(-4px) scale(1.05)';
      case 'warning':
        return 'rotate(-3deg) translateY(1px)';
      case 'speaking':
        return 'translateY(-2px) scale(1.02)';
      case 'idle':
      default:
        return 'rotate(0deg) translateY(0px)';
    }
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={`ConCode AI Avatar - ${state}`}
      className={`relative select-none inline-flex items-center justify-center ${SIZE_MAP[size]} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Scoped Keyframe Physics (GPU-Accelerated & Reduced-Motion Compliant) */}
      <style>{`
        @keyframes argonFloat {
          0%, 100% { transform: translate3d(0, 0px, 0) scale(1); }
          50% { transform: translate3d(0, -4px, 0) scale(1.015); }
        }
        @keyframes argonExcitedBounce {
          0%, 100% { transform: translate3d(0, 0px, 0) scale(1); }
          35% { transform: translate3d(0, -7px, 0) scale(1.05, 0.96); }
          70% { transform: translate3d(0, -2px, 0) scale(0.98, 1.03); }
        }
        @keyframes argonRadarSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes argonConfettiPop {
          0% { transform: translate3d(0, 4px, 0) scale(0); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translate3d(0, -18px, 0) scale(1.15); opacity: 0; }
        }
        .argon-anim-idle {
          animation: argonFloat 3.6s ease-in-out infinite;
          will-change: transform;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .argon-anim-excited {
          animation: argonExcitedBounce 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
          will-change: transform;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .argon-radar-halo {
          transform-origin: 100px 64px;
          animation: argonRadarSpin 3.2s linear infinite;
          will-change: transform;
        }
        .argon-confetti-1 { animation: argonConfettiPop 1.3s ease-out infinite; }
        .argon-confetti-2 { animation: argonConfettiPop 1.3s ease-out 0.35s infinite; }
        .argon-confetti-3 { animation: argonConfettiPop 1.3s ease-out 0.7s infinite; }

        @media (prefers-reduced-motion: reduce) {
          .argon-anim-idle, .argon-anim-excited, .argon-radar-halo,
          .argon-confetti-1, .argon-confetti-2, .argon-confetti-3 {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Ambient Adaptive Halo Behind Argon */}
      <div
        className="
          pointer-events-none absolute inset-1 rounded-full blur-md
          transition-all duration-500
        "
        style={{
          background: `radial-gradient(circle, ${theme.ledGlowRgba} 0%, transparent 72%)`,
          transform: state === 'excited' || state === 'thinking' ? 'scale(1.18)' : 'scale(0.95)',
        }}
      />

      {/* Sub-Pixel 3D Shaded Vector Rig (100% Unboxed Transparent Silhouette) */}
      <svg
        viewBox="0 0 200 216"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`relative z-10 h-full w-full overflow-visible ${
          state === 'excited' ? 'argon-anim-excited' : 'argon-anim-idle'
        }`}
      >
        <defs>
          {/* 3D Matte/Glossy Ivory Shell Gradient */}
          <radialGradient id={`ivoryShell-${uid}`} cx="38%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#F3F1EC" />
            <stop offset="88%" stopColor="#E2DFD7" />
            <stop offset="100%" stopColor="#D0CCC2" />
          </radialGradient>

          {/* Sage Green Body Accent Gradient */}
          <linearGradient id={`sageGreen-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9BB899" />
            <stop offset="50%" stopColor="#7E9F7D" />
            <stop offset="100%" stopColor="#5F7E5E" />
          </linearGradient>

          {/* Glowing Warm Cream Screen Visor Gradient */}
          <radialGradient id={`visorGlow-${uid}`} cx="50%" cy="48%" r="58%">
            <stop offset="0%" stopColor="#FFFDF7" />
            <stop offset="52%" stopColor={theme.visorTint} />
            <stop offset="86%" stopColor="#FFE0A3" />
            <stop offset="100%" stopColor="#F6C676" />
          </radialGradient>

          {/* Deep Espresso Eye Gradient */}
          <linearGradient id={`eyeGrad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2D1B14" />
            <stop offset="100%" stopColor="#59372B" />
          </linearGradient>

          {/* Soft Rosy Cheek Radial Blush */}
          <radialGradient id={`cheekBlush-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF8DA1" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#FF9E80" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#FF9E80" stopOpacity="0" />
          </radialGradient>

          {/* Adaptive LED Glow Filter */}
          <filter id={`ledGlow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ================= THINKING CONCODE COMPASS RADAR HALO ================= */}
        {state === 'thinking' && (
          <g className="argon-radar-halo" opacity="0.9">
            <circle
              cx="100"
              cy="64"
              r="68"
              stroke="#8B5CF6"
              strokeWidth="2"
              strokeDasharray="10 8 4 8"
            />
            <circle
              cx="100"
              cy="64"
              r="74"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeDasharray="4 14"
            />
            <circle cx="100" cy=" -4" r="4" fill="#8B5CF6" filter={`url(#ledGlow-${uid})`} />
            <circle cx="168" cy="64" r="3" fill="#38BDF8" />
          </g>
        )}

        {/* ================= WARNING / EMPATHETIC CAUTION PULSE RING ================= */}
        {state === 'warning' && (
          <g>
            <circle
              cx="100"
              cy="76"
              r="66"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              opacity="0.75"
            >
              <animate
                attributeName="r"
                values="62;70;62"
                dur="1.8s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.8;0.25;0.8"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}

        {/* Soft Anti-Gravity Hover Glow (Matches Character Energy) */}
        <ellipse
          cx="100"
          cy="204"
          rx="36"
          ry="6"
          fill={theme.ledHex}
          opacity="0.45"
          filter={`url(#ledGlow-${uid})`}
        />

        {/* ================= TORSO, NECK & AVIATION SHOULDER BADGE ================= */}
        <g id="argon-torso">
          {/* Segmented Sage Neck */}
          <rect
            x="84"
            y="124"
            width="32"
            height="20"
            rx="6"
            fill={`url(#sageGreen-${uid})`}
          />
          <line x1="86" y1="131" x2="114" y2="131" stroke="#537052" strokeWidth="1.8" />
          <line x1="86" y1="136" x2="114" y2="136" stroke="#537052" strokeWidth="1.8" />

          {/* Smooth Rounded Lower Torso Pod (100% Unboxed Character Silhouette) */}
          <path
            d="M32 184 C30 200, 56 210, 100 210 C144 210, 170 200, 168 184 C166 170, 154 146, 146 146 C132 138, 68 138, 54 146 C46 146, 34 170, 32 184 Z"
            fill={`url(#ivoryShell-${uid})`}
          />

          {/* Left & Right Sage Shoulder Joints */}
          <ellipse cx="52" cy="162" rx="18" ry="20" fill={`url(#sageGreen-${uid})`} />
          <ellipse cx="148" cy="162" rx="18" ry="20" fill={`url(#sageGreen-${uid})`} />

          {/* Glowing Right-Arm TripVerse Aviation Emblem (Matches Reference Image) */}
          <g transform="translate(41, 178)">
            <circle
              cx="0"
              cy="0"
              r="8.5"
              fill="#6E8D6D"
              stroke="#FFF3C4"
              strokeWidth="1.6"
              filter={`url(#ledGlow-${uid})`}
            />
            {/* Micro Airplane Silhouette */}
            <path
              d="M-3.5 1 L3.5 -2.5 L1.5 3.5 L0 1 L-3.5 1 Z M-1 0 L2.5 -3"
              stroke="#FFFDF5"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Sage Green Collar Yoke */}
          <path
            d="M72 141 Q100 164 128 141 L118 138 Q100 150 82 138 Z"
            fill={`url(#sageGreen-${uid})`}
          />
          {/* Center & Lower Sage Seam Lines */}
          <line x1="100" y1="152" x2="100" y2="192" stroke="#85A384" strokeWidth="2.5" />
          <path
            d="M70 196 Q100 178 130 196"
            stroke="#85A384"
            strokeWidth="2.5"
            fill="none"
          />
        </g>

        {/* ================= ANIMATED HEAD & HELMET GROUP ================= */}
        <g
          id="argon-head"
          style={{
            transform: getHeadTransform(),
            transformOrigin: '100px 84px',
            transition: 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Ear Cushions (Warm Glowing Cream Pads + Sage Mounts) */}
          <g id="argon-ears">
            {/* Left Ear */}
            <ellipse cx="35" cy="84" rx="7" ry="18" fill="#FFE2B3" />
            <path
              d="M42 64 C36 64, 35 104, 42 104 L47 100 L47 68 Z"
              fill={`url(#sageGreen-${uid})`}
            />
            {/* Right Ear */}
            <ellipse cx="165" cy="84" rx="7" ry="18" fill="#FFE2B3" />
            <path
              d="M158 64 C164 64, 165 104, 158 104 L153 100 L153 68 Z"
              fill={`url(#sageGreen-${uid})`}
            />
          </g>

          {/* Outer 3D Ivory Helmet Dome */}
          <rect
            x="42"
            y="26"
            width="116"
            height="104"
            rx="50"
            fill={`url(#ivoryShell-${uid})`}
          />

          {/* Specular Studio Highlight on Upper Left Helmet */}
          <path
            d="M56 48 C64 36, 80 32, 92 32"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Top Sage Helmet Crest */}
          <path
            d="M82 26.5 C90 25, 110 25, 118 26.5 L114 43 C108 45.5, 92 45.5, 86 43 Z"
            fill={`url(#sageGreen-${uid})`}
          />

          {/* 3 Adaptive Helmet LED Nodes (Center Crest Pill + 2 Side Oval Ports) */}
          <g filter={`url(#ledGlow-${uid})`}>
            {/* Center Crest Pill LED */}
            <rect
              x="94"
              y="33"
              width="12"
              height="5"
              rx="2.5"
              fill={theme.ledHex}
            />
            <rect x="96" y="34" width="8" height="3" rx="1.5" fill="#FFFFFF" opacity="0.7" />

            {/* Left Helmet Sensor Port */}
            <ellipse
              cx="69"
              cy="44"
              rx="6"
              ry="4"
              transform="rotate(-24 69 44)"
              fill="#6F8F6E"
            />
            <ellipse
              cx="69"
              cy="44"
              rx="3.6"
              ry="2.2"
              transform="rotate(-24 69 44)"
              fill={theme.ledHex}
            />

            {/* Right Helmet Sensor Port */}
            <ellipse
              cx="131"
              cy="44"
              rx="6"
              ry="4"
              transform="rotate(24 131 44)"
              fill="#6F8F6E"
            />
            <ellipse
              cx="131"
              cy="44"
              rx="3.6"
              ry="2.2"
              transform="rotate(24 131 44)"
              fill={theme.ledHex}
            />
          </g>

          {/* Adaptive Helmet Rim Accent Line */}
          <rect
            x="53"
            y="49"
            width="94"
            height="68"
            rx="31"
            stroke={theme.ledHex}
            strokeWidth="1.8"
            opacity="0.55"
          />

          {/* Glowing Warm Cream Visor Screen */}
          <rect
            x="55"
            y="51"
            width="90"
            height="64"
            rx="29"
            fill={`url(#visorGlow-${uid})`}
          />

          {/* ================= EXPRESSIVE FACIAL FEATURES ================= */}
          <g id="argon-face">
            {/* Rosy Blush Cheeks */}
            <ellipse
              cx="70"
              cy="94"
              rx={state === 'excited' ? 12 : 9.5}
              ry={state === 'excited' ? 7 : 5.5}
              fill={`url(#cheekBlush-${uid})`}
            />
            <ellipse
              cx="130"
              cy="94"
              rx={state === 'excited' ? 12 : 9.5}
              ry={state === 'excited' ? 7 : 5.5}
              fill={`url(#cheekBlush-${uid})`}
            />

            {/* Eyebrows */}
            {state === 'warning' ? (
              <>
                {/* Empathetic / Concerned Tilted Brows */}
                <path
                  d="M68 68 Q75 63 83 66"
                  stroke="#4A2E25"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M117 66 Q125 63 132 68"
                  stroke="#4A2E25"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </>
            ) : state === 'thinking' ? (
              <>
                {/* Inquisitive Asymmetric Brows */}
                <path
                  d="M68 63 Q76 58 83 63"
                  stroke="#4A2E25"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M117 66 Q124 63 131 66"
                  stroke="#4A2E25"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                {/* Friendly Arched Brows (Matches Reference) */}
                <path
                  d="M68 65 Q76 60 83 65"
                  stroke="#4A2E25"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M117 65 Q124 60 132 65"
                  stroke="#4A2E25"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Eyes (Blinking, Star-Eyes, or Expressive Pupils) */}
            {isBlinking ? (
              <>
                <path
                  d="M68 81 Q76 85 84 81"
                  stroke="#3E2723"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M116 81 Q124 85 132 81"
                  stroke="#3E2723"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </>
            ) : state === 'excited' ? (
              <>
                {/* Glowing Star-Struck Eyes */}
                {[76, 124].map((cx) => (
                  <g key={cx} transform={`translate(${cx}, 80)`}>
                    <ellipse cx="0" cy="0" rx="8.5" ry="9" fill={`url(#eyeGrad-${uid})`} />
                    <path
                      d="M0 -6 L1.8 -1.8 L6 0 L1.8 1.8 L0 6 L-1.8 1.8 L-6 0 L-1.8 -1.8 Z"
                      fill="#FFF8D6"
                    />
                  </g>
                ))}
              </>
            ) : (
              <>
                {/* Signature Warm Brown Rounded Eyes + Dual Catchlights */}
                {[76, 124].map((cx) => {
                  const lookOffsetX = state === 'thinking' ? 2.2 : 0;
                  const lookOffsetY = state === 'thinking' ? -2.8 : 0;
                  const radiusScale = state === 'listening' ? 1.08 : 1;

                  return (
                    <g
                      key={cx}
                      transform={`translate(${cx + lookOffsetX}, ${
                        80 + lookOffsetY
                      }) scale(${radiusScale})`}
                    >
                      <path
                        d="M-8 2 C-8 -6, -5 -9.5, 0 -9.5 C5 -9.5, 8 -6, 8 2 C8 6.5, 5 8, 0 8 C-5 8, -8 6.5, -8 2 Z"
                        fill={`url(#eyeGrad-${uid})`}
                      />
                      {/* Primary Upper-Right Catchlight */}
                      <circle cx="2.5" cy="-3.2" r="2.7" fill="#FFFFFF" />
                      {/* Secondary Lower-Left Warm Reflection */}
                      <circle cx="-2.8" cy="3.2" r="1.2" fill="#FFFFFF" opacity="0.85" />
                    </g>
                  );
                })}
              </>
            )}

            {/* Mouth & Soundwave Engine */}
            {state === 'speaking' ? (
              /* Synced Audio/Token Waveform Mouth */
              <g transform="translate(100, 97)">
                {mouthPhase % 2 === 0 ? (
                  <rect
                    x="-9"
                    y={-3 - speechIntensity * 3}
                    width="18"
                    height={6 + speechIntensity * 6}
                    rx="5"
                    fill="#4A2E25"
                  />
                ) : (
                  <g stroke="#4A2E25" strokeWidth="2.8" strokeLinecap="round">
                    <line x1="-9" y1="-2" x2="-9" y2="2" />
                    <line x1="-3" y1="-5" x2="-3" y2="5" />
                    <line x1="3" y1="-6" x2="3" y2="6" />
                    <line x1="9" y1="-2" x2="9" y2="2" />
                  </g>
                )}
              </g>
            ) : state === 'excited' ? (
              /* Cheerful Open Smile */
              <path
                d="M89 93 Q100 105 111 93 Z"
                fill="#4A2E25"
                stroke="#4A2E25"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            ) : state === 'thinking' ? (
              /* Curious "O" Mouth */
              <ellipse cx="102" cy="96" rx="4.2" ry="4.8" fill="#4A2E25" />
            ) : state === 'warning' ? (
              /* Reassuring Gentle Curve */
              <path
                d="M93 97 Q100 94 107 97"
                stroke="#4A2E25"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ) : (
              /* Signature Warm Argon Smile (Matches Reference) */
              <path
                d="M90 94 Q100 102 110 94"
                stroke="#5A3629"
                strokeWidth="3.3"
                strokeLinecap="round"
              />
            )}
          </g>
        </g>

        {/* ================= CELEBRATION CONFETTI (EXCITED STATE) ================= */}
        {state === 'excited' && (
          <g>
            <circle cx="44" cy="40" r="4" fill="#10B981" className="argon-confetti-1" />
            <rect
              x="150"
              y="34"
              width="7"
              height="7"
              rx="2"
              fill="#F59E0B"
              className="argon-confetti-2"
            />
            <circle cx="158" cy="62" r="3.5" fill="#38BDF8" className="argon-confetti-3" />
            <path
              d="M36 66 L41 61 L44 67 Z"
              fill="#8B5CF6"
              className="argon-confetti-2"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
