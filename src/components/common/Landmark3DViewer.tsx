import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, Sun, Moon, Eye, RotateCw, Sparkles, Compass, MapPin } from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';

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
  landmarkType = 'heritage',
  isOpen,
  onClose
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'golden' | 'night'>('golden');
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);

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

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4, 9);
    cameraRef.current = camera;

    // 2. Renderer with pixelRatio clamping for mobile performance
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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

    // Procedural landmark generation based on type
    const lowerName = landmarkName.toLowerCase();
    const isTower = lowerName.includes('tower') || lowerName.includes('burj') || lowerName.includes('minar') || lowerName.includes('khalifa');
    const isTempleOrFort = lowerName.includes('temple') || lowerName.includes('fort') || lowerName.includes('palace') || lowerName.includes('mandir') || lowerName.includes('haveli');
    const isNature = lowerName.includes('fall') || lowerName.includes('lake') || lowerName.includes('valley') || lowerName.includes('mountain') || lowerName.includes('park');

    if (isTower) {
      // Slender spire tower architecture
      const baseGeo = new THREE.CylinderGeometry(1.2, 1.8, 1.5, 8);
      const spireGeo1 = new THREE.CylinderGeometry(0.7, 1.2, 2.5, 8);
      const spireGeo2 = new THREE.CylinderGeometry(0.1, 0.7, 2.2, 8);
      const needleGeo = new THREE.CylinderGeometry(0.02, 0.08, 1.5, 8);

      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 });
      materials.push(stoneMat, glassMat);

      const base = new THREE.Mesh(baseGeo, stoneMat);
      base.position.y = 0.75;
      base.castShadow = true;
      rootGroup.add(base);

      const tier1 = new THREE.Mesh(spireGeo1, glassMat);
      tier1.position.y = 2.75;
      tier1.castShadow = true;
      rootGroup.add(tier1);

      const tier2 = new THREE.Mesh(spireGeo2, glassMat);
      tier2.position.y = 5.1;
      tier2.castShadow = true;
      rootGroup.add(tier2);

      const needle = new THREE.Mesh(needleGeo, stoneMat);
      needle.position.y = 6.95;
      rootGroup.add(needle);
    } else if (isTempleOrFort) {
      // Majestic dome / citadel architecture
      const baseGeo = new THREE.BoxGeometry(3.2, 1.2, 3.2);
      const tierGeo = new THREE.BoxGeometry(2.2, 1.0, 2.2);
      const domeGeo = new THREE.SphereGeometry(1.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const pillarGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.8, 12);

      const sandstoneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6, metalness: 0.1 });
      const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
      materials.push(sandstoneMat, marbleMat);

      const base = new THREE.Mesh(baseGeo, sandstoneMat);
      base.position.y = 0.6;
      base.castShadow = true;
      base.receiveShadow = true;
      rootGroup.add(base);

      const tier = new THREE.Mesh(tierGeo, marbleMat);
      tier.position.y = 1.7;
      tier.castShadow = true;
      rootGroup.add(tier);

      const dome = new THREE.Mesh(domeGeo, sandstoneMat);
      dome.position.y = 2.2;
      dome.castShadow = true;
      rootGroup.add(dome);

      // 4 Corner Minarets / Pillars
      const pillarPositions = [
        [-1.4, -1.4],
        [1.4, -1.4],
        [-1.4, 1.4],
        [1.4, 1.4]
      ];
      pillarPositions.forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(pillarGeo, marbleMat);
        pillar.position.set(px, 1.4, pz);
        pillar.castShadow = true;
        rootGroup.add(pillar);

        const miniDomeGeo = new THREE.SphereGeometry(0.3, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const miniDome = new THREE.Mesh(miniDomeGeo, sandstoneMat);
        miniDome.position.set(px, 2.8, pz);
        rootGroup.add(miniDome);
      });
    } else if (isNature) {
      // Natural peak, waterfall & pine trees
      const mountainGeo = new THREE.ConeGeometry(2.4, 3.8, 7);
      const snowGeo = new THREE.ConeGeometry(1.0, 1.6, 7);
      const pineGeo = new THREE.ConeGeometry(0.5, 1.2, 5);
      const trunkGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 5);

      const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2 });
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
      materials.push(rockMat, snowMat, foliageMat, woodMat);

      const mountain = new THREE.Mesh(mountainGeo, rockMat);
      mountain.position.y = 1.9;
      mountain.castShadow = true;
      rootGroup.add(mountain);

      const snowCap = new THREE.Mesh(snowGeo, snowMat);
      snowCap.position.y = 3.0;
      rootGroup.add(snowCap);

      // Little alpine trees around base
      const treeOffsets = [
        [-1.8, 1.2],
        [1.5, 1.4],
        [-1.2, -1.5],
        [1.6, -1.0]
      ];
      treeOffsets.forEach(([tx, tz]) => {
        const trunk = new THREE.Mesh(trunkGeo, woodMat);
        trunk.position.set(tx, 0.2, tz);
        rootGroup.add(trunk);

        const pine = new THREE.Mesh(pineGeo, foliageMat);
        pine.position.set(tx, 0.8, tz);
        pine.castShadow = true;
        rootGroup.add(pine);
      });
    } else {
      // General Heritage & Cultural Pavillion
      const pavilionGeo = new THREE.CylinderGeometry(1.8, 2.2, 1.4, 12);
      const roofGeo = new THREE.ConeGeometry(2.5, 1.6, 12);
      const archMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.2 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
      materials.push(archMat, roofMat);

      const pavilion = new THREE.Mesh(pavilionGeo, archMat);
      pavilion.position.y = 0.7;
      pavilion.castShadow = true;
      rootGroup.add(pavilion);

      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 2.2;
      roof.castShadow = true;
      rootGroup.add(roof);
    }

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
      camera.position.y = Math.max(1.5, Math.min(8.0, camera.position.y - deltaY * 0.015));
      camera.lookAt(0, 1.8, 0);
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
        rootGroup.rotation.y += 0.006;
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
  }, [isOpen, landmarkName, isAutoRotate]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-white truncate">{landmarkName}</h3>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  WebGL 3D
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{destination}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3D WebGL Canvas Viewport */}
        <div className="relative w-full h-[320px] bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Overlay Controls */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
            {/* Lighting Modes */}
            <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setTimeOfDay('golden');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
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
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
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
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
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
                className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${
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
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                  isWireframe ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Toggle Wireframe Architecture"
              >
                <Eye className="w-3 h-3" />
                <span>Wireframe</span>
              </button>
            </div>
          </div>

          {/* Interactive Hint */}
          <div className="absolute top-2.5 left-3 text-[10px] text-slate-400/80 font-mono flex items-center gap-1 pointer-events-none">
            <Compass className="w-3 h-3 text-emerald-400" />
            <span>Drag to rotate • Pinch to zoom</span>
          </div>
        </div>

        {/* CONCODE Brain Landmark Intelligence Card */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">CONCODE WebGL 3D Intelligence</span>
            <span className="text-[10px] text-emerald-400 font-mono">Guild: webgl ✨</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time interactive 3D procedural simulation generated by CONCODE Brain. Allows travelers to visualize architectural orientation, sun exposure, and elevation layout prior to booking.
          </p>
        </div>

      </div>
    </div>
  );
};
