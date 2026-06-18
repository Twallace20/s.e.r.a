import path from "node:path";
import { isPathInside, redactSecrets, SeraSafetyEvent, isoNow } from "@sera/shared";

export interface SafetyPolicyOptions {
  workspaceDir: string;
  allowedCommands?: string[];
  allowInternet?: boolean;
  requireApprovalForDestructiveActions?: boolean;
}

export interface SafetyDecision {
  decision: "allow" | "block" | "approval_required";
  reason: string;
  policy: string;
  target?: string;
}

const destructiveCommands = new Set(["rm", "del", "erase", "rmdir", "format", "powershell", "pwsh"]);

export class SafetyPolicy {
  readonly workspaceDir: string;
  readonly allowedCommands: Set<string>;
  readonly allowInternet: boolean;
  readonly requireApprovalForDestructiveActions: boolean;

  constructor(options: SafetyPolicyOptions) {
    this.workspaceDir = path.resolve(options.workspaceDir);
    this.allowedCommands = new Set(options.allowedCommands ?? ["node", "npm"]);
    this.allowInternet = options.allowInternet ?? false;
    this.requireApprovalForDestructiveActions = options.requireApprovalForDestructiveActions ?? true;
  }

  canWritePath(targetPath: string): SafetyDecision {
    const resolved = path.resolve(targetPath);
    if (!isPathInside(this.workspaceDir, resolved)) {
      return {
        decision: "block",
        reason: "Writes are restricted to the active S.E.R.A. workspace.",
        policy: "workspace_boundary_v1",
        target: resolved
      };
    }
    return {
      decision: "allow",
      reason: "Path is inside the active workspace.",
      policy: "workspace_boundary_v1",
      target: resolved
    };
  }

  canRunCommand(command: string): SafetyDecision {
    const normalized = path.basename(command).toLowerCase().replace(/\.(cmd|exe)$/i, "");
    if (destructiveCommands.has(normalized) && this.requireApprovalForDestructiveActions) {
      return {
        decision: "approval_required",
        reason: `Command '${command}' is destructive or high-risk and requires explicit approval.`,
        policy: "command_approval_v1",
        target: command
      };
    }
    if (!this.allowedCommands.has(normalized)) {
      return {
        decision: "block",
        reason: `Command '${command}' is not in the allowlist.`,
        policy: "command_allowlist_v1",
        target: command
      };
    }
    return {
      decision: "allow",
      reason: `Command '${command}' is allowlisted.`,
      policy: "command_allowlist_v1",
      target: command
    };
  }

  canUseInternet(): SafetyDecision {
    if (!this.allowInternet) {
      return {
        decision: "block",
        reason: "Internet access is disabled by default in the secure base.",
        policy: "internet_default_off_v1"
      };
    }
    return {
      decision: "allow",
      reason: "Internet access enabled by policy.",
      policy: "internet_default_off_v1"
    };
  }

  redact(input: unknown): string {
    return redactSecrets(input);
  }

  toSafetyEvent(runId: string, decision: SafetyDecision): SeraSafetyEvent {
    return {
      ts: isoNow(),
      runId,
      decision: decision.decision,
      reason: decision.reason,
      target: decision.target,
      policy: decision.policy
    };
  }
}
