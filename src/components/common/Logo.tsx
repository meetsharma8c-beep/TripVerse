import React, { useId } from 'react';

export interface BrandIconMarkProps {
  className?: string;
  idPrefix?: string;
}

/**
 * Pure Vector Native SVG Brand Icon Mark
 * Renders identical sub-pixel geometric vector paths on iOS (Metal) and Android (Skia)
 * with zero rasterization degradation or bitmap scaling artifacts.
 */
export const BrandIconMark: React.FC<BrandIconMarkProps> = ({ 
  className = 'w-auto h-full', 
  idPrefix 
}) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const generatedId = useId();
  const safeId = (idPrefix || generatedId).replace(/[^a-zA-Z0-9]/g, '');

  const tvTGrad = `tvTGrad-${safeId}`;
  const tvSwoopPinGrad = `tvSwoopPinGrad-${safeId}`;
  const pTop = `pTop-${safeId}`;
  const pMid = `pMid-${safeId}`;
  const pBot = `pBot-${safeId}`;

  if (!imgFailed) {
    return (
      <img
        src="/tripverse-mark-cropped.png"
        srcSet="/tripverse-mark-cropped.png 1x, /tripverse-mark-cropped@2x.png 2x, /tripverse-mark-vibrant.png 3x"
        alt="TripVerse Logo"
        onError={() => setImgFailed(true)}
        style={{
          imageRendering: '-webkit-optimize-contrast',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
        className={`select-none pointer-events-none object-contain drop-shadow-2xs inline-block ${className}`}
        draggable={false}
        loading="eager"
        decoding="async"
      />
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="90 70 680 545"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      style={{
        imageRendering: 'crisp-edges',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
      className={`select-none pointer-events-none transform-gpu drop-shadow-2xs ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={tvTGrad} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#386B49" />
          <stop offset="35%" stopColor="#2D5A3D" />
          <stop offset="70%" stopColor="#244931" />
          <stop offset="100%" stopColor="#1E3E2B" />
        </linearGradient>

        <linearGradient id={tvSwoopPinGrad} x1="15%" y1="30%" x2="55%" y2="95%">
          <stop offset="0%" stopColor="#386B49" />
          <stop offset="25%" stopColor="#2D5A3D" />
          <stop offset="60%" stopColor="#244931" />
          <stop offset="100%" stopColor="#152A1C" />
        </linearGradient>

        <linearGradient id={pTop} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2D5A3D" />
          <stop offset="100%" stopColor="#386B49" />
        </linearGradient>
        <linearGradient id={pMid} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#244931" />
          <stop offset="100%" stopColor="#2D5A3D" />
        </linearGradient>
        <linearGradient id={pBot} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#152A1C" />
          <stop offset="100%" stopColor="#1E3E2B" />
        </linearGradient>
      </defs>

      {/* 1. Lower Pin & Swoop */}
      <path 
        d="M 627.500 278.947 C 625.850 280.014, 622.025 282.701, 619 284.917 C 611.975 290.062, 598.945 299, 598.466 299 C 598.265 299, 595.997 300.462, 593.426 302.250 C 590.856 304.038, 585.903 307.078, 582.420 309.007 C 578.936 310.935, 575.527 313.073, 574.843 313.757 C 574.159 314.441, 573.117 315, 572.527 315 C 571.937 315, 568.990 316.624, 565.977 318.608 C 562.965 320.592, 557.943 323.547, 554.817 325.174 C 551.692 326.801, 548.624 328.749, 547.998 329.502 C 547.373 330.255, 545.548 331.160, 543.942 331.513 C 542.337 331.865, 540.762 332.576, 540.443 333.092 C 540.124 333.608, 538.432 334.715, 536.682 335.551 C 532.398 337.599, 527.827 339.916, 526 340.966 C 522.890 342.753, 482.247 362.945, 476.500 365.558 C 473.200 367.058, 469.825 368.836, 469 369.508 C 468.175 370.181, 466.150 371.032, 464.500 371.400 C 461.437 372.083, 457.385 373.775, 450.802 377.121 C 448.768 378.154, 446.488 379, 445.736 379 C 444.984 379, 440.889 380.769, 436.635 382.931 C 432.381 385.094, 427.476 387.176, 425.733 387.559 C 423.991 387.941, 421.876 388.624, 421.033 389.076 C 418.217 390.585, 407.531 394.862, 405 395.493 C 402.591 396.093, 399.644 397.174, 390 400.996 C 387.525 401.977, 381.450 404.040, 376.500 405.581 C 371.550 407.122, 366.600 408.919, 365.500 409.573 C 364.400 410.228, 361.700 411.033, 359.500 411.362 C 357.300 411.690, 351.450 413.341, 346.500 415.029 C 341.550 416.717, 334.350 418.708, 330.500 419.454 C 326.650 420.199, 319.225 421.996, 314 423.447 C 308.775 424.898, 301.350 426.533, 297.500 427.080 C 293.650 427.628, 288.897 428.503, 286.938 429.026 C 284.979 429.548, 278.955 430.434, 273.551 430.995 C 268.148 431.555, 261.651 432.760, 259.113 433.672 C 255.145 435.098, 249.258 435.342, 217 435.415 C 183.867 435.490, 179.148 435.307, 176.480 433.843 C 174.819 432.932, 170.994 431.729, 167.980 431.169 C 164.966 430.609, 161.150 429.445, 159.500 428.582 C 157.850 427.719, 155.896 427.010, 155.158 427.006 C 154.419 427.003, 152.671 426.100, 151.273 425 C 149.874 423.900, 148.113 423, 147.359 423 C 146.604 423, 143.367 420.340, 140.166 417.088 C 132.954 409.763, 130.001 402.816, 129.997 393.161 C 129.994 387.069, 132.911 373.674, 135.041 370 C 135.519 369.175, 137.337 366.025, 139.081 363 C 140.825 359.975, 142.863 356.825, 143.610 356 C 144.356 355.175, 147.161 351.800, 149.842 348.500 C 156.967 339.730, 173.643 323.851, 184 315.974 C 186.475 314.092, 188.741 312.220, 189.035 311.815 C 189.329 311.409, 192.265 309.336, 195.559 307.207 C 205.874 300.539, 209 297.292, 209 293.241 C 209 288.964, 205.656 284.207, 200.819 281.602 L 197.403 279.762 192.067 282.631 C 182.551 287.747, 181.815 288.187, 179.973 289.855 C 178.973 290.760, 175.609 293.300, 172.497 295.500 C 159.161 304.927, 150.838 311.943, 140.607 322.384 C 128.849 334.382, 128.510 334.764, 124.929 340 C 123.613 341.925, 121.717 344.454, 120.717 345.619 C 116.637 350.371, 108.067 367.906, 107.334 373 C 107.057 374.925, 105.969 378.608, 104.915 381.185 C 102.156 387.936, 102.217 405.678, 105.022 411.859 C 106.110 414.257, 107.014 416.957, 107.031 417.859 C 107.091 420.988, 111.753 429.047, 117.683 436.272 C 123.475 443.329, 137.441 454, 140.884 454 C 141.686 454, 143.089 454.676, 144.002 455.502 C 145.791 457.120, 158.953 462, 161.531 462 C 162.394 462, 164.523 462.736, 166.262 463.636 C 171.211 466.195, 197.888 469.979, 211.070 469.992 L 218.640 470 222.820 474.652 C 225.119 477.210, 227 479.646, 227 480.065 C 227 480.483, 229.813 484.425, 233.250 488.825 C 236.688 493.225, 240.400 498.065, 241.500 499.582 C 244.615 503.876, 254.374 516.747, 260.660 524.851 C 263.796 528.895, 267.700 534.223, 269.335 536.692 C 270.970 539.161, 272.914 541.414, 273.654 541.698 C 274.394 541.982, 275 542.664, 275 543.214 C 275 544.345, 286.389 559.702, 288.933 562 C 289.846 562.825, 291.832 565.356, 293.345 567.623 C 296.671 572.607, 307.913 584.313, 313.705 588.823 C 318.483 592.543, 328.738 597.968, 331.027 597.987 C 331.868 597.994, 333.468 598.639, 334.583 599.421 C 338.745 602.336, 358.504 604.229, 366.605 602.489 C 369.481 601.871, 375.541 599.542, 383.823 595.871 C 388.863 593.637, 398.194 587.001, 402.509 582.582 C 404.164 580.887, 409.313 574.775, 413.951 569 C 418.589 563.225, 424.097 556.446, 426.192 553.936 C 428.286 551.425, 430 548.860, 430 548.235 C 430 547.611, 430.578 546.740, 431.283 546.300 C 431.989 545.860, 435.812 541.450, 439.778 536.500 C 443.744 531.550, 447.554 526.865, 448.245 526.089 C 448.935 525.313, 450.850 522.775, 452.500 520.450 C 454.150 518.124, 458.875 511.869, 463 506.549 C 467.125 501.229, 474.204 492.067, 478.730 486.188 C 483.257 480.310, 487.532 474.840, 488.230 474.032 C 491.421 470.345, 502 455.735, 502 455.017 C 502 454.575, 502.578 453.992, 503.285 453.721 C 503.992 453.450, 505.904 451.274, 507.535 448.886 C 509.166 446.498, 513.987 439.901, 518.250 434.226 C 522.513 428.550, 526 423.500, 526 423.003 C 526 422.506, 526.583 421.740, 527.296 421.300 C 528.493 420.560, 536.622 409.922, 545.712 397.198 C 547.795 394.282, 550.570 390.682, 551.877 389.198 C 553.185 387.714, 555.435 384.700, 556.877 382.500 C 559.884 377.915, 560.138 377.559, 563.325 373.500 C 565.428 370.820, 574.047 358.517, 578 352.551 C 583.513 344.230, 590.296 335.051, 592.817 332.500 C 595.502 329.783, 609.928 317.069, 618.916 309.500 C 620.875 307.850, 626.083 303.036, 630.489 298.803 L 638.500 291.106 638.500 285.707 C 638.500 282.600, 637.917 279.605, 637.128 278.654 C 635.293 276.444, 631.178 276.569, 627.500 278.947" 
        fill={`url(#${tvSwoopPinGrad})`} 
      />

      {/* 2. Upper T Shape */}
      <path 
        d="M 205.500 79.576 C 204.400 79.838, 201.250 80.689, 198.500 81.469 C 195.750 82.248, 191.475 83.323, 189 83.857 C 176.496 86.555, 160.361 94.697, 148.527 104.282 C 139.197 111.839, 123 130.388, 123 133.516 C 123 134.198, 122.357 135.288, 121.572 135.940 C 119.656 137.530, 115 146.537, 115 148.653 C 115 149.582, 114.386 151.053, 113.636 151.921 C 112.886 152.790, 111.251 156.425, 110.002 160 C 108.087 165.483, 107.657 169.204, 107.252 183.782 L 106.772 201.063 109.398 204.852 C 110.842 206.936, 113.481 209.734, 115.262 211.071 L 118.500 213.500 197 214 L 275.500 214.500 276.694 218 C 277.581 220.603, 277.903 244.308, 277.949 310.500 C 277.989 367.292, 278.377 400.819, 279.023 403.145 C 279.770 405.833, 280.939 407.218, 283.479 408.423 C 287.076 410.130, 289.555 409.935, 296.270 407.415 C 298.344 406.637, 301.430 406, 303.129 406 C 306.735 406, 321.290 402.578, 328.500 400.034 C 331.250 399.064, 335.750 397.821, 338.500 397.270 C 347.208 395.528, 356.431 392.808, 358.473 391.380 C 359.557 390.621, 361.357 390.007, 362.473 390.014 C 365.046 390.033, 377.254 386.363, 382.500 383.993 C 384.700 383, 389.875 380.931, 394 379.396 C 398.125 377.860, 402.388 376.018, 403.473 375.302 C 404.557 374.586, 406.255 374, 407.245 374 C 410.417 374, 423.774 367.870, 426.177 365.311 L 428.500 362.838 428.660 292.805 C 428.748 254.286, 429.104 221.261, 429.450 219.414 C 430.642 213.060, 430.985 213, 466.009 213 L 578 213.5 C 590 213.5, 598 205, 598 193 C 598 181, 597 167, 595.040 159 C 590.803 148.200, 585.675 137.636, 583.351 134.921 C 582.608 134.053, 582 132.845, 582 132.237 C 582 128.951, 559.401 104.752, 552.175 100.300 C 550.704 99.393, 547.174 97.155, 544.331 95.326 C 541.487 93.497, 538.817 92, 538.396 92 C 537.976 92, 535.802 91.143, 533.566 90.096 C 524.114 85.668, 519.765 84.090, 515.267 83.453 C 512.645 83.082, 507.800 82.114, 504.500 81.303 C 499.388 80.046, 476.971 79.775, 353 79.465 C 272.975 79.265, 206.600 79.315, 205.500 79.576 " 
        fill={`url(#${tvTGrad})`} 
      />

      {/* 3. Supersonic 3D Origami Airplane */}
      <g id={`origami-glider-${safeId}`}>
        <polygon points="658,257 647,268 675,333" fill={`url(#${pBot})`} />
        <polygon points="759,178 658,257 675,333" fill={`url(#${pMid})`} />
        <polygon points="759,178 572,235 658,257" fill={`url(#${pTop})`} />
        <line x1="658" y1="257" x2="759" y2="178" stroke="#FFFFFF" strokeWidth="1.8" opacity="0.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
};

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'adaptive';
  layout?: 'horizontal' | 'stacked' | 'adaptive';
  showTagline?: boolean;
  taglineClassName?: string;
  variant?: 'dark' | 'light';
  onClick?: () => void;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'adaptive',
  layout = 'horizontal',
  showTagline = true,
  taglineClassName,
  variant = 'dark',
  onClick,
  className = ''
}) => {
  const sizeMap = {
    adaptive: {
      imgHeight: 'h-8 max-[350px]:h-7 min-[380px]:h-8.5 sm:h-9 md:h-9.5 lg:h-10 xl:h-11',
      textMain: 'text-[17px] max-[350px]:text-[15.5px] min-[380px]:text-[18.5px] sm:text-xl md:text-[22px] xl:text-2xl',
      textSub: 'text-[9.5px] min-[400px]:text-[10.5px] xl:text-[11.5px]',
      gap: 'gap-1.5 max-[350px]:gap-1 min-[380px]:gap-2 sm:gap-2.5 xl:gap-3',
      defaultTaglineClass: 'hidden md:block'
    },
    sm: { 
      imgHeight: 'h-7 sm:h-8', 
      textMain: 'text-[16.5px] sm:text-lg', 
      textSub: 'text-[9px] sm:text-[10px]', 
      gap: 'gap-1.5 sm:gap-2',
      defaultTaglineClass: 'hidden sm:block'
    },
    md: { 
      imgHeight: 'h-8.5 sm:h-9.5 xl:h-10.5', 
      textMain: 'text-lg sm:text-xl xl:text-2xl', 
      textSub: 'text-[10px] sm:text-[10.5px] xl:text-[11.5px]', 
      gap: 'gap-2 sm:gap-2.5 xl:gap-3',
      defaultTaglineClass: 'hidden md:block'
    },
    lg: { 
      imgHeight: 'h-11 sm:h-13 md:h-14', 
      textMain: 'text-2xl sm:text-3xl', 
      textSub: 'text-xs', 
      gap: 'gap-2.5 sm:gap-3',
      defaultTaglineClass: 'block'
    },
    xl: { 
      imgHeight: 'h-14 sm:h-16 md:h-18', 
      textMain: 'text-3xl sm:text-4xl md:text-5xl', 
      textSub: 'text-xs sm:text-sm', 
      gap: 'gap-3 sm:gap-3.5',
      defaultTaglineClass: 'block'
    }
  };

  const current = sizeMap[size] || sizeMap.adaptive;
  const isStacked = layout === 'stacked';
  const effectiveTaglineClass = taglineClassName !== undefined 
    ? taglineClassName 
    : current.defaultTaglineClass;

  return (
    <div 
      onClick={onClick}
      className={`inline-flex select-none cursor-pointer group shrink-0 ${
        isStacked 
          ? 'flex-col items-center text-center' 
          : 'flex-row items-center'
      } ${current.gap} ${className}`}
      role="banner"
      aria-label="TripVerse Logo"
      style={{
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'geometricPrecision'
      }}
    >
      {/* Official Exact Brand Icon Mark - Pure Native Vector SVG Rendered in HD at all pixel densities (Retina 2x/3x, OLED, 4K) */}
      <div className="relative flex-shrink-0 transition-transform duration-300 group-hover:scale-105 flex items-center justify-center">
        <BrandIconMark className={`${current.imgHeight} w-auto`} />
      </div>

      {/* Brand Text - Fluid sub-pixel typography scaling per device screen width */}
      <div className={`flex flex-col leading-none min-w-0 ${isStacked ? 'items-center mt-1.5' : 'justify-center'}`}>
        <div className={`font-display font-black tracking-tight whitespace-nowrap ${current.textMain}`}>
          <span className={variant === 'light' ? 'text-white' : 'text-[#0B2545]'}>Trip</span>
          <span className="text-[#2D5A3D]">Verse</span>
        </div>
        {showTagline && (
          <span className={`font-semibold tracking-wide mt-0.5 truncate max-w-[190px] sm:max-w-none ${current.textSub} ${
            variant === 'light' ? 'text-slate-300' : 'text-slate-500'
          } ${effectiveTaglineClass}`}>
            Plan Smarter. Travel Further.
          </span>
        )}
      </div>
    </div>
  );
};
