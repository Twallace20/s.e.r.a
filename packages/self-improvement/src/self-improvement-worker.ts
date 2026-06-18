import path from "node:path";
import { ArtifactStore } from "@sera/artifacts";
import { SafetyPolicy } from "@sera/safety";
import { createSeraId, isoNow, SeraStatus } from "@sera/shared";
import {
  DeveloperPatchOperation,
  DeveloperPatchResult,
  DeveloperValidationContext,
  DeveloperValidationResult,
  DeveloperWorker
} from "@sera/workers";

export type SelfImprovementMode = "propose" | "apply";
export type SelfImprovementGateStatus = "not_run" | "passed" | "failed" | "blocked";

export interface SelfImprovementInput {
  runId: string;
  projectRoot: string;
  goal: string;
  relativePath: string;
  operations: DeveloperPatchOperation[];
  mode: SelfImprovementMode;
  artifacts: ArtifactStore;
  safety: SafetyPolicy;
  validate?: (context: DeveloperValidationContext) => DeveloperValidationResult;
  validationDescription?: string;
}

export interface SelfImprovementRecord {
  id: string;
  createdAt: string;
  finishedAt: string;
  mode: SelfImprovementMode;
  goal: string;
  relativePath: string;
  operationCount: number;
  decision: "proposed" | "applied" | "blocked" | "failed" | "no_op";
  validationRequired: boolean;
  validationDescription?: string;
  validationGate: {
    status: SelfImprovementGateStatus;
    message: string;
  };
  inspection: {
    ok: boolean;
    status: SeraStatus;
    artifactPath?: string;
    sha256?: string;
    message: string;
  };
  patch: {
    ok: boolean;
    status: SeraStatus;
    changed: boolean;
    restored?: boolean;
    totalOccurrences: number;
    patchArtifactPath?: string;
    backupPath?: string;
    message: string;
  };
}

export interface SelfImprovementResult {
  ok: boolean;
  status: SeraStatus;
  mode: SelfImprovementMode;
  goal: string;
  relativePath: string;
  changed: boolean;
  restored?: boolean;
  message: string;
  recordPath?: string;
  inspectionArtifactPath?: string;
  patchArtifactPath?: string;
  backupPath?: string;
  validationGate: {
    status: SelfImprovementGateStatus;
    message: string;
  };
  patch?: DeveloperPatchResult;
}

export class SelfImprovementWorker {
  run(input: SelfImprovementInput): SelfImprovementResult {
    const worker = new DeveloperWorker();
    const inspection = worker.inspect({
      runId: input.runId,
      projectRoot: input.projectRoot,
      relativePath: input.relativePath,
      artifacts: input.artifacts,
      safety: input.safety
    });

    if (!inspection.ok) {
      return this.writeRecord(input, {
        status: "blocked",
        changed: false,
        message: inspection.message,
        inspection,
        patch: this.emptyPatch(input, "blocked", inspection.message),
        validationGate: { status: "blocked", message: "Inspection blocked before patch planning." }
      });
    }

    if (input.mode === "apply" && !input.validate) {
      return this.writeRecord(input, {
        status: "blocked",
        changed: false,
        message: "Self-improvement apply mode requires a validation gate. Refusing uncertified self-modification.",
        inspection,
        patch: this.emptyPatch(input, "blocked", "Validation gate is required before applying self-improvement."),
        validationGate: { status: "blocked", message: "Validation gate is required before applying self-improvement." }
      });
    }

    const patch = worker.patch({
      runId: input.runId,
      projectRoot: input.projectRoot,
      relativePath: input.relativePath,
      operations: input.operations,
      mode: input.mode === "propose" ? "suggested" : "direct",
      artifacts: input.artifacts,
      safety: input.safety,
      validate: input.validate
    });

    const validationGate = this.validationGateFor(input, patch);
    return this.writeRecord(input, {
      status: patch.status,
      changed: patch.changed,
      restored: patch.restored,
      message: this.messageFor(input, patch, validationGate),
      inspection,
      patch,
      validationGate
    });
  }

  private emptyPatch(input: SelfImprovementInput, status: SeraStatus, message: string): DeveloperPatchResult {
    return {
      ok: false,
      status,
      mode: input.mode === "propose" ? "suggested" : "direct",
      relativePath: input.relativePath,
      changed: false,
      totalOccurrences: 0,
      operationCount: input.operations.length,
      message
    };
  }

  private validationGateFor(input: SelfImprovementInput, patch: DeveloperPatchResult): SelfImprovementResult["validationGate"] {
    if (input.mode === "propose") {
      return { status: "not_run", message: "Proposal mode does not run a validation gate because source was not modified." };
    }
    if (patch.status === "failed" && patch.restored) {
      return { status: "failed", message: patch.validation?.message ?? patch.message };
    }
    if (!patch.changed) {
      return { status: patch.status === "blocked" ? "blocked" : "not_run", message: patch.message };
    }
    if (!patch.validation) {
      return { status: "blocked", message: "No validation result was produced for applied self-improvement." };
    }
    return patch.validation.ok
      ? { status: "passed", message: patch.validation.message }
      : { status: "failed", message: patch.validation.message };
  }

  private messageFor(
    input: SelfImprovementInput,
    patch: DeveloperPatchResult,
    validationGate: SelfImprovementResult["validationGate"]
  ): string {
    if (input.mode === "propose" && patch.ok) {
      return "Self-improvement proposal created. Source file was not modified.";
    }
    if (input.mode === "apply" && patch.ok && validationGate.status === "passed") {
      return "Self-improvement applied and validation gate passed.";
    }
    if (input.mode === "apply" && patch.restored) {
      return `Self-improvement failed validation and was rolled back. ${validationGate.message}`.trim();
    }
    return patch.message;
  }

  private writeRecord(
    input: SelfImprovementInput,
    state: {
      status: SeraStatus;
      changed: boolean;
      restored?: boolean;
      message: string;
      inspection: {
        ok: boolean;
        status: SeraStatus;
        artifactPath?: string;
        sha256?: string;
        message: string;
      };
      patch: DeveloperPatchResult;
      validationGate: SelfImprovementResult["validationGate"];
    }
  ): SelfImprovementResult {
    const decision: SelfImprovementRecord["decision"] =
      state.status === "blocked" ? "blocked" :
      state.status === "failed" ? "failed" :
      state.status === "no_op" ? "no_op" :
      input.mode === "propose" ? "proposed" : "applied";

    const record: SelfImprovementRecord = {
      id: createSeraId("self_improvement"),
      createdAt: isoNow(),
      finishedAt: isoNow(),
      mode: input.mode,
      goal: input.goal,
      relativePath: input.relativePath,
      operationCount: input.operations.length,
      decision,
      validationRequired: input.mode === "apply",
      validationDescription: input.validationDescription,
      validationGate: state.validationGate,
      inspection: {
        ok: state.inspection.ok,
        status: state.inspection.status,
        artifactPath: state.inspection.artifactPath,
        sha256: state.inspection.sha256,
        message: state.inspection.message
      },
      patch: {
        ok: state.patch.ok,
        status: state.patch.status,
        changed: state.patch.changed,
        restored: state.patch.restored,
        totalOccurrences: state.patch.totalOccurrences,
        patchArtifactPath: state.patch.patchArtifactPath,
        backupPath: state.patch.backupPath,
        message: state.patch.message
      }
    };

    const recordPath = input.artifacts.writeJson(path.join("artifacts", "self-improvement", "record.json"), record);
    input.artifacts.appendJsonl("steps.jsonl", {
      ts: isoNow(),
      runId: input.runId,
      step: input.mode === "propose" ? "self_improvement_proposal" : "self_improvement_apply",
      status: state.status,
      decision,
      validationGate: state.validationGate.status,
      recordPath
    });

    return {
      ok: state.status !== "blocked" && state.status !== "failed",
      status: state.status,
      mode: input.mode,
      goal: input.goal,
      relativePath: input.relativePath,
      changed: state.changed,
      restored: state.restored,
      message: state.message,
      recordPath,
      inspectionArtifactPath: state.inspection.artifactPath,
      patchArtifactPath: state.patch.patchArtifactPath,
      backupPath: state.patch.backupPath,
      validationGate: state.validationGate,
      patch: state.patch
    };
  }
}
