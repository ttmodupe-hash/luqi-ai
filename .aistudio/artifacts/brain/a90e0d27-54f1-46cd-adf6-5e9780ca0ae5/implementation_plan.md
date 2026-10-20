# Luqi AI Sovereign Multimodal & Bioscience 3D Innovation Architecture

A comprehensive expansion of the Luqi AI sovereign platform integrating DeepMind Science bioinformatics, procedural Three.js 3D spatial environments, and the Google Gemini multimodal model family into a unified experiential intelligence suite.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **User-Confirmed Architectural Mandate**: Based on the Phase 1 consultation, all capabilities will be delivered in an integrated, multi-tier layout:
> 1. **Unified Multimodal Innovation Hub (`/multimodal-hub`)**: Central command center providing instant access to all specialized studios (Bioscience 3D, Live Voice, Video & Image Studio, Search/Maps Grounding).
> 2. **Dual Three.js 3D Environments**: 
>    - **3D Molecular Bioscience & Drug Discovery Explorer** (AlphaFold pLDDT, PDB crystal structures, binding pockets, 2D SMILES, and Lipinski metrics).
>    - **3D Procedural STEM Physics & Robotics Laboratory** (multi-part robot tutor, harmonic mechanical kinematics, and studio PBR lighting).
> 3. **Persistent Omnipresent Voice & Live Conversation Suite**:
>    - A global floating live voice copilot (`gemini-3.8-live` & audio transcription `gemini-3.5-transcribe`) accessible from any page.
>    - A dedicated full-screen conversational laboratory with real-time audio waveforms and multi-turn role switching (`gemini-4-argon`, `gemini-3.8-flash`, `gemini-3.1-flash-lite`).

---

### 1. Overview & Core Concept

- **What It Does**: Upgrades Luqi AI into a next-generation Pan-African and global research platform combining computational biology, procedural 3D graphics, live vocal interaction, generative video (Veo 3), and multi-engine grounded intelligence.
- **Target Audience / Persona**: High school and university STEM students, African biotechnology researchers, educators, and engineers requiring offline-first numerical rigor and cutting-edge generative AI.
- **Key Value**: Replaces fragmented single-purpose tools with a sovereign, high-contrast, publication-grade workbench with zero external 404 dependencies, guaranteed 60fps WebGL execution, and native African multilingual voice capabilities.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Bioscience Exploration Flow**: User selects or queries a target protein/gene (e.g., `TP53`, `BRCA1`, `EGFR`, `Imatinib`) ➔ System queries AlphaFold DB / PDB / UniProt / PubChem ➔ 3D viewer renders interactive molecular structure colored by AlphaFold pLDDT confidence (Very High >90, Confident 70-90, Low 50-70, Very Low <50) with synchronized clinical variant and pathway inspector.
2. **Procedural 3D Physics & Robotics Flow**: User toggles to the 3D Physics Lab ➔ Full-bleed Three.js viewport renders a composite 8-part articulated robotic tutor demonstrating mechanical physics under studio PBR lighting (`ACESFilmicToneMapping`, `RoomEnvironment`) with a collapsible bottom control dock.
3. **Live Voice & Audio Transcription Flow**: User clicks the microphone icon in the header or floating dock ➔ Real-time voice interaction begins via `gemini-3.8-live` with visual audio oscilloscope ➔ Live speech transcription powered by `gemini-3.5-transcribe` outputs real-time notes with one-click export.
4. **Generative Multimodal Studio Flow**: User inputs a scientific prompt or uploads a reference photo ➔ Generates high-fidelity images with `gemini-nano-banana-2.1` or renders high-definition scientific animation videos via Veo 3 (`veo-3.1-fast-generate-preview`) in landscape (16:9) or portrait (9:16).
5. **Grounded Multi-Turn Chat Flow**: User engages with domain-specialized bots with explicit role directives, dynamically switching between `gemini-4-argon` (complex derivations), `gemini-3.8-flash` (general inquiry with live Google Search / Google Maps grounding), and `gemini-3.1-flash-lite` (rapid calculations).

#### Visual Identity & Theme
- **Aesthetic Direction**: High-contrast scientific laboratory workbench with obsidian viewports. Clean, calibrated, publication-grade instrumentation avoiding neon cliches or static pill clutter.
- **Color Palette (60-30-10 Rule)**:
  - `60% Dominant Canvas`: Obsidian Void (`#020617` / `#090D16`) for 3D viewports; Clinical Crisp Slate (`#0B0F19`) for UI containers.
  - `30% Structural Panels`: Flat slate panels (`#111827`), hairline dividers (`#1E293B`), and coordinate axes.
  - `10% Telemetry Accents`: DeepMind Scientific Blue (`#1A73E8`), Telemetry Amber (`#F59E0B`), and Laser Cyan (`#06B6D4`).
- **Typography & Precision Notation**:
  - Interface Headers & Brand: `Plus Jakarta Sans` with balanced line wraps.
  - Numeric Telemetry & Coordinates: `JetBrains Mono` / `font-mono tabular-nums`.
  - Canonical 4-Band AlphaFold Scale: `#0053D6` (Very High), `#65CBF3` (Confident), `#FFDB13` (Low), `#FF7D45` (Very Low).
- **Layout Ergonomics**:
  - Full-bleed 3D canvas with a collapsible bottom control dock (`<= 15%` viewport footprint) ensuring zero viewport occlusion of primary models.
  - Single-line controls with truncation safeguards and accessible touch targets.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual 3D Three.js Architecture (Bioscience + Robotic Physics)**
  - *Chosen Approach*: Implement a procedural 3D rendering pipeline in Three.js featuring both an atomistic/ribbon molecular geometry builder and a composite 8-part mechanical robotic tutor.
  - *Why*: Gives users both micro-scale biological exploration and macro-scale physical mechanics in the same zero-dependency WebGL engine without external heavy model downloads.
- **Decision 2: Server-Side Gemini API Proxy Routing**
  - *Chosen Approach*: All calls to Gemini models (`gemini-4-argon`, `gemini-3.8-flash`, `gemini-nano-banana-2.1`, `veo-3.1-fast-generate-preview`, `gemini-3.8-live`, `gemini-3.5-transcribe`) route through authenticated `/api/gemini/*` endpoints on the server.
  - *Why*: Adheres strictly to security guidelines (no API key leakage to browser), provides unified rate-limit buffering, and enables server-side tool hybrid mode (Google Search + Google Maps grounding).
- **Decision 3: Zero-External-Asset Three.js Guarantee**
  - *Chosen Approach*: Generate all textures, normal maps, and bump surfaces procedurally using HTML5 2D Canvas and `PMREMGenerator` + `RoomEnvironment`.
  - *Why*: Guarantees the application runs 100% offline on local African school servers with zero 404 image or HDR texture errors.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LUQI AI GLOBAL NAVIGATION HEADER                      │
│   Brand Wordmark  │  Nav Links (STEM, LuqiToons, Radar, Archive)  │ 22-Lang │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    UNIFIED MULTIMODAL HUB & STUDIOS                         │
│                                                                             │
│  ┌──────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │   3D BIOSCIENCE STUDIO   │  │        3D STEM ROBOTICS STUDIO          │  │
│  │  - AlphaFold pLDDT Viewer│  │  - 8-Part Procedural Robot Tutor        │  │
│  │  - RCSB PDB Structure    │  │  - Harmonic Pendulum Kinematics         │  │
│  │  - PubChem / SMILES 2D   │  │  - Studio PBR Lighting & Softboxes      │  │
│  │  - ClinVar / PubMed Sync │  │  - Collapsible Bottom Cinema Dock       │  │
│  └─────────────┬────────────┘  └────────────────────┬────────────────────┘  │
│                │                                    │                       │
│  ┌─────────────▼────────────────────────────────────▼────────────────────┐  │
│  │               GEMINI MULTIMODAL INTELLIGENCE ENGINE                   │  │
│  │  - Live Voice Copilot (gemini-3.8-live + WebSocket Audio Stream)     │  │
│  │  - Audio Transcription (gemini-3.5-transcribe + Mic Input)           │  │
│  │  - Image Studio (gemini-nano-banana-2.1 Text-to-Image / Editing)     │  │
│  │  - Veo 3 Video Studio (veo-3.1-fast-generate-preview 16:9 & 9:16)    │  │
│  │  - Multi-Turn Chat (gemini-4-argon / gemini-3.8-flash / flash-lite)   │  │
│  │  - Grounding Tools (Google Search & Google Maps Tool Integration)     │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     HONO / EXPRESS SERVER-SIDE PROXY                        │
│   /api/gemini/generate  │  /api/gemini/image  │  /api/gemini/video          │
│   /api/gemini/live-ws   │  /api/gemini/audio  │  /api/science/bio-query     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & State Mapping
- **Protein/Gene Query State**: `accession`, `geneSymbol`, `plddtScores`, `structureCoordinates`, `variants`, `citationList`.
- **Three.js Scene State**: `activeMode` ("bioscience" | "physics"), `cameraPreset`, `pbrSettings` (`metalness`, `roughness`, `exposure`), `playbackSpeed`, `dockCollapsed`.
- **Voice & Live Audio State**: `isLiveConnected`, `audioInputBuffer`, `transcriptionHistory`, `activeVoicePersona` ("Zephyr" | "Puck" | "Kore").
- **Veo / Image Generation State**: `operationId`, `generationProgress`, `mediaUrl`, `aspectRatio` ("16:9" | "9:16"), `model` ("veo-3.1-fast-generate-preview" | "gemini-nano-banana-2.1").
- **Chat State**: `messages` (`role`, `content`, `groundingMetadata`), `selectedModel` ("gemini-4-argon" | "gemini-3.8-flash" | "gemini-3.1-flash-lite"), `activeGrounding` ("search" | "maps" | "none").

#### Interactive Component Mapping
1. `src/pages/MultimodalHubPage.tsx`: Primary launchpad with tabbed navigation across Bioscience 3D, Live Audio, Veo Video, and Grounded Reasoning.
2. `src/components/Bioscience3DViewer.tsx`: Dedicated Three.js canvas rendering ribbon and atomistic models with pLDDT 4-band coloring, synchronized with UniProt/AlphaFold/PubMed data panels.
3. `src/components/PhysicsRobotics3DViewer.tsx`: Three.js procedural multi-part articulated robotic tutor with collapsible bottom dock.
4. `src/components/LiveVoiceFloatingCopilot.tsx`: Global floating audio orb connecting to `gemini-3.8-live` with real-time waveform visualization and `gemini-3.5-transcribe` speech capture.
5. `src/components/VeoVideoImageStudio.tsx`: Dual generative pane for `gemini-nano-banana-2.1` image creation/editing and `veo-3.1-fast-generate-preview` text-to-video / image-to-video.
6. `src/components/GroundedGeminiChat.tsx`: Multi-turn chat interface with role selection, search grounding, and maps grounding.
7. `api/geminiService.ts`: Centralized server-side SDK service initializing `@google/genai` with `User-Agent: aistudio-build`.
