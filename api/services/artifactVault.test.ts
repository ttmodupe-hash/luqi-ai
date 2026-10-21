import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("artifact vault persistent recovery", () => {
  const originalRoot = process.env.LUQI_ARCHIVE_PATH;
  let root: string;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "luqi-archive-test-"));
    process.env.LUQI_ARCHIVE_PATH = root;
    vi.resetModules();
  });

  afterAll(() => {
    if (originalRoot === undefined) delete process.env.LUQI_ARCHIVE_PATH;
    else process.env.LUQI_ARCHIVE_PATH = originalRoot;
    vi.resetModules();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("recovers real artifacts after module reload but excludes missing or modified files", async () => {
    const vault = await import("./artifactVault");
    expect((await vault.listArchivedArtifacts()).totalCount).toBe(0);
    const stored = await vault.archiveArtifact({
      fileName: "reconciliation.json",
      fileType: "json",
      content: Buffer.from('{"approved":false}'),
      taskOutput: { agentRole: "Test", taskName: "Durable archive check", status: "completed" },
    });

    expect((await vault.listArchivedArtifacts()).totalCount).toBe(1);
    vi.resetModules();
    const recovered = await import("./artifactVault");
    expect((await recovered.listArchivedArtifacts()).artifacts[0].sha256).toBe(stored.sha256);

    fs.writeFileSync(stored.filePath, "modified content");
    expect((await recovered.listArchivedArtifacts()).totalCount).toBe(0);
    fs.writeFileSync(stored.filePath, '{"approved":false}');
    expect((await recovered.listArchivedArtifacts()).totalCount).toBe(1);
    fs.unlinkSync(stored.filePath);
    expect((await recovered.listArchivedArtifacts()).totalCount).toBe(0);
  });

  it("rejects empty content instead of manufacturing an artifact", async () => {
    const { archiveArtifact } = await import("./artifactVault");
    await expect(archiveArtifact({
      fileName: "empty.json",
      fileType: "json",
      content: "",
      taskOutput: { agentRole: "Test", taskName: "Reject empty", status: "completed" },
    })).rejects.toThrow(/nonempty/);
  });

  it("ignores invalid metadata and never trusts metadata-supplied paths", async () => {
    const vault = await import("./artifactVault");
    const artifact = await vault.archiveArtifact({
      fileName: "safe.txt",
      fileType: "report",
      content: "genuine",
      taskOutput: { agentRole: "Test", taskName: "Path verification", status: "completed" },
    });
    const metadata = JSON.parse(fs.readFileSync(artifact.metadataPath, "utf8"));
    metadata.filePath = "/tmp/attacker-controlled";
    fs.writeFileSync(artifact.metadataPath, JSON.stringify(metadata));
    const listed = await vault.listArchivedArtifacts({ fileType: "report" });
    expect(listed.artifacts.find((a) => a.artifactId === artifact.artifactId)?.filePath).toBe(artifact.filePath);
    fs.writeFileSync(artifact.metadataPath, "{not-json");
    expect((await vault.listArchivedArtifacts({ fileType: "report" })).totalCount).toBe(0);
  });
});
