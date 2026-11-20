import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArgonState } from './argon.types';
import { ArgonAvatar } from './ArgonAvatar';

export interface ConCode3DAvatarProps {
  emotion?: ArgonState | 'decided' | 'confused';
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  enablePointerTracking?: boolean;
}

const SIZE_PX: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 48,
  md: 64,
  lg: 96,
  xl: 120,
};

export const ConCode3DAvatar: React.FC<ConCode3DAvatarProps> = ({
  emotion = 'idle',
  isSpeaking = false,
  size = 'md',
  className = '',
  onClick,
  enablePointerTracking = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ emotion, isSpeaking });
  const mouseRef = useRef({ x: 0, y: 0 });
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  // Keep latest props accessible inside the 60fps animation loop without re-triggering scene creation
  useEffect(() => {
    stateRef.current = { emotion, isSpeaking };
  }, [emotion, isSpeaking]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || SIZE_PX[size];
    const height = container.clientHeight || SIZE_PX[size];

    // 1. SCENE, CAMERA & RENDERER
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 4.4);

    let renderer: THREE.WebGLRenderer;
    try {
      const isCoarsePointer = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
      renderer = new THREE.WebGLRenderer({ antialias: !isCoarsePointer, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.5 : 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);
    } catch {
      setWebglSupported(false);
      return;
    }

    // 2. STUDIO LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7eb, 1.4);
    keyLight.position.set(2.5, 4, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd8e8dc, 0.9);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    // 3. MATERIALS (Sage Green + Ceramic White + Warm Screen palette)
    const whiteShellMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4f3ef,
      roughness: 0.22,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
    });

    const sageGreenMat = new THREE.MeshStandardMaterial({
      color: 0x7d9b76,
      roughness: 0.45,
      metalness: 0.1,
    });

    const screenFaceMat = new THREE.MeshStandardMaterial({
      color: 0xfff1d6,
      emissive: 0xffdf9e,
      emissiveIntensity: 0.35,
      roughness: 0.2,
    });

    const darkFeatureMat = new THREE.MeshBasicMaterial({ color: 0x3b2820 });
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const blushMat = new THREE.MeshBasicMaterial({
      color: 0xff9a8b,
      transparent: true,
      opacity: 0.45,
    });
    const ledGlowMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });

    // 4. BUILD THE ROBOT MASCOT RIG
    const robotRoot = new THREE.Group();
    scene.add(robotRoot);

    // --- Torso & Neck ---
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = -0.85;
    robotRoot.add(torsoGroup);

    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.56, 0.85, 32),
      whiteShellMat
    );
    torsoGroup.add(torso);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.08, 16, 32),
      sageGreenMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.4;
    torsoGroup.add(collar);

    // Shoulders & Arms
    [-0.58, 0.58].forEach((xPos) => {
      const shoulder = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 24, 24),
        sageGreenMat
      );
      shoulder.position.set(xPos, 0.24, 0);
      torsoGroup.add(shoulder);

      const arm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.12, 0.4, 12, 24),
        whiteShellMat
      );
      arm.position.set(xPos * 1.12, -0.05, 0.05);
      arm.rotation.z = xPos > 0 ? -0.18 : 0.18;
      torsoGroup.add(arm);
    });

    // --- Head Assembly ---
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.22;
    robotRoot.add(headGroup);

    // Main Helmet
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.76, 40, 40),
      whiteShellMat
    );
    helmet.scale.set(1.06, 0.98, 0.96);
    headGroup.add(helmet);

    // Top Sage Crest & Glowing Sensor Nodes
    const topCrest = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 24, 24),
      sageGreenMat
    );
    topCrest.position.set(0, 0.54, 0.1);
    topCrest.scale.set(1.1, 0.5, 1.1);
    headGroup.add(topCrest);

    const centerLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 16),
      ledGlowMat
    );
    centerLed.position.set(0, 0.67, 0.34);
    headGroup.add(centerLed);

    // Ear Pods
    [-0.78, 0.78].forEach((xPos) => {
      const earPod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.14, 24),
        sageGreenMat
      );
      earPod.rotation.z = Math.PI / 2;
      earPod.position.set(xPos, 0.02, 0);
      headGroup.add(earPod);

      const earGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.16, 24),
        screenFaceMat
      );
      earGlow.rotation.z = Math.PI / 2;
      earGlow.position.set(xPos * 1.02, 0.02, 0);
      headGroup.add(earGlow);
    });

    // Glowing Visor Screen
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.64, 36, 36),
      screenFaceMat
    );
    visor.position.set(0, -0.02, 0.22);
    visor.scale.set(1.02, 0.84, 0.78);
    headGroup.add(visor);

    // --- Facial Features on Visor Surface ---
    const faceGroup = new THREE.Group();
    faceGroup.position.set(0, -0.02, 0.71);
    headGroup.add(faceGroup);

    // Eyes
    const createEye = (x: number) => {
      const eyeWrap = new THREE.Group();
      eyeWrap.position.set(x, 0.06, 0);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 20, 20),
        darkFeatureMat
      );
      pupil.scale.set(1, 1.1, 0.4);
      eyeWrap.add(pupil);

      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 12, 12),
        eyeHighlightMat
      );
      glint.position.set(-0.02, 0.025, 0.025);
      eyeWrap.add(glint);

      return eyeWrap;
    };

    const leftEye = createEye(-0.21);
    const rightEye = createEye(0.21);
    faceGroup.add(leftEye, rightEye);

    // Eyebrows
    const browGeo = new THREE.CapsuleGeometry(0.014, 0.09, 8, 16);
    const leftBrow = new THREE.Mesh(browGeo, darkFeatureMat);
    leftBrow.position.set(-0.21, 0.21, 0.01);
    leftBrow.rotation.z = Math.PI / 2 - 0.15;

    const rightBrow = new THREE.Mesh(browGeo, darkFeatureMat);
    rightBrow.position.set(0.21, 0.21, 0.01);
    rightBrow.rotation.z = Math.PI / 2 + 0.15;
    faceGroup.add(leftBrow, rightBrow);

    // Rosy Cheeks
    const cheekGeo = new THREE.CircleGeometry(0.075, 20);
    const leftCheek = new THREE.Mesh(cheekGeo, blushMat);
    leftCheek.position.set(-0.29, -0.06, 0.005);

    const rightCheek = new THREE.Mesh(cheekGeo, blushMat);
    rightCheek.position.set(0.29, -0.06, 0.005);
    faceGroup.add(leftCheek, rightCheek);

    // Expressive Mouth (Torus arc)
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.016, 12, 24, Math.PI),
      darkFeatureMat
    );
    mouth.position.set(0, -0.09, 0.01);
    mouth.rotation.z = Math.PI; // Gentle smile curve
    faceGroup.add(mouth);

    // 5. ANIMATION & EMOTION STATE ENGINE
    const clock = new THREE.Clock();
    let blinkTimer = 0;
    let nextBlink = 2.5;
    let animationFrameId: number | null = null;
    let isPageVisible = typeof document === 'undefined' ? true : !document.hidden;
    let isInViewport = true;
    let cachedRect: DOMRect | null = null;

    const target = {
      headRotX: 0,
      headRotY: 0,
      headRotZ: 0,
      headPosY: 0.22,
      eyeScaleY: 1,
      leftBrowZ: Math.PI / 2 - 0.15,
      rightBrowZ: Math.PI / 2 + 0.15,
      browY: 0.21,
      mouthScaleX: 1,
      mouthScaleY: 1,
      blushOpacity: 0.4,
      ledScale: 1,
    };

    // Pointer tracking listener (desktop fine-pointer only, cached rect to avoid layout thrashing)
    const hasFinePointer = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const invalidateRect = () => { cachedRect = null; };
    const handlePointerMove = (e: MouseEvent) => {
      if (!enablePointerTracking || !hasFinePointer || !isInViewport || !isPageVisible) return;
      if (!cachedRect) cachedRect = container.getBoundingClientRect();
      const centerX = cachedRect.left + cachedRect.width / 2;
      const centerY = cachedRect.top + cachedRect.height / 2;
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      mouseRef.current = {
        x: Math.max(-0.35, Math.min(0.35, dx * 0.35)),
        y: Math.max(-0.25, Math.min(0.25, -dy * 0.25)),
      };
    };

    if (enablePointerTracking && hasFinePointer) {
      window.addEventListener('mousemove', handlePointerMove, { passive: true });
      window.addEventListener('scroll', invalidateRect, { passive: true });
    }

    const animate = () => {
      if (!isPageVisible || !isInViewport) {
        animationFrameId = null;
        return;
      }
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const { emotion: currentEmotion, isSpeaking: speaking } = stateRef.current;

      // Natural Hovering Motion
      robotRoot.position.y = Math.sin(elapsed * 2.2) * 0.04;

      // Natural Randomized Blinking Engine
      blinkTimer += dt;
      let isBlinking = false;
      if (blinkTimer > nextBlink) {
        isBlinking = true;
        if (blinkTimer > nextBlink + 0.14) {
          blinkTimer = 0;
          nextBlink = 2.2 + Math.random() * 3.2;
        }
      }

      // Configure targets according to emotion / decision state
      switch (currentEmotion) {
        case 'listening':
          target.headRotX = 0.08;
          target.headRotY = -0.12;
          target.headRotZ = 0.08;
          target.headPosY = 0.24;
          target.eyeScaleY = 1.12;
          target.browY = 0.24;
          target.leftBrowZ = Math.PI / 2 - 0.05;
          target.rightBrowZ = Math.PI / 2 + 0.05;
          target.mouthScaleX = 0.85;
          target.mouthScaleY = 0.85;
          target.blushOpacity = 0.45;
          break;

        case 'thinking':
          target.headRotX = -0.16;
          target.headRotY = Math.sin(elapsed * 1.8) * 0.25;
          target.headRotZ = -0.1;
          target.headPosY = 0.25;
          target.eyeScaleY = 0.95;
          target.browY = 0.23;
          target.leftBrowZ = Math.PI / 2 + 0.15;
          target.rightBrowZ = Math.PI / 2 + 0.25;
          target.mouthScaleX = 0.55;
          target.mouthScaleY = 0.5;
          target.blushOpacity = 0.25;
          target.ledScale = 1 + Math.sin(elapsed * 10) * 0.35;
          break;

        case 'excited':
          target.headRotX = -0.05;
          target.headRotY = Math.sin(elapsed * 5) * 0.08;
          target.headRotZ = Math.sin(elapsed * 6) * 0.06;
          target.headPosY = 0.26 + Math.abs(Math.sin(elapsed * 6)) * 0.06;
          target.eyeScaleY = 1.2;
          target.browY = 0.25;
          target.leftBrowZ = Math.PI / 2 - 0.25;
          target.rightBrowZ = Math.PI / 2 + 0.25;
          target.mouthScaleX = 1.3;
          target.mouthScaleY = 1.4;
          target.blushOpacity = 0.8;
          break;

        case 'decided':
          target.headRotX = Math.sin(elapsed * 7) * 0.14;
          target.headRotY = 0;
          target.headRotZ = 0.04;
          target.headPosY = 0.22;
          target.eyeScaleY = 0.45; // Happy squint arc
          target.browY = 0.22;
          target.leftBrowZ = Math.PI / 2 - 0.2;
          target.rightBrowZ = Math.PI / 2 + 0.2;
          target.mouthScaleX = 1.25;
          target.mouthScaleY = 1.2;
          target.blushOpacity = 0.7;
          break;

        case 'confused':
        case 'warning':
          target.headRotX = 0.05;
          target.headRotY = 0.12;
          target.headRotZ = -0.18;
          target.headPosY = 0.21;
          target.eyeScaleY = 1.05;
          target.browY = 0.21;
          target.leftBrowZ = Math.PI / 2 + 0.28;
          target.rightBrowZ = Math.PI / 2 - 0.05;
          target.mouthScaleX = 0.6;
          target.mouthScaleY = -0.5; // Slight questioning curve
          target.blushOpacity = 0.3;
          break;

        case 'speaking':
          target.headRotX = Math.sin(elapsed * 3) * 0.06;
          target.headRotY = Math.sin(elapsed * 2) * 0.08;
          target.headRotZ = Math.cos(elapsed * 2) * 0.03;
          target.headPosY = 0.23;
          target.eyeScaleY = 1.08;
          target.browY = 0.22;
          target.leftBrowZ = Math.PI / 2 - 0.12;
          target.rightBrowZ = Math.PI / 2 + 0.12;
          target.mouthScaleX = 1.1;
          target.blushOpacity = 0.55;
          break;

        case 'idle':
        default:
          target.headRotX = Math.sin(elapsed * 1.1) * 0.04;
          target.headRotY = Math.cos(elapsed * 0.8) * 0.08;
          target.headRotZ = Math.sin(elapsed * 0.9) * 0.03;
          target.headPosY = 0.22;
          target.eyeScaleY = 1;
          target.browY = 0.21;
          target.leftBrowZ = Math.PI / 2 - 0.15;
          target.rightBrowZ = Math.PI / 2 + 0.15;
          target.mouthScaleX = 1;
          target.mouthScaleY = 1;
          target.blushOpacity = 0.42;
          target.ledScale = 1 + Math.sin(elapsed * 2.5) * 0.1;
          break;
      }

      // Add gentle pointer tracking to head target
      const finalTargetRotX = target.headRotX + mouseRef.current.y * 0.5;
      const finalTargetRotY = target.headRotY + mouseRef.current.x * 0.7;

      // Override eye scale during blink
      const finalEyeScaleY = isBlinking ? 0.08 : target.eyeScaleY;

      // Lip-Sync Mouth Oscillation when AI is streaming text or speaking audio
      const finalMouthScaleY = speaking
        ? 0.5 + Math.abs(Math.sin(elapsed * 18)) * 1.1
        : target.mouthScaleY;

      // Smooth Lerp Transitions
      const lerpSpeed = 8 * dt;
      headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, finalTargetRotX, lerpSpeed);
      headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, finalTargetRotY, lerpSpeed);
      headGroup.rotation.z = THREE.MathUtils.lerp(headGroup.rotation.z, target.headRotZ, lerpSpeed);
      headGroup.position.y = THREE.MathUtils.lerp(headGroup.position.y, target.headPosY, lerpSpeed);

      leftEye.scale.y = THREE.MathUtils.lerp(leftEye.scale.y, finalEyeScaleY, 18 * dt);
      rightEye.scale.y = THREE.MathUtils.lerp(rightEye.scale.y, finalEyeScaleY, 18 * dt);

      leftBrow.position.y = THREE.MathUtils.lerp(leftBrow.position.y, target.browY, lerpSpeed);
      rightBrow.position.y = THREE.MathUtils.lerp(rightBrow.position.y, target.browY, lerpSpeed);
      leftBrow.rotation.z = THREE.MathUtils.lerp(leftBrow.rotation.z, target.leftBrowZ, lerpSpeed);
      rightBrow.rotation.z = THREE.MathUtils.lerp(rightBrow.rotation.z, target.rightBrowZ, lerpSpeed);

      mouth.scale.x = THREE.MathUtils.lerp(mouth.scale.x, target.mouthScaleX, lerpSpeed);
      mouth.scale.y = THREE.MathUtils.lerp(mouth.scale.y, finalMouthScaleY, 16 * dt);

      blushMat.opacity = THREE.MathUtils.lerp(blushMat.opacity, target.blushOpacity, lerpSpeed);
      centerLed.scale.setScalar(target.ledScale);

      renderer.render(scene, camera);
    };

    const startLoopIfActive = () => {
      if (isPageVisible && isInViewport && animationFrameId === null) {
        clock.getDelta(); // Reset delta after pause to prevent jump
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) {
        startLoopIfActive();
      } else if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const visibilityObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            isInViewport = entries.some((entry) => entry.isIntersecting);
            if (isInViewport) {
              startLoopIfActive();
            } else if (animationFrameId !== null) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
            }
          },
          { threshold: 0.01 }
        )
      : null;
    visibilityObserver?.observe(container);

    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      invalidateRect();
      for (const entry of entries) {
        const newW = entry.contentRect.width;
        const newH = entry.contentRect.height;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Cleanup on unmount
    return () => {
      if (enablePointerTracking && hasFinePointer) {
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('scroll', invalidateRect);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      visibilityObserver?.disconnect();
      resizeObserver.disconnect();
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      whiteShellMat.dispose();
      sageGreenMat.dispose();
      screenFaceMat.dispose();
      darkFeatureMat.dispose();
      eyeHighlightMat.dispose();
      blushMat.dispose();
      ledGlowMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size, enablePointerTracking]);

  if (!webglSupported) {
    return (
      <ArgonAvatar
        state={(emotion === 'decided' ? 'excited' : emotion === 'confused' ? 'warning' : emotion) as ArgonState}
        size={size}
        className={className}
        onClick={onClick}
      />
    );
  }

  const dimensionStyle = {
    width: `${SIZE_PX[size]}px`,
    height: `${SIZE_PX[size]}px`,
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={`ConCode AI 3D Mascot - ${emotion}`}
      style={dimensionStyle}
      className={`relative select-none inline-flex items-center justify-center ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div ref={mountRef} className="w-full h-full pointer-events-none" />
    </div>
  );
};
