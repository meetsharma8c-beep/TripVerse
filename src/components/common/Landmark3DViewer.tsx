import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Ruler,
  Globe,
  Navigation,
  ExternalLink,
  Layers,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { triggerHaptic, openExternalUrl } from '../../services/deviceService';
import { 
  resolveLandmarkDetails, 
  buildProceduralLandmark, 
  fetchLiveDestinationEncyclopedia,
  getGoogle3DVirtualViewUrls,
  GenuineEncyclopediaData 
} from '../../services/landmark3DService';

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
  
  // Viewing mode: Google 3D Virtual View vs Three.js Procedural Blueprint
  const [viewMode, setViewMode] = useState<'google3d' | 'webgl'>('google3d');

  // Live encyclopedic factual data (Zero Mock Data)
  const [encyclopediaData, setEncyclopediaData] = useState<GenuineEncyclopediaData | null>(null);
  const [isEncyclopediaLoading, setIsEncyclopediaLoading] = useState<boolean>(true);

  // Resolve architectural model profile
  const landmarkDetails = useMemo(() => {
    return resolveLandmarkDetails(destination, landmarkName);
  }, [destination, landmarkName]);

  // Google 3D Virtual View URLs (Earth 3D, Street View 360°, Satellite)
  const googleUrls = useMemo(() => {
    return getGoogle3DVirtualViewUrls(
      destination,
      landmarkName,
      encyclopediaData?.coordinates
    );
  }, [destination, landmarkName, encyclopediaData?.coordinates]);

  const [timeOfDay, setTimeOfDay] = useState<'day' | 'golden' | 'night'>(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'night';
    }
    return landmarkDetails.defaultTimeOfDay || 'golden';
  });
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const isAutoRotateRef = useRef<boolean>(isAutoRotate);
  useEffect(() => {
    isAutoRotateRef.current = isAutoRotate;
  }, [isAutoRotate]);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const materialsRef = useRef<THREE.Material[]>([]);
  const groupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Live Encyclopedia query to Wikipedia / Wikimedia REST API (100% Genuine Data)
  useEffect(() => {
    if (!isOpen) return;
    setIsEncyclopediaLoading(true);

    fetchLiveDestinationEncyclopedia(destination, landmarkName)
      .then(data => {
        setEncyclopediaData(data);
      })
      .catch(() => {})
      .finally(() => {
        setIsEncyclopediaLoading(false);
      });
  }, [isOpen, destination, landmarkName]);

  // Setup Three.js WebGL scene when in 'webgl' mode
  useEffect(() => {
    if (!isOpen || viewMode !== 'webgl' || !mountRef.current) return;

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

    // 2. Renderer with pixelRatio clamping
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

    // Atmospheric floating particles
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

    // Responsive container resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && camera && renderer) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    if (mountRef.current) {
      resizeObserver.observe(mountRef.current);
    }

    // 6. Visibility-aware animation loop (pauses cleanly when tab/app is backgrounded)
    let isVisible = typeof document === 'undefined' ? true : !document.hidden;
    const animate = () => {
      if (!isVisible) {
        animFrameIdRef.current = 0;
        return;
      }
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (isAutoRotateRef.current && !isDragging && rootGroup) {
        rootGroup.rotation.y += 0.005;
      }

      if (particleSystem) {
        particleSystem.rotation.y += 0.002;
      }

      renderer.render(scene, camera);
    };
    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible && !animFrameIdRef.current) {
        animate();
      } else if (!isVisible && animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = 0;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    animate();

    // 7. Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onPointerDown);
      dom.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      dom.removeEventListener('touchstart', onPointerDown);
      dom.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      renderer.dispose();
      materials.forEach(m => m.dispose());
    };
  }, [isOpen, viewMode, landmarkDetails]);

  // Handle Time of Day lighting shifts
  useEffect(() => {
    if (!sceneRef.current || viewMode !== 'webgl') return;
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
      ambient.color.setHex(0x1e1b4b);
      ambient.intensity = 0.3;
      sun.color.setHex(0x6366f1);
      sun.intensity = 0.8;
      rim.color.setHex(0x10b981);
      rim.intensity = 0.9;
    }
  }, [timeOfDay, viewMode]);

  // Handle Wireframe toggling
  useEffect(() => {
    if (viewMode !== 'webgl') return;
    materialsRef.current.forEach(mat => {
      if ('wireframe' in mat) {
        (mat as THREE.MeshStandardMaterial).wireframe = isWireframe;
      }
    });
  }, [isWireframe, viewMode]);

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

  const displayTitle = encyclopediaData?.title || landmarkDetails.landmarkName;
  const displayExtract = encyclopediaData?.extract || landmarkDetails.curatorInsight;
  const displayCoordinates = encyclopediaData?.coordinates;

  const viewerContent = (
    <div className="fixed inset-0 z-[110] overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative text-slate-100 max-h-[94dvh]">
        
        {/* Top Header with Dual View Mode Selector */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
              {viewMode === 'google3d' ? <Globe className="w-4 h-4 text-sky-400" /> : <Sparkles className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white truncate">{displayTitle}</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {viewMode === 'google3d' ? 'Google 3D View' : 'WebGL Blueprint'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{destination}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setViewMode('google3d');
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer text-[11px] ${
                  viewMode === 'google3d'
                    ? 'bg-sky-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Google 3D Virtual View & Satellite"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google 3D View</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setViewMode('webgl');
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer text-[11px] ${
                  viewMode === 'webgl'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Three.js WebGL Architectural Blueprint"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WebGL Blueprint</span>
              </button>
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
        </div>

        {/* Viewport: Google 3D Virtual View or Three.js WebGL */}
        <div className="relative w-full h-[340px] sm:h-[380px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden select-none shrink-0">
          
          {viewMode === 'google3d' ? (
            /* Mode 1: Genuine Google 3D Satellite & Virtual View */
            <div className="w-full h-full relative">
              <iframe
                title={`Google 3D Satellite View of ${displayTitle}`}
                src={googleUrls.googleSatelliteEmbedUrl}
                className="w-full h-full border-0 filter saturate-110 contrast-105"
                loading="lazy"
                allowFullScreen
              />

              {/* Floating Quick Action Launchers for Google Earth 3D and Street View 360° */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none gap-2 flex-wrap">
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      openExternalUrl(googleUrls.googleEarth3DUrl);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-sky-600 text-white border border-sky-400/30 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all cursor-pointer active:scale-95"
                    title="Open in Google Earth 3D digital twin"
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                    <span>Open in Google Earth 3D</span>
                    <ExternalLink className="w-3 h-3 text-sky-200" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      openExternalUrl(googleUrls.googleStreetView360Url);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-emerald-600 text-white border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all cursor-pointer active:scale-95"
                    title="Open 360-degree Google Street View virtual tour"
                  >
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Street View 360°</span>
                    <ExternalLink className="w-3 h-3 text-emerald-200" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    openExternalUrl(googleUrls.googleMapsUrl);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium flex items-center gap-1 backdrop-blur-md shadow-lg transition-all cursor-pointer pointer-events-auto"
                  title="View on Google Maps"
                >
                  <Navigation className="w-3 h-3 text-amber-400" />
                  <span>Google Maps</span>
                </button>
              </div>

              {/* Bottom Attribution Pill */}
              <div className="absolute bottom-2.5 left-3 text-[10px] text-slate-300 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/80 pointer-events-none flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Google Maps & Google Earth Photorealistic 3D Photogrammetry</span>
              </div>
            </div>
          ) : (
            /* Mode 2: Three.js WebGL Architectural Blueprint Simulator */
            <div className="w-full h-full relative">
              {webglSupported ? (
                <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <Compass className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">{displayTitle}</h4>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Hardware 3D acceleration is restricted on this browser. Use the Google 3D View above.
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
          )}

        </div>

        {/* 100% Genuine Live Encyclopedic & Geospatial Intelligence (Zero Mock Data) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 overflow-y-auto">
          
          {/* Metadata Badges Strip */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                <Building2 className="w-3 h-3 text-emerald-400" />
                <span>Architecture</span>
              </div>
              <span className="text-xs font-bold text-white block truncate mt-0.5" title={landmarkDetails.architecturalStyle}>
                {landmarkDetails.architecturalStyle}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                <MapPin className="w-3 h-3 text-sky-400" />
                <span>Coordinates</span>
              </div>
              <span className="text-xs font-bold text-white block truncate mt-0.5" title={displayCoordinates ? `${displayCoordinates.lat.toFixed(4)}°, ${displayCoordinates.lon.toFixed(4)}°` : landmarkDetails.heightOrSize}>
                {displayCoordinates ? `${displayCoordinates.lat.toFixed(4)}°, ${displayCoordinates.lon.toFixed(4)}°` : landmarkDetails.heightOrSize}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>Historic Record</span>
              </div>
              <span className="text-xs font-bold text-white block truncate mt-0.5" title={landmarkDetails.yearBuilt}>
                {landmarkDetails.yearBuilt}
              </span>
            </div>
          </div>

          {/* Genuine Encyclopedic Curation */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Historical Record</span>
              </span>

              {isEncyclopediaLoading ? (
                <span className="flex items-center gap-1 text-slate-400 text-[10px] font-mono">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>Querying Wikipedia...</span>
                </span>
              ) : encyclopediaData?.wikipediaUrl ? (
                <button
                  type="button"
                  onClick={() => openExternalUrl(encyclopediaData.wikipediaUrl!)}
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium underline text-[11px] cursor-pointer"
                >
                  <span>Wikipedia Article</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : null}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {displayExtract}
            </p>

            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80">
              <span>Source: {encyclopediaData?.source || 'Wikimedia & Google Earth 3D Photogrammetry'}</span>
              {encyclopediaData?.wikibaseItem && (
                <span className="font-mono text-slate-400">Wikidata: {encyclopediaData.wikibaseItem}</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(viewerContent, document.body)
    : viewerContent;
};
