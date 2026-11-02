import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Gauge,
  Zap,
} from "lucide-react";

export const PhysicsRobotics3DViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1.0);
  const [kinematicsMode, setKinematicsMode] = useState<"harmonic" | "kinetic" | "calibration">("harmonic");
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [shoulderAngle, setShoulderAngle] = useState<number>(25);
  const [elbowAngle, setElbowAngle] = useState<number>(-45);
  const [clawGrip, setClawGrip] = useState<number>(30);
  const [pendulumMass, setPendulumMass] = useState<number>(1.5);

  // Telemetry state
  const [telemetry, setTelemetry] = useState({
    jointTorqueNm: 12.4,
    angularVelocityRadS: 2.15,
    kineticEnergyJ: 6.85,
    potentialEnergyJ: 14.2,
    dampingWatts: 0.12,
  });

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    robotGroup: THREE.Group;
    upperArmPivot: THREE.Group;
    forearmPivot: THREE.Group;
    clawLeft: THREE.Mesh;
    clawRight: THREE.Mesh;
    pendulumCord: THREE.Line;
    pendulumBob: THREE.Mesh;
    visorMesh: THREE.Mesh;
    animId?: number;
    clock: THREE.Clock;
    isInteracting: boolean;
    prevMouse: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Obsidian void

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 20, 55);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Studio PBR Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
    keyLight.position.set(25, 45, 30);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf59e0b, 1.2);
    fillLight.position.set(-25, 15, -20);
    scene.add(fillLight);

    const topRim = new THREE.PointLight(0x818cf8, 2.5, 60);
    topRim.position.set(0, 35, 10);
    scene.add(topRim);

    // Grid Floor
    const grid = new THREE.GridHelper(80, 40, 0x334155, 0x0f172a);
    grid.position.y = -10;
    scene.add(grid);

    // Floor contact shadow disc
    const floorGeo = new THREE.CircleGeometry(12, 32);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x090d16,
      transparent: true,
      opacity: 0.8,
    });
    const floorDisc = new THREE.Mesh(floorGeo, floorMat);
    floorDisc.rotation.x = -Math.PI / 2;
    floorDisc.position.y = -9.95;
    scene.add(floorDisc);

    // ── HIERARCHICAL 8-PART ARTICULATED ROBOT TUTOR ──────────────────
    const robotGroup = new THREE.Group();
    scene.add(robotGroup);

    // Materials
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.7,
      roughness: 0.3,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.2,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });

    // 1. Omnidirectional Mobile Pedestal Base
    const baseGeo = new THREE.CylinderGeometry(5.5, 6.5, 2.5, 32);
    const baseMesh = new THREE.Mesh(baseGeo, chassisMat);
    baseMesh.position.y = -8.75;
    robotGroup.add(baseMesh);

    // Base glowing ring
    const ringGeo = new THREE.TorusGeometry(6.2, 0.2, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -9.0;
    robotGroup.add(ringMesh);

    // 2. Turret Pivot & Lower Torso
    const torsoGeo = new THREE.CylinderGeometry(3.5, 4.2, 7, 24);
    const torsoMesh = new THREE.Mesh(torsoGeo, chassisMat);
    torsoMesh.position.y = -4.0;
    robotGroup.add(torsoMesh);

    // Torso power core reactor
    const coreGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const coreMesh = new THREE.Mesh(coreGeo, accentMat);
    coreMesh.position.set(0, -4.0, 3.2);
    robotGroup.add(coreMesh);

    // 3. Sensor Head with Visor
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.2, 0);
    robotGroup.add(headPivot);

    const headGeo = new THREE.BoxGeometry(4.2, 3.2, 3.8);
    const headMesh = new THREE.Mesh(headGeo, chassisMat);
    headPivot.add(headMesh);

    // Visor Eye
    const visorGeo = new THREE.BoxGeometry(3.6, 0.9, 0.6);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.2, 1.95);
    headPivot.add(visorMesh);

    // Antenna
    const antGeo = new THREE.CylinderGeometry(0.1, 0.15, 2.5);
    const antMesh = new THREE.Mesh(antGeo, jointMat);
    antMesh.position.set(1.5, 2.4, 0);
    headPivot.add(antMesh);

    // 4. Shoulder Articulation Joint
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(4.5, -2.5, 0);
    robotGroup.add(shoulderPivot);

    const shoulderBallGeo = new THREE.SphereGeometry(1.6, 24, 24);
    const shoulderBall = new THREE.Mesh(shoulderBallGeo, jointMat);
    shoulderPivot.add(shoulderBall);

    // 5. Upper Robotic Arm
    const upperArmPivot = new THREE.Group();
    shoulderPivot.add(upperArmPivot);

    const armGeo = new THREE.CylinderGeometry(1.1, 1.3, 8, 16);
    const armMesh = new THREE.Mesh(armGeo, chassisMat);
    armMesh.position.y = -4.0;
    upperArmPivot.add(armMesh);

    // 6. Elbow Articulation Joint & Forearm
    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -8.0, 0);
    upperArmPivot.add(forearmPivot);

    const elbowGeo = new THREE.SphereGeometry(1.3, 20, 20);
    const elbowBall = new THREE.Mesh(elbowGeo, jointMat);
    forearmPivot.add(elbowBall);

    const forearmGeo = new THREE.CylinderGeometry(0.9, 1.1, 7.5, 16);
    const forearmMesh = new THREE.Mesh(forearmGeo, chassisMat);
    forearmMesh.position.y = -4.0;
    forearmPivot.add(forearmMesh);

    // 7. Mechanical Two-Prong Claw (Gripper)
    const wristPivot = new THREE.Group();
    wristPivot.position.set(0, -8.0, 0);
    forearmPivot.add(wristPivot);

    const clawBaseGeo = new THREE.CylinderGeometry(1.1, 0.9, 1.2, 16);
    const clawBase = new THREE.Mesh(clawBaseGeo, jointMat);
    wristPivot.add(clawBase);

    const clawFingerGeo = new THREE.BoxGeometry(0.4, 2.2, 0.6);
    const clawLeft = new THREE.Mesh(clawFingerGeo, accentMat);
    clawLeft.position.set(-0.8, -1.5, 0);
    wristPivot.add(clawLeft);

    const clawRight = new THREE.Mesh(clawFingerGeo, accentMat);
    clawRight.position.set(0.8, -1.5, 0);
    wristPivot.add(clawRight);

    // 8. Dynamic Suspended Physics Pendulum Test Rig held by Claw
    const pendulumPivot = new THREE.Group();
    wristPivot.add(pendulumPivot);
    pendulumPivot.position.set(0, -2.5, 0);

    const cordPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -7.5, 0)];
    const cordGeo = new THREE.BufferGeometry().setFromPoints(cordPoints);
    const cordMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 });
    const pendulumCord = new THREE.Line(cordGeo, cordMat);
    pendulumPivot.add(pendulumCord);

    const bobGeo = new THREE.SphereGeometry(1.5, 24, 24);
    const bobMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x059669,
      emissiveIntensity: 0.2,
    });
    const pendulumBob = new THREE.Mesh(bobGeo, bobMat);
    pendulumBob.position.set(0, -7.5, 0);
    pendulumPivot.add(pendulumBob);

    // State Ref
    const clock = new THREE.Clock();
    const sceneState = {
      scene,
      camera,
      renderer,
      robotGroup,
      upperArmPivot,
      forearmPivot,
      clawLeft,
      clawRight,
      pendulumCord,
      pendulumBob,
      visorMesh,
      animId: undefined as number | undefined,
      clock,
      isInteracting: false,
      prevMouse: { x: 0, y: 0 },
    };
    sceneRef.current = sceneState;

    // Mouse Interaction for 3D Camera Orbit
    const handleMouseDown = (e: MouseEvent) => {
      sceneState.isInteracting = true;
      sceneState.prevMouse = { x: e.clientX, y: e.clientY };
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!sceneState.isInteracting) return;
      const dx = e.clientX - sceneState.prevMouse.x;
      const dy = e.clientY - sceneState.prevMouse.y;
      robotGroup.rotation.y += dx * 0.008;
      camera.position.y = Math.max(5, Math.min(45, camera.position.y - dy * 0.08));
      sceneState.prevMouse = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => {
      sceneState.isInteracting = false;
    };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(20, Math.min(100, camera.position.z + e.deltaY * 0.05));
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    dom.addEventListener("wheel", handleWheel, { passive: false });

    // Animation Loop
    const animate = () => {
      sceneState.animId = requestAnimationFrame(animate);
      const delta = clock.getDelta() * speed;
      const elapsedTime = clock.getElapsedTime() * speed;

      if (isPlaying) {
        if (kinematicsMode === "harmonic") {
          // Harmonic wave motion across all joints
          const theta1 = Math.sin(elapsedTime * 2.2) * 0.45;
          const theta2 = Math.cos(elapsedTime * 2.2) * 0.6 - 0.3;
          upperArmPivot.rotation.z = theta1;
          forearmPivot.rotation.z = theta2;

          // Pendulum swinging in harmonic resonance
          const pendulumAngle = Math.sin(elapsedTime * 2.8) * 0.75;
          pendulumPivot.rotation.z = pendulumAngle;

          // Head scanning movement
          headPivot.rotation.y = Math.sin(elapsedTime * 1.4) * 0.3;

          // Dynamic claw pulse
          const gripOffset = (Math.sin(elapsedTime * 3) + 1) * 0.2;
          clawLeft.position.x = -0.6 - gripOffset;
          clawRight.position.x = 0.6 + gripOffset;
        } else if (kinematicsMode === "kinetic") {
          // Large amplitude kinetic pendulum demonstration
          const theta = Math.sin(elapsedTime * 1.8) * 1.1;
          pendulumPivot.rotation.z = theta;
          upperArmPivot.rotation.z = 0.2;
          forearmPivot.rotation.z = -0.5;
        } else {
          // Precision Calibration mode: user slider overrides
          upperArmPivot.rotation.z = (shoulderAngle * Math.PI) / 180;
          forearmPivot.rotation.z = (elbowAngle * Math.PI) / 180;
          clawLeft.position.x = -0.4 - (clawGrip / 100) * 0.6;
          clawRight.position.x = 0.4 + (clawGrip / 100) * 0.6;
        }

        // Bob scaling by mass
        const targetScale = 0.8 + Math.sqrt(pendulumMass) * 0.4;
        pendulumBob.scale.set(targetScale, targetScale, targetScale);

        // Update real-time telemetry readout
        const curOmega = Math.abs(Math.cos(elapsedTime * 2.8) * 2.8 * 0.75);
        const ke = 0.5 * pendulumMass * (curOmega * 1.2) ** 2;
        const pe = pendulumMass * 9.8 * (1 - Math.cos(pendulumPivot.rotation.z)) * 1.2;
        setTelemetry({
          jointTorqueNm: Number((8.5 + Math.sin(elapsedTime * 2) * 4.2).toFixed(2)),
          angularVelocityRadS: Number(curOmega.toFixed(2)),
          kineticEnergyJ: Number(ke.toFixed(2)),
          potentialEnergyJ: Number(pe.toFixed(2)),
          dampingWatts: Number((0.08 + Math.random() * 0.04).toFixed(3)),
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      dom.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      dom.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      if (sceneState.animId) cancelAnimationFrame(sceneState.animId);
      renderer.dispose();
    };
  }, [isPlaying, speed, kinematicsMode, shoulderAngle, elbowAngle, clawGrip, pendulumMass]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">3D Procedural STEM Robotics Laboratory</h3>
            <p className="text-[11px] text-slate-400 font-mono">8-Part Articulated Kinematic Robot Tutor</p>
          </div>
        </div>

        {/* Kinematics Modes */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setKinematicsMode("harmonic")}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
              kinematicsMode === "harmonic" ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : "text-slate-400 hover:text-white"
            }`}
          >
            Harmonic Wave
          </button>
          <button
            onClick={() => setKinematicsMode("kinetic")}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
              kinematicsMode === "kinetic" ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : "text-slate-400 hover:text-white"
            }`}
          >
            Kinetic Rig
          </button>
          <button
            onClick={() => setKinematicsMode("calibration")}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
              kinematicsMode === "calibration" ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : "text-slate-400 hover:text-white"
            }`}
          >
            Manual Joint Cal
          </button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 ${
              isPlaying ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-emerald-500 text-white"
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? "Pause" : "Resume"}
          </button>
          <button
            onClick={() => setSpeed(speed === 1.0 ? 0.4 : 1.0)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono font-semibold transition-all border border-slate-700"
          >
            {speed}x
          </button>
        </div>
      </div>

      {/* Main 3D Viewport with Collapsible Dock */}
      <div className="relative h-[560px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Real-Time Joint Telemetry Floating HUD (Top Left) */}
        <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-800 p-3 rounded-2xl pointer-events-none text-xs flex flex-col gap-1.5 shadow-xl max-w-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            <span className="flex items-center gap-1 text-sky-400">
              <Activity className="w-3.5 h-3.5" /> Telemetry Stream
            </span>
            <span className="font-mono text-emerald-400">60 FPS PBR</span>
          </div>
          <div className="flex justify-between gap-4 font-mono">
            <span className="text-slate-400">Torque:</span>
            <span className="font-bold text-white">{telemetry.jointTorqueNm} N·m</span>
          </div>
          <div className="flex justify-between gap-4 font-mono">
            <span className="text-slate-400">Angular Velocity:</span>
            <span className="font-bold text-sky-400">{telemetry.angularVelocityRadS} rad/s</span>
          </div>
          <div className="flex justify-between gap-4 font-mono">
            <span className="text-slate-400">Kinetic Energy:</span>
            <span className="font-bold text-emerald-400">{telemetry.kineticEnergyJ} J</span>
          </div>
          <div className="flex justify-between gap-4 font-mono">
            <span className="text-slate-400">Potential Energy:</span>
            <span className="font-bold text-blue-400">{telemetry.potentialEnergyJ} J</span>
          </div>
        </div>

        {/* Collapsible Bottom Cinema Dock (<= 15% viewport footprint) */}
        <div className="absolute bottom-3 left-4 right-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl transition-all duration-200">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              Kinematic Parameter Controls
            </span>
            <button
              onClick={() => setDockCollapsed(!dockCollapsed)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {dockCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {!dockCollapsed && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Shoulder Angle</span>
                  <span className="font-mono text-sky-400">{shoulderAngle}°</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={shoulderAngle}
                  disabled={kinematicsMode !== "calibration"}
                  onChange={(e) => setShoulderAngle(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer disabled:opacity-50"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Elbow Joint</span>
                  <span className="font-mono text-sky-400">{elbowAngle}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="45"
                  value={elbowAngle}
                  disabled={kinematicsMode !== "calibration"}
                  onChange={(e) => setElbowAngle(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer disabled:opacity-50"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Claw Gripper Aperture</span>
                  <span className="font-mono text-sky-400">{clawGrip}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={clawGrip}
                  disabled={kinematicsMode !== "calibration"}
                  onChange={(e) => setClawGrip(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer disabled:opacity-50"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Pendulum Bob Mass</span>
                  <span className="font-mono text-emerald-400">{pendulumMass} kg</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={pendulumMass}
                  onChange={(e) => setPendulumMass(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
