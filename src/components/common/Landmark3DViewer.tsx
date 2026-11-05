import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
  X, 
  Sun, 
  Moon, 
  Eye, 
  RotateCw, 
  Sparkles, 
  Compass, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Building2,
  Calendar,
  Ruler
} from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';
import { resolveLandmarkDetails, buildProceduralLandmark } from '../../services/landmark3DService';

interface Landmark3DViewerProps {
  landmarkName: string;
  destination: string;
  landmarkType?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Landmark3DViewer: React.FC<Landmark3DViewerProps> = ({
  landmarkName,
  destination,
  isOpen,
  onClose
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Resolve exact landmark architectural profile
  const landmarkDetails = useMemo(() => {
    return resolveLandmarkDetails(destination, landmarkName);
  }, [destination, landmarkName]);

  const [timeOfDay, setTimeOfDay] = useState<'day' | 'golden' | 'night'>(
    landmarkDetails.defaultTimeOfDay || 'golden'
  );
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const materialsRef = useRef<THREE.Material[]>([]);
  const groupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Setup Three.js scene
  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const width = mountRef.current.clientWidth || 400;
    const height = mountRef.current.clientHeight || 340;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      console.warn('[TripVerse] WebGL hardware acceleration unavailable on this device:', e);
      setWebglSupported(false);
      return;
    }

    setWebglSupported(true);

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(...landmarkDetails.cameraPosition);
    camera.lookAt(...landmarkDetails.cameraTarget);
    cameraRef.current = camera;

    // 2. Renderer with pixelRatio clamping for mobile performance
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.replaceChildren(renderer.domElement);

    // 3. Materials & Groups
    const materials: THREE.Material[] = [];
    materialsRef.current = materials;

    const rootGroup = new THREE.Group();
    groupRef.current = rootGroup;
    scene.add(rootGroup);

    // Ground platform / pedestal
    const groundGeo = new THREE.CylinderGeometry(4.2, 4.5, 0.4, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2
    });
    materials.push(groundMat);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    rootGroup.add(ground);

    // Grid ring accents
    const ringGeo = new THREE.RingGeometry(3.6, 3.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    materials.push(ringMat);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    rootGroup.add(ring);

    // Procedural landmark generation using bespoke architectural script
    buildProceduralLandmark(landmarkDetails.id, rootGroup, materials);

    // Atmospheric golden floating particles
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 7;
      particlePositions[i + 1] = Math.random() * 5 + 0.5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 7;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.08,
      transparent: true,
      opacity: 0.6
    });
    materials.push(particleMat);
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particleSystem);

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    ambientLight.name = 'ambient';
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    dirLight.name = 'sun';
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    rimLight.name = 'rim';
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);

    // 5. Interactive Drag & Touch Orbiting
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !rootGroup) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - prevMouseX;
      const deltaY = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      rootGroup.rotation.y += deltaX * 0.008;
      camera.position.y = Math.max(1.2, Math.min(8.5, camera.position.y - deltaY * 0.015));
      camera.lookAt(...landmarkDetails.cameraTarget);
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onPointerDown);
    dom.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    dom.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // 6. Animation loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (isAutoRotate && !isDragging && rootGroup) {
        rootGroup.rotation.y += 0.005;
      }

      // Gentle floating particle swirl
      if (particleSystem) {
        particleSystem.rotation.y += 0.002;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 7. Cleanup
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      dom.removeEventListener('mousedown', onPointerDown);
      dom.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      dom.removeEventListener('touchstart', onPointerDown);
      dom.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      renderer.dispose();
      materials.forEach(m => m.dispose());
    };
  }, [isOpen, landmarkDetails, isAutoRotate]);

  // Handle Time of Day lighting shifts
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const ambient = scene.getObjectByName('ambient') as THREE.AmbientLight;
    const sun = scene.getObjectByName('sun') as THREE.DirectionalLight;
    const rim = scene.getObjectByName('rim') as THREE.DirectionalLight;

    if (!ambient || !sun || !rim) return;

    if (timeOfDay === 'golden') {
      ambient.color.setHex(0xffedd5);
      ambient.intensity = 0.6;
      sun.color.setHex(0xf59e0b);
      sun.intensity = 2.2;
      rim.color.setHex(0x38bdf8);
      rim.intensity = 0.5;
    } else if (timeOfDay === 'day') {
      ambient.color.setHex(0xffffff);
      ambient.intensity = 0.8;
      sun.color.setHex(0xffffff);
      sun.intensity = 2.0;
      rim.color.setHex(0x94a3b8);
      rim.intensity = 0.4;
    } else {
      // Night mode
      ambient.color.setHex(0x1e1b4b);
      ambient.intensity = 0.3;
      sun.color.setHex(0x6366f1);
      sun.intensity = 0.8;
      rim.color.setHex(0x10b981);
      rim.intensity = 0.9;
    }
  }, [timeOfDay]);

  // Handle Wireframe toggling
  useEffect(() => {
    materialsRef.current.forEach(mat => {
      if ('wireframe' in mat) {
        (mat as THREE.MeshStandardMaterial).wireframe = isWireframe;
      }
    });
  }, [isWireframe]);

  // Zoom controls
  const handleZoom = (delta: number) => {
    if (!cameraRef.current) return;
    triggerHaptic('light');
    const cam = cameraRef.current;
    cam.position.z = Math.max(3.5, Math.min(14.0, cam.position.z + delta));
  };

  const handleResetCamera = () => {
    if (!cameraRef.current || !groupRef.current) return;
    triggerHaptic('medium');
    cameraRef.current.position.set(...landmarkDetails.cameraPosition);
    cameraRef.current.lookAt(...landmarkDetails.cameraTarget);
    groupRef.current.rotation.set(0, 0, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-sm text-white truncate">{landmarkDetails.landmarkName}</h3>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  WebGL 3D
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{landmarkDetails.destination}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close 3D Viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3D WebGL Canvas Viewport */}
        <div className="relative w-full h-[320px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden select-none">
          {webglSupported ? (
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">{landmarkDetails.landmarkName}</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Hardware 3D acceleration is restricted on this browser. Full interactive details and maps are active below.
                </p>
              </div>
            </div>
          )}

          {/* Top Left Navigation Hint */}
          <div className="absolute top-2.5 left-3 text-[10px] text-slate-400/90 font-mono flex items-center gap-1.5 pointer-events-none bg-slate-950/60 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800/80">
            <Compass className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Drag to rotate • Pinch / buttons to zoom</span>
          </div>

          {/* Top Right Zoom Controls */}
          <div className="absolute top-2.5 right-3 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
            <button
              onClick={() => handleZoom(-1.2)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(1.2)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetCamera}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom Overlay Controls */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto flex-wrap gap-2">
            {/* Lighting Modes */}
            <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setTimeOfDay('golden');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  timeOfDay === 'golden' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Golden Hour Sunset"
              >
                <Sun className="w-3 h-3" />
                <span>Golden</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setTimeOfDay('day');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  timeOfDay === 'day' ? 'bg-sky-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Daylight"
              >
                <Sun className="w-3 h-3" />
                <span>Day</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setTimeOfDay('night');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  timeOfDay === 'night' ? 'bg-indigo-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Night Sky"
              >
                <Moon className="w-3 h-3" />
                <span>Night</span>
              </button>
            </div>

            {/* Viewport Toggles */}
            <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsAutoRotate(!isAutoRotate);
                }}
                className={`p-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  isAutoRotate ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Toggle Auto Rotation"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsWireframe(!isWireframe);
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isWireframe ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Toggle Wireframe Architecture"
              >
                <Eye className="w-3 h-3" />
                <span>Wireframe</span>
              </button>
            </div>
          </div>
        </div>

        {/* CONCODE Brain Architectural Intelligence & Facts */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          
          {/* Metadata Badges Strip */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                <Building2 className="w-3 h-3 text-emerald-400" />
                <span>Style</span>
              </div>
              <span className="text-xs font-bold text-white block truncate mt-0.5" title={landmarkDetails.architecturalStyle}>
                {landmarkDetails.architecturalStyle}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                <Ruler className="w-3 h-3 text-sky-400" />
                <span>Scale</span>
              </div>
              <span className="text-xs font-bold text-white block truncate mt-0.5" title={landmarkDetails.heightOrSize}>
                {landmarkDetails.heightOrSize}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>Built</span>
              </div>
              <span className="text-xs font-bold text-white block truncate mt-0.5" title={landmarkDetails.yearBuilt}>
                {landmarkDetails.yearBuilt}
              </span>
            </div>
          </div>

          {/* Curator Insight */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Architectural Topography</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">CONCODE Brain: webgl ✨</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {landmarkDetails.curatorInsight}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
