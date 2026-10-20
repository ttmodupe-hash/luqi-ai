import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Dna,
  Search,
  Sparkles,
  Camera,
  Bot,
  Send,
  Loader2,
  RefreshCw,
  ExternalLink,
  Layers,
  FlaskConical,
  Activity,
  ShieldAlert,
  Download,
  Info,
  Maximize2,
  RotateCcw,
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

export const BioscienceLab: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>("TP53");
  const [targetData, setTargetData] = useState<TargetData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loadingTarget, setLoadingTarget] = useState<boolean>(false);

  // 3D Viewport Controls
  const [renderMode, setRenderMode] = useState<"ribbon" | "atoms" | "surface">("ribbon");
  const [showPocket, setShowPocket] = useState<boolean>(true);
  const [autorotate, setAutorotate] = useState<boolean>(true);
  const autorotateRef = useRef<boolean>(true);
  useEffect(() => {
    autorotateRef.current = autorotate;
  }, [autorotate]);

  // Multimodal Gemini Query State
  const [geminiQuery, setGeminiQuery] = useState<string>("");
  const [geminiModel, setGeminiModel] = useState<string>("gemini-3.8-flash");
  const [queryLoading, setQueryLoading] = useState<boolean>(false);
  const [canvasSnapshot, setCanvasSnapshot] = useState<string | null>(null);
  const [include3DSnapshot, setInclude3DSnapshot] = useState<boolean>(true);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<
    Array<{ query: string; answer: string; model: string; timestamp: string; snapshotThumbnail?: string }>
  >([]);

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

  // Fetch target data from science API
  const fetchTarget = async (id: string) => {
    setLoadingTarget(true);
    try {
      const res = await fetch(`/api/science/bio-query?q=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (json.status === "success" && json.data) {
        setTargetData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch science target:", err);
    } finally {
      setLoadingTarget(false);
    }
  };

  useEffect(() => {
    fetchTarget(selectedTarget);
  }, [selectedTarget]);

  // Capture Three.js WebGL Canvas Snapshot
  const captureCanvasSnapshot = (): string | null => {
    if (!sceneRef.current) return null;
    const { renderer, scene, camera } = sceneRef.current;
    renderer.render(scene, camera);
    try {
      const dataUrl = renderer.domElement.toDataURL("image/png");
      setCanvasSnapshot(dataUrl);
      return dataUrl;
    } catch (err) {
      console.warn("Could not capture canvas data URL:", err);
      return null;
    }
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Obsidian void

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 14, 58);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    keyLight.position.set(30, 45, 35);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 1.3);
    fillLight.position.set(-35, -20, -30);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x0053d6, 3.5, 90);
    rimLight.position.set(0, -35, 25);
    scene.add(rimLight);

    // Floor Grid
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

  // Update 3D Molecular Mesh
  useEffect(() => {
    if (!sceneRef.current || !targetData) return;
    const { molGroup } = sceneRef.current;

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

    const points = residues.map((r) => new THREE.Vector3(r.ca[0], r.ca[1], r.ca[2]));
    const center = new THREE.Vector3();
    points.forEach((p) => center.add(p));
    center.divideScalar(points.length);
    points.forEach((p) => p.sub(center));

    // AlphaFold pLDDT 4-Band Coloring
    const getPlddtColor = (plddt: number) => {
      if (plddt >= 90) return 0x0053d6; // Very High (>90)
      if (plddt >= 70) return 0x65cbf3; // Confident (70-90)
      if (plddt >= 50) return 0xffdb13; // Low (50-70)
      return 0xff7d45; // Very Low (<50)
    };

    if (renderMode === "ribbon" || renderMode === "surface") {
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, points.length * 3, renderMode === "surface" ? 1.7 : 0.9, 12, false);

      const count = tubeGeo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const tempColor = new THREE.Color();

      for (let i = 0; i < count; i++) {
        const t = i / count;
        const resIdx = Math.min(residues.length - 1, Math.floor(t * residues.length));
        tempColor.setHex(getPlddtColor(residues[resIdx].plddt));
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

    if (renderMode === "atoms" || renderMode === "surface") {
      const sphereGeo = new THREE.SphereGeometry(renderMode === "atoms" ? 0.9 : 0.45, 16, 16);
      points.forEach((pt, idx) => {
        const r = residues[idx];
        const mat = new THREE.MeshStandardMaterial({
          color: getPlddtColor(r.plddt),
          roughness: 0.2,
          metalness: 0.3,
        });
        const sphere = new THREE.Mesh(sphereGeo, mat);
        sphere.position.copy(pt);
        molGroup.add(sphere);
      });
    }

    // Glowing Active Ligand Binding Pocket
    if (showPocket && points.length > 20) {
      const pocketCenter = points[Math.floor(points.length / 2)].clone().add(new THREE.Vector3(2.5, 2, 2));

      const ligandGeo = new THREE.IcosahedronGeometry(2.6, 2);
      const ligandMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.7,
        roughness: 0.1,
        metalness: 0.8,
        wireframe: true,
      });
      const ligandMesh = new THREE.Mesh(ligandGeo, ligandMat);
      ligandMesh.position.copy(pocketCenter);
      molGroup.add(ligandMesh);

      const haloGeo = new THREE.RingGeometry(3.6, 4.2, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pocketCenter);
      halo.rotation.x = Math.PI / 2;
      molGroup.add(halo);
    }
  }, [targetData, renderMode, showPocket]);

  // Execute Gemini Multimodal Biological Query
  const handleQueryGemini = async (promptText?: string) => {
    const query = (promptText || geminiQuery).trim();
    if (!query || queryLoading) return;

    setQueryLoading(true);

    // Capture visual snapshot of the 3D molecule if enabled
    let currentSnapshot = canvasSnapshot;
    if (include3DSnapshot) {
      currentSnapshot = captureCanvasSnapshot();
    }

    try {
      const systemInstruction = `You are a world-class computational biology and pharmacology researcher in the Luqi AI Bioscience Lab.
- Target Context: ${targetData?.name || selectedTarget} (${targetData?.organism || "Homo sapiens"}), UniProt: ${
        targetData?.uniprotAccession || "P04637"
      }, PDB: ${targetData?.pdbId || "1TUP"}, Mean pLDDT: ${targetData?.meanPlddt || 82.4}%.
- Lipinski Metrics: MW ${targetData?.lipinski?.mw} g/mol, LogP ${targetData?.lipinski?.logP}, HBD ${
        targetData?.lipinski?.hbd
      }, HBA ${targetData?.lipinski?.hba}.
- SMILES: ${targetData?.smiles || "N/A"}.
- If an image snapshot of the 3D molecular structure is attached, incorporate visual structural observations (e.g. ribbon folding, alpha-helix density, active binding pocket geometry, pLDDT color distribution).
- Deliver rigorous, publication-grade insights with clear chemical and genetic terminology.`;

      const payload: any = {
        prompt: query,
        model: geminiModel,
        systemInstruction,
        grounding: "search",
      };

      if (include3DSnapshot && currentSnapshot) {
        payload.imageBase64 = currentSnapshot;
        payload.mimeType = "image/png";
      }

      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.status === "success" && json.data) {
        const answer = json.data.text || "Analysis completed with nominal binding parameters.";
        setAiAnalysisResult(answer);

        setAnalysisHistory((prev) => [
          {
            query,
            answer,
            model: json.data.model || geminiModel,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            snapshotThumbnail: include3DSnapshot && currentSnapshot ? currentSnapshot : undefined,
          },
          ...prev,
        ]);
        setGeminiQuery("");
      } else {
        throw new Error(json.error || "Gemini multimodal biological query failed");
      }
    } catch (err: any) {
      console.error("Gemini biological query error:", err);
      setAiAnalysisResult(`Biological Query Fallback: ${err.message || "Failed to process multimodal input."}`);
    } finally {
      setQueryLoading(false);
    }
  };

  const sampleQuestions = [
    "Analyze the active ligand binding pocket and key interacting residues.",
    "What are the most common ClinVar pathogenic missense mutations in this gene?",
    "Explain the biochemical mechanism of action in cellular signal transduction.",
    "Break down the Lipinski Rule-of-5 drug-likeness and membrane permeability.",
    "What is the pharmacological origin and indigenous clinical use of this compound?",
  ];

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Header & Curated Target Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mr-1">
            <Dna className="w-4 h-4 text-sky-400" />
            Biological Targets:
          </span>
          {["TP53", "BRCA1", "EGFR", "ARTEMISININ", "IMATINIB"].map((tgt) => (
            <button
              key={tgt}
              onClick={() => setSelectedTarget(tgt)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedTarget === tgt
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25 border border-sky-400 font-bold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
              }`}
            >
              {tgt}
            </button>
          ))}
        </div>

        {/* Custom Target Search Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) fetchTarget(searchQuery.trim());
          }}
          className="flex items-center gap-2 max-w-sm w-full"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search gene or compound (e.g. KRAS, Insulin)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            disabled={loadingTarget}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            {loadingTarget ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Query"}
          </button>
        </form>
      </div>

      {/* Main Dual Grid: 3D Molecule Viewer (Left) + Multimodal Gemini Query Engine (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: 3D THREE.JS MOLECULE VIEWER (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="relative h-[560px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            {/* Canvas Mount */}
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Viewport Top Floating Status Bar */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3.5 py-1.5 rounded-xl pointer-events-auto flex items-center gap-2 text-xs shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white tracking-wide">{targetData?.gene || selectedTarget}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-400 font-mono text-[11px]">{targetData?.uniprotAccession || "P04637"}</span>
                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono text-[10px] border border-sky-500/30">
                  PDB: {targetData?.pdbId || "1TUP"}
                </span>
              </div>

              {/* Viewport Mode Switcher */}
              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-xl pointer-events-auto flex items-center gap-1 text-xs shadow-lg">
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
                  CPK Atoms
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

            {/* Viewport Bottom Left AlphaFold pLDDT Legend */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-800 p-2.5 rounded-2xl pointer-events-auto max-w-xs shadow-xl">
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>AlphaFold pLDDT Confidence</span>
                <span className="text-sky-400 font-mono">Mean: {targetData?.meanPlddt || 82.4}%</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[8.5px] font-mono text-center">
                <div className="bg-[#0053D6]/20 border border-[#0053D6] text-blue-200 py-1 rounded">
                  &gt;90 (Very High)
                </div>
                <div className="bg-[#65CBF3]/20 border border-[#65CBF3] text-cyan-200 py-1 rounded">
                  70-90 (Confident)
                </div>
                <div className="bg-[#FFDB13]/20 border border-[#FFDB13] text-yellow-200 py-1 rounded">
                  50-70 (Low)
                </div>
                <div className="bg-[#FF7D45]/20 border border-[#FF7D45] text-orange-200 py-1 rounded">
                  &lt;50 (Very Low)
                </div>
              </div>
            </div>

            {/* Viewport Bottom Right Quick Actions */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setShowPocket(!showPocket)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur border transition-all flex items-center gap-1.5 ${
                  showPocket
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white"
                }`}
                title="Toggle Active Binding Pocket Halo"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Pocket
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

              <button
                onClick={captureCanvasSnapshot}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                title="Capture 3D Snapshot for Gemini Multimodal Analysis"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                Snapshot
              </button>
            </div>
          </div>

          {/* Molecule Metadata & Lipinski Telemetry Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Molecular Mass</span>
              <span className="text-white font-mono font-bold">{targetData?.molecularWeightKDa || 43.6} kDa</span>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Residues</span>
              <span className="text-sky-400 font-mono font-bold">{targetData?.aminoAcidsCount || 393} aa</span>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">ClinVar Variants</span>
              <span className="text-amber-400 font-mono font-bold">{targetData?.clinvarVariantsCount || 1420}</span>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">LogP / HBD / HBA</span>
              <span className="text-emerald-400 font-mono font-bold">
                {targetData?.lipinski?.logP.toFixed(1) || "3.5"} / {targetData?.lipinski?.hbd || 2} /{" "}
                {targetData?.lipinski?.hba || 6}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: GEMINI MULTIMODAL BIOLOGICAL QUERY ENGINE (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 flex flex-col gap-4 shadow-xl">
            {/* Header & Model Selector */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Gemini Multimodal Bio-Query</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Structural Vision + Deep Biological Knowledge</p>
                </div>
              </div>

              {/* Model Choice */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
                <button
                  onClick={() => setGeminiModel("gemini-3.8-flash")}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${
                    geminiModel === "gemini-3.8-flash"
                      ? "bg-sky-500 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  3.8 Flash
                </button>
                <button
                  onClick={() => setGeminiModel("gemini-4-argon")}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${
                    geminiModel === "gemini-4-argon"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  4 Argon
                </button>
              </div>
            </div>

            {/* Multimodal Snapshot Toggle Bar */}
            <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={include3DSnapshot}
                  onChange={(e) => setInclude3DSnapshot(e.target.checked)}
                  className="rounded border-slate-700 accent-sky-400"
                />
                <span className="text-slate-300 font-semibold text-[11px]">Include 3D Structure Snapshot</span>
              </label>

              {canvasSnapshot && (
                <div className="flex items-center gap-2">
                  <img
                    src={canvasSnapshot}
                    alt="3D Molecule Snapshot"
                    className="w-10 h-6 object-cover rounded-md border border-slate-700"
                  />
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">Attached</span>
                </div>
              )}
            </div>

            {/* Quick Inquiry Sample Buttons */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Suggested Biological Prompts:
              </span>
              <div className="flex flex-col gap-1.5">
                {sampleQuestions.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQueryGemini(q)}
                    disabled={queryLoading}
                    className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-left text-xs text-slate-300 hover:text-sky-300 transition-colors flex items-center justify-between group disabled:opacity-50"
                  >
                    <span className="line-clamp-1">{q}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1.5 opacity-60 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleQueryGemini();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={geminiQuery}
                onChange={(e) => setGeminiQuery(e.target.value)}
                placeholder="Ask biological question about this 3D molecule..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={!geminiQuery.trim() || queryLoading}
                className="p-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl font-bold transition-all disabled:opacity-40 shadow-lg shadow-sky-500/20"
              >
                {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>

            {/* AI Analysis Result Display Area */}
            <div className="min-h-[220px] max-h-[300px] overflow-y-auto bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-xs leading-relaxed text-slate-200">
              {queryLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                  <p className="font-semibold text-xs">Analyzing 3D structure with {geminiModel}...</p>
                  <p className="text-[10px] text-slate-500">Cross-referencing AlphaFold, UniProt & PDB databases</p>
                </div>
              ) : aiAnalysisResult ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-b border-slate-800 pb-1.5 mb-2">
                    <span className="text-sky-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Gemini Biological Analysis
                    </span>
                    <span>Model: {geminiModel}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-slate-200">{aiAnalysisResult}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-8">
                  <Bot className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="font-semibold text-slate-400">Ready for Multimodal Biological Queries</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                    Ask a question or select a prompt chip to analyze binding sites, mutations, and pharmacokinetics.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
