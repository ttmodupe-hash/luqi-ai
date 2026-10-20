import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Dna,
  Search,
  Activity,
  Layers,
  Sparkles,
  Maximize2,
  RotateCcw,
  Info,
  ShieldCheck,
  FileText,
  FlaskConical,
  ExternalLink,
} from "lucide-react";

interface Residue {
  resSeq: number;
  resName: string;
  ca: [number, number, number];
  plddt: number;
  secondaryStructure: "helix" | "sheet" | "coil";
}

interface TargetData {
  id: string;
  gene: string;
  name: string;
  organism: string;
  uniprotAccession: string;
  pdbId: string;
  meanPlddt: number;
  plddtCategory: "Very High" | "Confident" | "Low" | "Very Low";
  functionSummary: string;
  pathway: string;
  associatedDrugs: string[];
  clinvarVariantsCount: number;
  molecularWeightKDa: number;
  aminoAcidsCount: number;
  smiles?: string;
  lipinski?: {
    mw: number;
    logP: number;
    hbd: number;
    hba: number;
    rotatableBonds: number;
    violations: number;
  };
  residues: Residue[];
}

export const Bioscience3DViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>("TP53");
  const [targetData, setTargetData] = useState<TargetData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [renderMode, setRenderMode] = useState<"ribbon" | "atoms" | "surface">("ribbon");
  const [showLigandPocket, setShowLigandPocket] = useState<boolean>(true);
  const [colorMode, setColorMode] = useState<"plddt" | "secondary" | "element">("plddt");
  const [autorotate, setAutorotate] = useState<boolean>(true);
  const autorotateRef = useRef<boolean>(true);
  useEffect(() => {
    autorotateRef.current = autorotate;
  }, [autorotate]);

  // Three.js instances ref
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    molGroup: THREE.Group;
    animId?: number;
    isInteracting: boolean;
    prevMouse: { x: number; y: number };
  } | null>(null);

  // Fetch target data
  const fetchTarget = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/science/bio-query?q=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (json.status === "success" && json.data) {
        setTargetData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch science target:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTarget(selectedTarget);
  }, [selectedTarget]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Obsidian laboratory void

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 15, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    keyLight.position.set(30, 40, 40);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    fillLight.position.set(-30, -20, -30);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x0053d6, 3, 80);
    rimLight.position.set(0, -30, 20);
    scene.add(rimLight);

    // Grid Floor
    const grid = new THREE.GridHelper(100, 40, 0x1e293b, 0x0f172a);
    grid.position.y = -22;
    scene.add(grid);

    const molGroup = new THREE.Group();
    scene.add(molGroup);

    const sceneState = {
      scene,
      camera,
      renderer,
      molGroup,
      animId: undefined as number | undefined,
      isInteracting: false,
      prevMouse: { x: 0, y: 0 },
    };
    sceneRef.current = sceneState;

    // Mouse & Touch Controls
    const handleMouseDown = (e: MouseEvent) => {
      sceneState.isInteracting = true;
      sceneState.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!sceneState.isInteracting) return;
      const dx = e.clientX - sceneState.prevMouse.x;
      const dy = e.clientY - sceneState.prevMouse.y;
      molGroup.rotation.y += dx * 0.008;
      molGroup.rotation.x += dy * 0.008;
      sceneState.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      sceneState.isInteracting = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(15, Math.min(120, camera.position.z + e.deltaY * 0.05));
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    dom.addEventListener("wheel", handleWheel, { passive: false });

    // Animation Loop
    const animate = () => {
      sceneState.animId = requestAnimationFrame(animate);
      if (autorotateRef.current && !sceneState.isInteracting) {
        molGroup.rotation.y += 0.004;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
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
  }, []);

  // Update 3D Molecular Mesh when targetData or renderMode changes
  useEffect(() => {
    if (!sceneRef.current || !targetData) return;
    const { molGroup } = sceneRef.current;

    // Clear existing children
    while (molGroup.children.length > 0) {
      const child = molGroup.children[0] as any;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
        else child.material.dispose();
      }
      molGroup.remove(child);
    }

    const residues = targetData.residues || [];
    if (residues.length === 0) return;

    // Center coordinates
    const points = residues.map((r) => new THREE.Vector3(r.ca[0], r.ca[1], r.ca[2]));
    const center = new THREE.Vector3();
    points.forEach((p) => center.add(p));
    center.divideScalar(points.length);
    points.forEach((p) => p.sub(center));

    // Get color based on AlphaFold pLDDT or Secondary Structure
    const getResidueColor = (r: Residue) => {
      if (colorMode === "plddt") {
        if (r.plddt >= 90) return 0x0053d6; // Very High (>90) - Deep Blue
        if (r.plddt >= 70) return 0x65cbf3; // Confident (70-90) - Cyan
        if (r.plddt >= 50) return 0xffdb13; // Low (50-70) - Yellow
        return 0xff7d45; // Very Low (<50) - Orange
      } else if (colorMode === "secondary") {
        if (r.secondaryStructure === "helix") return 0xec4899; // Pink
        if (r.secondaryStructure === "sheet") return 0xf59e0b; // Gold
        return 0x94a3b8; // Slate
      } else {
        // Element / generic
        return 0x38bdf8;
      }
    };

    if (renderMode === "ribbon" || renderMode === "surface") {
      // Build smooth CatmullRom spline tube
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, points.length * 3, renderMode === "surface" ? 1.8 : 0.85, 12, false);

      // Vertex color assignments based on pLDDT per segment
      const count = tubeGeo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const tempColor = new THREE.Color();

      for (let i = 0; i < count; i++) {
        const t = i / count;
        const resIdx = Math.min(residues.length - 1, Math.floor(t * residues.length));
        tempColor.setHex(getResidueColor(residues[resIdx]));
        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
      }

      tubeGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: renderMode === "surface" ? 0.6 : 0.25,
        metalness: 0.2,
      });

      const tubeMesh = new THREE.Mesh(tubeGeo, mat);
      molGroup.add(tubeMesh);
    }

    // Atomistic Spheres for C-Alpha or full atoms
    if (renderMode === "atoms" || renderMode === "surface") {
      const sphereGeo = new THREE.SphereGeometry(renderMode === "atoms" ? 0.9 : 0.45, 16, 16);
      points.forEach((pt, idx) => {
        const r = residues[idx];
        const mat = new THREE.MeshStandardMaterial({
          color: getResidueColor(r),
          roughness: 0.2,
          metalness: 0.3,
        });
        const sphere = new THREE.Mesh(sphereGeo, mat);
        sphere.position.copy(pt);
        molGroup.add(sphere);
      });
    }

    // Ligand Binding Pocket
    if (showLigandPocket && points.length > 25) {
      const pocketCenter = points[Math.floor(points.length / 2)].clone().add(new THREE.Vector3(2, 2, 2));

      // Glowing ligand sphere
      const ligandGeo = new THREE.IcosahedronGeometry(2.5, 2);
      const ligandMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.6,
        roughness: 0.1,
        metalness: 0.8,
        wireframe: true,
      });
      const ligandMesh = new THREE.Mesh(ligandGeo, ligandMat);
      ligandMesh.position.copy(pocketCenter);
      molGroup.add(ligandMesh);

      // Docking boundary halo
      const haloGeo = new THREE.RingGeometry(3.5, 4.0, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pocketCenter);
      halo.rotation.x = Math.PI / 2;
      molGroup.add(halo);
    }
  }, [targetData, renderMode, showLigandPocket, colorMode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchTarget(searchQuery.trim());
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Target Selector & Query Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
            <Dna className="w-4 h-4 text-sky-400" />
            Curated Targets:
          </span>
          {["TP53", "BRCA1", "EGFR", "ARTEMISININ", "IMATINIB"].map((tgt) => (
            <button
              key={tgt}
              onClick={() => setSelectedTarget(tgt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedTarget === tgt
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25 border border-sky-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
              }`}
            >
              {tgt}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search gene, UniProt or drug (e.g. KRAS, Insulin)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            {loading ? "Analyzing..." : "Query"}
          </button>
        </form>
      </div>

      {/* Main Grid: 3D Viewport + Biological Insight Dock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 3D Viewport Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-2">
          <div className="relative h-[520px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            {/* Canvas Mount */}
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Viewport Top Floating Controls */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3.5 py-1.5 rounded-xl pointer-events-auto flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white tracking-wide">{targetData?.gene || selectedTarget}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-400 font-mono text-[11px]">{targetData?.uniprotAccession || "P04637"}</span>
                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono text-[10px] border border-sky-500/30">
                  PDB: {targetData?.pdbId || "1TUP"}
                </span>
              </div>

              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-xl pointer-events-auto flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setRenderMode("ribbon")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    renderMode === "ribbon" ? "bg-sky-500 text-white font-bold" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Ribbon
                </button>
                <button
                  onClick={() => setRenderMode("atoms")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    renderMode === "atoms" ? "bg-sky-500 text-white font-bold" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Atoms
                </button>
                <button
                  onClick={() => setRenderMode("surface")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    renderMode === "surface" ? "bg-sky-500 text-white font-bold" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Surface
                </button>
              </div>
            </div>

            {/* Viewport Bottom Floating Legend (AlphaFold pLDDT 4-Band Scale) */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-800 p-2.5 rounded-2xl pointer-events-auto max-w-sm">
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>AlphaFold pLDDT Confidence</span>
                <span className="text-sky-400 font-mono">Mean: {targetData?.meanPlddt || 82.4}%</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[9px] font-mono text-center">
                <div className="bg-[#0053D6]/20 border border-[#0053D6] text-blue-200 py-1 rounded">
                  <div className="w-2 h-2 rounded-full bg-[#0053D6] mx-auto mb-0.5" />
                  &gt;90 (Very High)
                </div>
                <div className="bg-[#65CBF3]/20 border border-[#65CBF3] text-cyan-200 py-1 rounded">
                  <div className="w-2 h-2 rounded-full bg-[#65CBF3] mx-auto mb-0.5" />
                  70-90 (Confident)
                </div>
                <div className="bg-[#FFDB13]/20 border border-[#FFDB13] text-yellow-200 py-1 rounded">
                  <div className="w-2 h-2 rounded-full bg-[#FFDB13] mx-auto mb-0.5" />
                  50-70 (Low)
                </div>
                <div className="bg-[#FF7D45]/20 border border-[#FF7D45] text-orange-200 py-1 rounded">
                  <div className="w-2 h-2 rounded-full bg-[#FF7D45] mx-auto mb-0.5" />
                  &lt;50 (Very Low)
                </div>
              </div>
            </div>

            {/* Viewport Bottom Right Quick Toggles */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setShowLigandPocket(!showLigandPocket)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur border transition-all flex items-center gap-1.5 ${
                  showLigandPocket
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Ligand Pocket
              </button>

              <button
                onClick={() => setAutorotate(!autorotate)}
                className={`p-2 rounded-xl backdrop-blur border transition-all ${
                  autorotate
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                    : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white"
                }`}
                title="Toggle Auto Rotation"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${autorotate ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Biological Metadata & Drug Scout Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Target Profile Card */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 flex flex-col gap-3 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{targetData?.name || "Target Molecule"}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{targetData?.organism || "Homo sapiens"}</p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                {targetData?.plddtCategory || "Confident"}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              {targetData?.functionSummary}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Mass</span>
                <span className="text-white font-mono font-bold">{targetData?.molecularWeightKDa || 43.6} kDa</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Residues</span>
                <span className="text-white font-mono font-bold">{targetData?.aminoAcidsCount || 393} aa</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">ClinVar Variants</span>
                <span className="text-amber-400 font-mono font-bold">{targetData?.clinvarVariantsCount || 1420}</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Pathways</span>
                <span className="text-sky-400 font-mono font-bold">Reactome</span>
              </div>
            </div>
          </div>

          {/* Pharmacology & Lipinski Rule-of-5 Card */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 flex flex-col gap-3 shadow-xl">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
              Pharmacology & Lipinski Rule-of-5
            </h4>

            {targetData?.lipinski && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">MW (&lt;500)</span>
                  <span className="font-mono font-bold text-white">{targetData.lipinski.mw.toFixed(1)}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">LogP (&lt;5)</span>
                  <span className="font-mono font-bold text-white">{targetData.lipinski.logP.toFixed(2)}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">HBD / HBA</span>
                  <span className="font-mono font-bold text-white">
                    {targetData.lipinski.hbd} / {targetData.lipinski.hba}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-1">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Investigated Inhibitors:</span>
              <div className="flex flex-wrap gap-1.5">
                {targetData?.associatedDrugs?.map((drug, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium"
                  >
                    {drug}
                  </span>
                ))}
              </div>
            </div>

            {targetData?.smiles && (
              <div className="mt-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block mb-0.5">Canonical 2D SMILES:</span>
                <code className="text-[10px] text-amber-300 font-mono break-all leading-tight block">
                  {targetData.smiles}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
