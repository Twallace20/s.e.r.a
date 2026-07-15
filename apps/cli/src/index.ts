#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { SeraKernel } from "@sera/kernel";
import { RuntimeHost, createRuntimeConfig, loadOrCreateRuntimeIdentity, runRuntimeHostProof } from "@sera/runtime-host";
import { createRuntimeStateConfig, openRuntimeState, runRuntimeStateProof } from "@sera/runtime-state";
import { PersistentRuntimeRecoveryCoordinator, createPersistentRuntimeServices, runPersistentRuntimeRecoveryProof } from "@sera/runtime-recovery";
import { IsolatedExecutionEngine, createIsolatedExecutionRuntimeServices, runIsolatedExecutionProof } from "@sera/execution-engine";
import { EvaluationEngine, runEvaluationEngineProof } from "@sera/evaluation-engine";

function printHelp(): void {
  console.log(`S.E.R.A. CLI

Usage:
  sera run "create hello file"
  sera dev inspect <relative-file>
  sera dev suggest <relative-file> <find-text> <replace-text>
  sera dev apply <relative-file> <find-text> <replace-text>
  sera dev patch suggest <relative-file> <find-text> <replace-text> [expected-occurrences]
  sera dev patch apply <relative-file> <find-text> <replace-text> [expected-occurrences]
  sera dev patch apply-build <relative-file> <find-text> <replace-text> [expected-occurrences]
  sera dev multi-patch suggest <json-file>
  sera dev multi-patch apply-build <json-file>
  sera self propose <relative-file> <find-text> <replace-text> [expected-occurrences]
  sera self apply-cert <relative-file> <find-text> <replace-text> [expected-occurrences]
  sera memory summary
  sera memory runs
  sera memory failures
  sera memory lessons
  sera lessons candidates
  sera lessons inspect <candidate-id>
  sera lessons approve <candidate-id> <rationale>
  sera lessons reject <candidate-id> <rationale>
  sera lessons approved
  sera lessons rejected
  sera lessons decisions
  sera lessons active
  sera lessons rules
  sera lessons activations
  sera lessons activate <approved-lesson-id> <rationale>
  sera lessons deactivate <active-lesson-id> <rationale>
  sera lessons check-rules
  sera tasks create <title> <prompt> [priority]
  sera tasks list [status]
  sera tasks inspect <task-id>
  sera tasks start <task-id> <rationale>
  sera tasks complete <task-id> <summary>
  sera tasks block <task-id> <reason>
  sera tasks cancel <task-id> <reason>
  sera tasks events
  sera tasks summary
  sera knowledge ingest-file <relative-file> [title]
  sera knowledge ingest-dir <relative-dir> [extensions] [limit]
  sera knowledge documents
  sera knowledge chunks [document-id]
  sera knowledge inspect <document-id>
  sera knowledge search <query> [limit]
  sera knowledge summary
  sera models providers
  sera models invoke-mock <prompt>
  sera models requests
  sera models responses
  sera models events
  sera models summary
  sera auto propose <relative-file> <find-text> <replace-text> [expected-occurrences]
  sera auto apply-cert <task-id> <relative-file> <find-text> <replace-text> [expected-occurrences]
  sera auto loops
  sera auto events
  sera auto summary
  sera console status
  sera console health
  sera console report
  sera console history
  sera console summary
  sera repository snapshot
  sera repository truth
  sera control-plane inspect
  sera control-plane run --spec <relative-json-file>
  sera control-plane verify --attempt <attempt-id-or-relative-path>
  sera control-plane closeout --attempt <attempt-id-or-relative-path>
  sera runtime identity
  sera runtime health
  sera runtime start
  sera runtime prove
  sera state init
  sera state inspect
  sera state prove
  sera state integrity
  sera state backup
  sera state export
  sera recovery inspect
  sera recovery scan
  sera recovery prove
  sera recovery pending
  sera recovery decisions
  sera execution policy
  sera execution list
  sera execution inspect <execution-id>
  sera execution prove
  sera evaluation profiles
  sera evaluation list
  sera evaluation inspect <evaluation-id>
  sera evaluation prove
  sera snapshot
  sera truth

NPM examples:
  npm run sera -- run "create hello file"
  npm run sera -- dev inspect README.md
  npm run sera -- dev suggest README.md "old" "new"
  npm run sera -- dev apply examples/demo.txt "old" "new"
  npm run sera -- dev patch suggest README.md "old" "new" 1
  npm run sera -- dev patch apply-build README.md "old" "new" 1
  npm run sera -- dev multi-patch suggest multi-patch.json
  npm run sera -- self propose README.md "old" "new" 1
  npm run sera -- self apply-cert README.md "old" "new" 1
  npm run sera -- memory summary
  npm run sera -- memory failures
  npm run sera -- lessons candidates
  npm run sera -- lessons inspect <candidate-id>
  npm run sera -- lessons approve <candidate-id> "Reviewed and valid."
  npm run sera -- lessons reject <candidate-id> "Not actually a reusable lesson."
  npm run sera -- lessons workbench-write
  npm run sera -- lessons activate <approved-lesson-id> "Use as a regression guardrail."
  npm run sera -- lessons check-rules
  npm run sera -- tasks create "Write first plan" "Draft the first queued task" normal
  npm run sera -- tasks list
  npm run sera -- tasks start queued_task_123 "Begin work."
  npm run sera -- tasks complete queued_task_123 "Finished successfully."
  npm run sera -- knowledge ingest-file README.md "Project README"
  npm run sera -- knowledge search "planner task queue" 5
  npm run sera -- knowledge summary
  npm run sera -- models providers
  npm run sera -- models invoke-mock "Summarize local evidence only."
  npm run sera -- models summary
  npm run sera -- auto propose README.md "old" "new" 1
  npm run sera -- auto apply-cert queued_task_123 README.md "old" "new" 1
  npm run sera -- auto summary
  npm run sera -- console status
  npm run sera -- console report
  npm run sera -- repository snapshot
  npm run sera -- repository truth
  npm run sera -- control-plane inspect
  npm run sera -- control-plane run --spec .sera/control-plane/specs/example.json
  npm run sera -- runtime identity
  npm run sera -- runtime health
  npm run sera -- runtime prove
  npm run sera -- state prove
  npm run sera -- recovery prove
  npm run sera -- execution policy
  npm run sera -- execution prove
  npm run sera -- evaluation profiles
  npm run sera -- evaluation prove

Secure base behavior:
  - runs locally
  - creates .sera-runs/<run-id>/
  - writes evidence artifacts
  - Developer Worker suggested mode does not modify source files
  - Developer Worker direct mode creates backup artifacts before writing
  - Developer Worker patch mode supports expected occurrence checks
  - Multi-File Dev Worker applies coordinated file batches only with backups, validation, and rollback
  - Developer Worker apply-build validates with npm run build and rolls back on failure
  - Self-improvement proposal mode writes evidence without mutating source
  - Self-improvement apply-cert requires npm run certify to pass or rolls back
  - Memory records run history, failure journal entries, and lesson candidates without activating lessons
  - Lesson Review approves or rejects candidates while keeping approved lessons inactive
  - Active Lessons converts approved lessons into auditable regression rules without changing runtime behavior
  - Lesson Review Workbench writes review-only Markdown and JSON packets without approving or activating lessons
  - Recursive Learning records local evidence synthesis cycles without making decisions or changing runtime behavior
  - Planner creates, queues, transitions, and records task history without autonomous execution
  - Knowledge ingestion indexes local files and retrieves lexical evidence without an LLM
  - Model Provider Adapter offers a deterministic local mock provider and blocks external providers by default
  - Local Model Provider v1 registers an optional Ollama local adapter while keeping certification subscription-free
  - Autonomous Dev Loop can propose bounded dev changes and only applies them behind validation gates
  - Operator Console summarizes health, evidence, tasks, knowledge, models, and autonomy from one local command
  - Unified Control Plane coordinates local attempts, stages, gates, evidence, verification, and closeout without shell execution
  - Runtime Host starts local Runtime Services, reports health, preserves installation identity, and shuts down cleanly
  - SQLite Operational State stores durable local command, attempt, gate, evidence, lease, migration, backup, and export records
  - Persistent Runtime Recovery scans interrupted attempts, resumes only certified-safe checkpoints, and blocks uncertain work for review
  - Isolated Execution Engine runs only authorized local workloads in bounded temporary workspaces without shell execution
  - Evaluation Engine evaluates immutable execution evidence with deterministic registered evaluators and preserves Control Plane terminal authority
  - does not require an LLM provider
`);
}

function requireArg(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function parseExpectedOccurrences(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Expected occurrences must be a non-negative integer when supplied.");
  }
  return parsed;
}

function readJsonSpec(relativePath: string): unknown {
  if (relativePath.includes("..") || relativePath.startsWith("/") || /^[A-Za-z]:/.test(relativePath)) {
    throw new Error("Spec path must be repository-relative.");
  }
  return JSON.parse(fs.readFileSync(relativePath, "utf8"));
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }

  const kernel = new SeraKernel({ rootDir: process.cwd() });

  if (cmd === "run") {
    const prompt = rest.join(" ").trim();
    if (!prompt) {
      console.error("Missing task prompt.");
      process.exit(1);
    }

    const result = kernel.runTask(prompt);
    console.log(JSON.stringify({
      ok: result.ok,
      status: result.status,
      message: result.message,
      runDir: result.run.runDir,
      workspaceDir: result.run.workspaceDir
    }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (cmd === "dev") {
    const [modeRaw, ...devRest] = rest;

    if (modeRaw === "inspect") {
      const result = kernel.runDeveloperInspectTask({
        relativePath: requireArg(devRest[0], "relative file path")
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        exists: result.inspection.exists,
        sizeBytes: result.inspection.sizeBytes,
        lineCount: result.inspection.lineCount,
        sha256: result.inspection.sha256,
        artifactPath: result.inspection.artifactPath,
        runDir: result.run.runDir
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (modeRaw === "suggest" || modeRaw === "apply") {
      const [relativePath, find, replaceWith] = devRest;
      const result = kernel.runDeveloperEditTask({
        mode: modeRaw === "suggest" ? "suggested" : "direct",
        relativePath: requireArg(relativePath, "relative file path"),
        find: requireArg(find, "find text"),
        replaceWith: requireArg(replaceWith, "replace text")
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        changed: result.developer.changed,
        occurrences: result.developer.occurrences,
        suggestionPath: result.developer.suggestionPath,
        backupPath: result.developer.backupPath,
        runDir: result.run.runDir
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (modeRaw === "multi-patch") {
      const [multiModeRaw, specPathRaw] = devRest;
      if (multiModeRaw !== "suggest" && multiModeRaw !== "apply-build") {
        throw new Error("Developer multi-patch command must be 'suggest' or 'apply-build'.");
      }
      const specPath = requireArg(specPathRaw, "multi-patch json file");
      const specText = fs.readFileSync(specPath, "utf8");
      const spec = JSON.parse(specText) as { targets?: Array<{ relativePath: string; operations: Array<{ kind: "replace"; find: string; replaceWith: string; expectedOccurrences?: number }> }> };
      const result = kernel.runDeveloperMultiPatchTask({
        mode: multiModeRaw === "suggest" ? "suggested" : "direct",
        targets: spec.targets ?? [],
        validationCommand: multiModeRaw === "apply-build" ? { command: "npm", args: ["run", "build"] } : undefined
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        changed: result.multiPatch.changed,
        fileCount: result.multiPatch.fileCount,
        changedFileCount: result.multiPatch.changedFileCount,
        totalOccurrences: result.multiPatch.totalOccurrences,
        restored: result.multiPatch.restored,
        manifestPath: result.multiPatch.manifestPath,
        files: result.multiPatch.files,
        validation: result.multiPatch.validation,
        runDir: result.run.runDir
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (modeRaw === "patch") {
      const [patchModeRaw, relativePath, find, replaceWith, expectedRaw] = devRest;
      if (patchModeRaw !== "suggest" && patchModeRaw !== "apply" && patchModeRaw !== "apply-build") {
        throw new Error("Developer patch command must be 'suggest', 'apply', or 'apply-build'.");
      }
      const expectedOccurrences = parseExpectedOccurrences(expectedRaw);
      const result = kernel.runDeveloperPatchTask({
        mode: patchModeRaw === "suggest" ? "suggested" : "direct",
        relativePath: requireArg(relativePath, "relative file path"),
        operations: [
          {
            kind: "replace",
            find: requireArg(find, "find text"),
            replaceWith: requireArg(replaceWith, "replace text"),
            expectedOccurrences
          }
        ],
        validationCommand: patchModeRaw === "apply-build" ? { command: "npm", args: ["run", "build"] } : undefined
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        changed: result.patch.changed,
        totalOccurrences: result.patch.totalOccurrences,
        operationCount: result.patch.operationCount,
        patchArtifactPath: result.patch.patchArtifactPath,
        backupPath: result.patch.backupPath,
        restored: result.patch.restored,
        validation: result.patch.validation,
        runDir: result.run.runDir
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    throw new Error("Developer command must be 'inspect', 'suggest', 'apply', 'patch', or 'multi-patch'.");
  }


  if (cmd === "self") {
    const [modeRaw, relativePath, find, replaceWith, expectedRaw] = rest;
    if (modeRaw !== "propose" && modeRaw !== "apply-cert") {
      throw new Error("Self-improvement command must be 'propose' or 'apply-cert'.");
    }
    const expectedOccurrences = parseExpectedOccurrences(expectedRaw);
    const result = kernel.runSelfImprovementTask({
      mode: modeRaw === "propose" ? "propose" : "apply",
      goal: modeRaw === "propose" ? "Create a bounded self-improvement proposal." : "Apply a bounded self-improvement only if certification passes.",
      relativePath: requireArg(relativePath, "relative file path"),
      operations: [
        {
          kind: "replace",
          find: requireArg(find, "find text"),
          replaceWith: requireArg(replaceWith, "replace text"),
          expectedOccurrences
        }
      ],
      validationCommand: modeRaw === "apply-cert" ? { command: "npm", args: ["run", "certify"] } : undefined
    });
    console.log(JSON.stringify({
      ok: result.ok,
      status: result.status,
      message: result.message,
      changed: result.selfImprovement.changed,
      restored: result.selfImprovement.restored,
      validationGate: result.selfImprovement.validationGate,
      recordPath: result.selfImprovement.recordPath,
      inspectionArtifactPath: result.selfImprovement.inspectionArtifactPath,
      patchArtifactPath: result.selfImprovement.patchArtifactPath,
      backupPath: result.selfImprovement.backupPath,
      runDir: result.run.runDir
    }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (cmd === "memory") {
    const [memoryMode] = rest;
    if (memoryMode === "summary") {
      const result = kernel.getMemorySummary();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        memoryDir: result.memoryDir,
        summary: result.summary
      }, null, 2));
      process.exit(0);
    }
    if (memoryMode === "runs" || memoryMode === "failures" || memoryMode === "lessons") {
      const result = kernel.listMemory(memoryMode);
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        memoryDir: result.memoryDir,
        runs: result.runs,
        failures: result.failures,
        lessons: result.lessons
      }, null, 2));
      process.exit(0);
    }
    throw new Error("Memory command must be 'summary', 'runs', 'failures', or 'lessons'.");
  }

  if (cmd === "lessons") {
    const [lessonMode, candidateId, ...reasonParts] = rest;
    if (lessonMode === "candidates" || lessonMode === "approved" || lessonMode === "rejected" || lessonMode === "decisions" || lessonMode === "active" || lessonMode === "rules" || lessonMode === "activations") {
      const result = kernel.listLessons(lessonMode);
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        memoryDir: result.memoryDir,
        candidates: result.candidates,
        approved: result.approved,
        rejected: result.rejected,
        decisions: result.decisions,
        active: result.active,
        rules: result.rules,
        activations: result.activations
      }, null, 2));
      process.exit(0);
    }

    if (lessonMode === "workbench" || lessonMode === "workbench-write") {
      const result = lessonMode === "workbench-write" ? kernel.writeLessonReviewWorkbench() : kernel.getLessonReviewWorkbench();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        memoryDir: result.memoryDir,
        summary: result.report.summary,
        pendingCandidates: result.report.pendingCandidates,
        approvedInactive: result.report.approvedInactive,
        activeLessons: result.report.activeLessons,
        regressionRules: result.report.regressionRules,
        recentDecisions: result.report.recentDecisions,
        activationDecisions: result.report.activationDecisions,
        guardrails: result.report.guardrails,
        nextActions: result.report.nextActions,
        jsonPath: result.jsonPath,
        markdownPath: result.markdownPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (lessonMode === "recursive") {
      const result = kernel.runRecursiveLearningCycle();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        memoryDir: result.memoryDir,
        cycle: result.cycle,
        cyclePath: result.cyclePath,
        summaryPath: result.summaryPath
      }, null, 2));
      process.exit(0);
    }

    if (lessonMode === "recursive-history") {
      const result = kernel.listRecursiveLearningCycles();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        memoryDir: result.memoryDir,
        cycles: result.cycles
      }, null, 2));
      process.exit(0);
    }

    if (lessonMode === "inspect") {
      const result = kernel.inspectLessonCandidate(requireArg(candidateId, "candidate id"));
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        memoryDir: result.memoryDir,
        candidate: result.candidate,
        candidatePath: result.candidatePath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (lessonMode === "approve" || lessonMode === "reject") {
      const rationale = reasonParts.join(" ").trim();
      const result = kernel.reviewLessonCandidate({
        candidateId: requireArg(candidateId, "candidate id"),
        decision: lessonMode === "approve" ? "approved" : "rejected",
        reviewer: "local-user",
        rationale
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        memoryDir: result.memoryDir,
        candidate: result.candidate,
        approvedLesson: result.approvedLesson,
        rejectedLesson: result.rejectedLesson,
        decision: result.decision,
        candidatePath: result.candidatePath,
        approvedLessonPath: result.approvedLessonPath,
        rejectedLessonPath: result.rejectedLessonPath,
        decisionPath: result.decisionPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (lessonMode === "activate") {
      const rationale = reasonParts.join(" ").trim();
      const result = kernel.activateApprovedLesson({
        approvedLessonId: requireArg(candidateId, "approved lesson id"),
        reviewer: "local-user",
        rationale
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        memoryDir: result.memoryDir,
        approvedLesson: result.approvedLesson,
        activeLesson: result.activeLesson,
        regressionRule: result.regressionRule,
        decision: result.decision,
        approvedLessonPath: result.approvedLessonPath,
        activeLessonPath: result.activeLessonPath,
        regressionRulePath: result.regressionRulePath,
        activationDecisionPath: result.activationDecisionPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (lessonMode === "deactivate") {
      const rationale = reasonParts.join(" ").trim();
      const result = kernel.deactivateActiveLesson({
        activeLessonId: requireArg(candidateId, "active lesson id"),
        reviewer: "local-user",
        rationale
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        memoryDir: result.memoryDir,
        approvedLesson: result.approvedLesson,
        activeLesson: result.activeLesson,
        regressionRule: result.regressionRule,
        decision: result.decision,
        approvedLessonPath: result.approvedLessonPath,
        activeLessonPath: result.activeLessonPath,
        regressionRulePath: result.regressionRulePath,
        activationDecisionPath: result.activationDecisionPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (lessonMode === "check-rules") {
      const result = kernel.checkLessonRegressionRules();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        memoryDir: result.memoryDir,
        activeRuleCount: result.activeRuleCount,
        inactiveRuleCount: result.inactiveRuleCount,
        checks: result.checks
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    throw new Error("Lessons command must be 'candidates', 'inspect', 'approve', 'reject', 'approved', 'rejected', 'decisions', 'active', 'rules', 'activations', 'workbench', 'workbench-write', 'recursive', 'recursive-history', 'activate', 'deactivate', or 'check-rules'.");
  }



  if (cmd === "tasks") {
    const [taskMode, taskIdOrTitle, promptOrReason, priorityOrRest, ...taskRest] = rest;

    if (taskMode === "create") {
      const title = requireArg(taskIdOrTitle, "task title");
      const prompt = requireArg(promptOrReason, "task prompt");
      const priorityRaw = priorityOrRest;
      const priority = priorityRaw === "low" || priorityRaw === "normal" || priorityRaw === "high" ? priorityRaw : "normal";
      const result = kernel.createQueuedTask({ title, prompt, priority, requestedBy: "local-user" });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        taskDir: result.taskDir,
        task: result.task,
        event: result.event,
        taskPath: result.taskPath,
        eventPath: result.eventPath,
        summaryPath: result.summaryPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (taskMode === "list") {
      const statusRaw = taskIdOrTitle;
      const allowed = ["queued", "in_progress", "completed", "blocked", "cancelled"];
      if (statusRaw && !allowed.includes(statusRaw)) {
        throw new Error("Task status filter must be queued, in_progress, completed, blocked, or cancelled.");
      }
      const result = kernel.listQueuedTasks(statusRaw as any);
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        taskDir: result.taskDir,
        tasks: result.tasks
      }, null, 2));
      process.exit(0);
    }

    if (taskMode === "inspect") {
      const result = kernel.inspectQueuedTask(requireArg(taskIdOrTitle, "task id"));
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        taskDir: result.taskDir,
        task: result.task,
        taskPath: result.taskPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (taskMode === "start" || taskMode === "complete" || taskMode === "block" || taskMode === "cancel") {
      const id = requireArg(taskIdOrTitle, "task id");
      const reason = [promptOrReason, priorityOrRest, ...taskRest].filter(Boolean).join(" ").trim();
      const requiredReason = requireArg(reason, "rationale or summary");
      const result = taskMode === "start"
        ? kernel.startQueuedTask(id, requiredReason)
        : taskMode === "complete"
          ? kernel.completeQueuedTask(id, requiredReason)
          : taskMode === "block"
            ? kernel.blockQueuedTask(id, requiredReason)
            : kernel.cancelQueuedTask(id, requiredReason);
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        taskDir: result.taskDir,
        task: result.task,
        event: result.event,
        taskPath: result.taskPath,
        eventPath: result.eventPath,
        summaryPath: result.summaryPath,
        memoryRunRecordPath: result.memoryRunRecordPath,
        memoryFailureRecordPath: result.memoryFailureRecordPath,
        lessonCandidatePath: result.lessonCandidatePath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (taskMode === "events") {
      const result = kernel.listTaskQueueEvents();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        taskDir: result.taskDir,
        events: result.events
      }, null, 2));
      process.exit(0);
    }

    if (taskMode === "summary") {
      const result = kernel.getTaskQueueSummary();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        taskDir: result.taskDir,
        summary: result.summary
      }, null, 2));
      process.exit(0);
    }

    throw new Error("Tasks command must be 'create', 'list', 'inspect', 'start', 'complete', 'block', 'cancel', 'events', or 'summary'.");
  }

  if (cmd === "knowledge") {
    const [knowledgeMode, first, second, third] = rest;

    if (knowledgeMode === "ingest-file") {
      const result = kernel.ingestKnowledgeFile({
        relativePath: requireArg(first, "relative file path"),
        title: second
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        knowledgeDir: result.knowledgeDir,
        document: result.document,
        chunkCount: result.chunks?.length ?? 0,
        documentPath: result.documentPath,
        chunkPath: result.chunkPath,
        summaryPath: result.summaryPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (knowledgeMode === "ingest-dir") {
      const extensions = second ? second.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
      const limit = third ? Number(third) : undefined;
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
        throw new Error("Knowledge ingest-dir limit must be a positive integer when supplied.");
      }
      const result = kernel.ingestKnowledgeDirectory({
        relativeDir: requireArg(first, "relative directory path"),
        extensions,
        limit
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        knowledgeDir: result.knowledgeDir,
        documentCount: result.documents.length,
        documents: result.documents,
        blocked: result.blocked,
        skipped: result.skipped,
        documentPath: result.documentPath,
        chunkPath: result.chunkPath,
        summaryPath: result.summaryPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (knowledgeMode === "documents" || knowledgeMode === "chunks") {
      const result = kernel.listKnowledge(knowledgeMode, first);
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        knowledgeDir: result.knowledgeDir,
        documents: result.documents,
        chunks: result.chunks
      }, null, 2));
      process.exit(0);
    }

    if (knowledgeMode === "inspect") {
      const result = kernel.inspectKnowledgeDocument(requireArg(first, "knowledge document id"));
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        knowledgeDir: result.knowledgeDir,
        document: result.document,
        chunks: result.chunks
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (knowledgeMode === "search") {
      const query = requireArg(first, "search query");
      const limit = second ? Number(second) : undefined;
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
        throw new Error("Knowledge search limit must be a positive integer when supplied.");
      }
      const result = kernel.searchKnowledge(query, limit);
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        knowledgeDir: result.knowledgeDir,
        query: result.query,
        hits: result.hits,
        searchRecord: result.searchRecord,
        searchPath: result.searchPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (knowledgeMode === "summary") {
      const result = kernel.getKnowledgeSummary();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        knowledgeDir: result.knowledgeDir,
        summary: result.summary,
        summaryPath: result.summaryPath
      }, null, 2));
      process.exit(0);
    }

    throw new Error("Knowledge command must be 'ingest-file', 'ingest-dir', 'documents', 'chunks', 'inspect', 'search', or 'summary'.");
  }


  if (cmd === "models") {
    const [modelMode, ...modelRest] = rest;

    if (modelMode === "providers") {
      const result = kernel.listModelProviders();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        modelDir: result.modelDir,
        providers: result.providers
      }, null, 2));
      process.exit(0);
    }

    if (modelMode === "local-status") {
      const providerId = modelRest[0] ?? "ollama-local";
      const model = modelRest[1];
      const result = kernel.getLocalModelProviderReadiness(providerId, model);
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        modelDir: result.modelDir,
        provider: result.provider,
        config: result.config,
        canInvoke: result.canInvoke,
        localOnly: result.localOnly,
        subscriptionRequired: result.subscriptionRequired,
        paidApiKeyRequired: result.paidApiKeyRequired,
        reportPath: result.reportPath,
        eventPath: result.eventPath,
        summaryPath: result.summaryPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (modelMode === "invoke-ollama") {
      const [model, ...promptParts] = modelRest;
      const prompt = promptParts.join(" ").trim();
      const result = await kernel.invokeLocalModelProvider({
        providerId: "ollama-local",
        model: requireArg(model, "local model name"),
        prompt: requireArg(prompt, "model prompt"),
        purpose: "local-cli-ollama-invocation"
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        modelDir: result.modelDir,
        provider: result.provider,
        request: result.request,
        response: result.response,
        requestPath: result.requestPath,
        responsePath: result.responsePath,
        eventPath: result.eventPath,
        summaryPath: result.summaryPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (modelMode === "invoke-mock") {
      const prompt = modelRest.join(" ").trim();
      const result = kernel.invokeModelProvider({
        providerId: "mock-local",
        prompt: requireArg(prompt, "model prompt"),
        purpose: "local-cli-mock-invocation"
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        modelDir: result.modelDir,
        provider: result.provider,
        request: result.request,
        response: result.response,
        requestPath: result.requestPath,
        responsePath: result.responsePath,
        eventPath: result.eventPath,
        summaryPath: result.summaryPath
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (modelMode === "requests" || modelMode === "responses" || modelMode === "events") {
      const result = kernel.listModelProviderHistory(modelMode);
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        modelDir: result.modelDir,
        requests: result.requests,
        responses: result.responses,
        events: result.events
      }, null, 2));
      process.exit(0);
    }

    if (modelMode === "summary") {
      const result = kernel.getModelProviderSummary();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        modelDir: result.modelDir,
        summary: result.summary,
        summaryPath: result.summaryPath
      }, null, 2));
      process.exit(0);
    }

    throw new Error("Models command must be 'providers', 'local-status', 'invoke-mock', 'invoke-ollama', 'requests', 'responses', 'events', or 'summary'.");
  }

  if (cmd === "auto") {
    const [autoMode, first, second, third, fourth, fifth] = rest;
    if (autoMode === "propose") {
      const result = kernel.runAutonomousDevLoop({ mode: "propose", goal: `Propose bounded change for ${requireArg(first, "relative file path")}.`, relativePath: requireArg(first, "relative file path"), operations: [{ kind: "replace", find: requireArg(second, "find text"), replaceWith: requireArg(third, "replace text"), expectedOccurrences: parseExpectedOccurrences(fourth) }] });
      console.log(JSON.stringify({ ok: result.ok, status: result.status, message: result.message, runDir: result.run.runDir, autonomyDir: result.autonomy.autonomyDir, loop: result.autonomy.loop, patch: result.autonomy.patch, knowledgeHitCount: result.autonomy.knowledge?.hits.length ?? 0, modelResponse: result.autonomy.model?.response, loopPath: result.autonomy.loopPath, eventPath: result.autonomy.eventPath, summaryPath: result.autonomy.summaryPath }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (autoMode === "apply-cert") {
      const result = kernel.runAutonomousDevLoop({ mode: "apply", taskId: requireArg(first, "task id"), goal: `Apply bounded certified change for ${requireArg(second, "relative file path")}.`, relativePath: requireArg(second, "relative file path"), operations: [{ kind: "replace", find: requireArg(third, "find text"), replaceWith: requireArg(fourth, "replace text"), expectedOccurrences: parseExpectedOccurrences(fifth) }], validationCommand: { command: "npm", args: ["run", "certify"] } });
      console.log(JSON.stringify({ ok: result.ok, status: result.status, message: result.message, runDir: result.run.runDir, autonomyDir: result.autonomy.autonomyDir, loop: result.autonomy.loop, task: result.autonomy.task, taskResult: result.autonomy.taskResult, patch: result.autonomy.patch, loopPath: result.autonomy.loopPath, eventPath: result.autonomy.eventPath, summaryPath: result.autonomy.summaryPath }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (autoMode === "loops" || autoMode === "events") {
      const result = kernel.listAutonomousDevLoops(autoMode);
      console.log(JSON.stringify({ ok: result.ok, status: result.status, autonomyDir: result.autonomyDir, loops: result.loops, events: result.events }, null, 2));
      process.exit(0);
    }
    if (autoMode === "summary") {
      const result = kernel.getAutonomousDevLoopSummary();
      console.log(JSON.stringify({ ok: result.ok, status: result.status, autonomyDir: result.autonomyDir, summary: result.summary, summaryPath: result.summaryPath }, null, 2));
      process.exit(0);
    }
    throw new Error("Auto command must be 'propose', 'apply-cert', 'loops', 'events', or 'summary'.");
  }


  if (cmd === "console") {
    const [consoleMode] = rest;
    if (consoleMode === "status") {
      const result = kernel.getOperatorConsoleStatus();
      console.log(JSON.stringify({ ok: result.ok, status: result.status, consoleDir: result.consoleDir, snapshot: result.snapshot, snapshotPath: result.snapshotPath, eventPath: result.eventPath, summaryPath: result.summaryPath }, null, 2));
      process.exit(0);
    }
    if (consoleMode === "health") {
      const result = kernel.getOperatorConsoleHealth();
      console.log(JSON.stringify({ ok: result.ok, status: result.status, consoleDir: result.consoleDir, health: result.health, healthPath: result.healthPath, eventPath: result.eventPath, summaryPath: result.summaryPath }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (consoleMode === "report") {
      const result = kernel.writeOperatorConsoleReport();
      console.log(JSON.stringify({ ok: result.ok, status: result.status, consoleDir: result.consoleDir, report: result.report, markdownPath: result.markdownPath, jsonPath: result.jsonPath, eventPath: result.eventPath, summaryPath: result.summaryPath }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (consoleMode === "history") {
      const result = kernel.listOperatorConsoleHistory();
      console.log(JSON.stringify({ ok: result.ok, status: result.status, consoleDir: result.consoleDir, snapshots: result.snapshots, events: result.events, reports: result.reports }, null, 2));
      process.exit(0);
    }
    if (consoleMode === "summary") {
      const result = kernel.getOperatorConsoleSummary();
      console.log(JSON.stringify({ ok: result.ok, status: result.status, consoleDir: result.consoleDir, summary: result.summary, summaryPath: result.summaryPath }, null, 2));
      process.exit(0);
    }
    throw new Error("Console command must be 'status', 'health', 'report', 'history', or 'summary'.");
  }

  if (cmd === "control-plane") {
    const [controlMode, ...controlRest] = rest;
    if (controlMode === "inspect") {
      const result = kernel.inspectControlPlane();
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        outputRoot: result.outputRoot,
        summary: result.summary,
        modelUse: false,
        networkUse: false
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (controlMode === "run") {
      const specPath = requireArg(optionValue(controlRest, "--spec"), "--spec");
      const spec = readJsonSpec(specPath) as any;
      const result = kernel.runControlPlane({ spec });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        attemptId: result.attemptId,
        attemptPath: result.attemptPath,
        outputRoot: result.outputRoot,
        terminalDecision: result.terminalDecision,
        summary: result.summary,
        modelUse: false,
        networkUse: false
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (controlMode === "verify") {
      const attempt = requireArg(optionValue(controlRest, "--attempt"), "--attempt");
      const result = kernel.verifyControlPlaneAttempt(attempt);
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        attemptId: result.attemptId,
        attemptPath: result.attemptPath,
        terminalDecision: result.terminalDecision,
        summary: result.summary,
        modelUse: false,
        networkUse: false
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (controlMode === "closeout") {
      const attempt = requireArg(optionValue(controlRest, "--attempt"), "--attempt");
      const result = kernel.closeoutControlPlaneAttempt(attempt);
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        attemptId: result.attemptId,
        attemptPath: result.attemptPath,
        terminalDecision: result.terminalDecision,
        summary: result.summary,
        modelUse: false,
        networkUse: false
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    throw new Error("Control Plane command must be 'inspect', 'run', 'verify', or 'closeout'.");
  }

  if (cmd === "runtime") {
    const [runtimeMode] = rest;
    const config = createRuntimeConfig({ projectRoot: process.cwd() });
    if (runtimeMode === "identity") {
      const identity = loadOrCreateRuntimeIdentity(config);
      console.log(JSON.stringify({
        ok: true,
        status: "COMPLETED",
        identity,
        identityLocation: path.join(config.stateRoot, "identity.json"),
        modelUse: false,
        networkUse: false
      }, null, 2));
      process.exit(0);
    }
    if (runtimeMode === "health" || runtimeMode === "prove") {
      const proof = await runRuntimeHostProof(config, createIsolatedExecutionRuntimeServices(config.projectRoot));
      console.log(JSON.stringify({
        ok: proof.ok,
        status: proof.status,
        message: proof.message,
        identity: proof.identity,
        health: proof.health,
        shutdown: proof.shutdown,
        evidenceRoot: proof.evidenceRoot,
        modelUse: false,
        networkUse: false
      }, null, 2));
      process.exit(proof.ok ? 0 : 1);
    }
    if (runtimeMode === "start") {
      const host = new RuntimeHost({ config, services: createIsolatedExecutionRuntimeServices(config.projectRoot) });
      const started = await host.start();
      console.log(JSON.stringify({
        ok: started.ok,
        status: started.status,
        message: started.message,
        identity: started.identity,
        health: started.health,
        evidenceRoot: started.evidenceRoot,
        modelUse: false,
        networkUse: false
      }, null, 2));
      if (!started.ok) process.exit(1);
      host.bindProcessSignals();
      await new Promise<void>((resolve) => {
        process.once("SIGINT", () => resolve());
        process.once("SIGTERM", () => resolve());
      });
      const shutdown = await host.shutdown("Runtime Host CLI stop requested.");
      console.log(JSON.stringify({ ok: shutdown.ok, status: shutdown.status, shutdown }, null, 2));
      process.exit(shutdown.ok ? 0 : 1);
    }
    throw new Error("Runtime command must be 'identity', 'health', 'start', or 'prove'.");
  }

  if (cmd === "state") {
    const [stateMode] = rest;
    const config = createRuntimeStateConfig({ projectRoot: process.cwd() });
    if (stateMode === "init" || stateMode === "inspect" || stateMode === "integrity") {
      const store = openRuntimeState(config);
      try {
        const result = stateMode === "integrity" ? store.integrity() : store.inspect();
        console.log(JSON.stringify({
          ok: result.ok,
          status: result.status,
          message: result.message,
          databasePath: result.databasePath,
          schemaVersion: result.schemaVersion,
          sqlite: result.sqlite,
          counts: result.counts,
          leases: result.leases,
          lastEvent: result.lastEvent,
          modelUse: false,
          networkUse: false
        }, null, 2));
        process.exit(result.ok ? 0 : 1);
      } finally {
        store.close();
      }
    }
    if (stateMode === "prove") {
      const result = await runRuntimeStateProof();
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (stateMode === "backup") {
      const store = openRuntimeState(config);
      try {
        const result = store.backup();
        console.log(JSON.stringify({ ok: true, status: "healthy", backup: { path: result.path, sha256: result.sha256, bytes: result.bytes }, modelUse: false, networkUse: false }, null, 2));
        process.exit(0);
      } finally {
        store.close();
      }
    }
    if (stateMode === "export") {
      const store = openRuntimeState(config);
      try {
        const result = store.exportJson();
        console.log(JSON.stringify({ ok: true, status: "healthy", export: { path: result.path, sha256: result.sha256, recordCounts: result.recordCounts }, modelUse: false, networkUse: false }, null, 2));
        process.exit(0);
      } finally {
        store.close();
      }
    }
    throw new Error("State command must be 'init', 'inspect', 'prove', 'integrity', 'backup', or 'export'.");
  }

  if (cmd === "recovery") {
    const [recoveryMode] = rest;
    const config = createRuntimeStateConfig({ projectRoot: process.cwd() });
    if (recoveryMode === "prove") {
      const result = await runPersistentRuntimeRecoveryProof();
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    const store = openRuntimeState(config);
    try {
      const coordinator = new PersistentRuntimeRecoveryCoordinator(store, { projectRoot: process.cwd() });
      if (recoveryMode === "inspect") {
        console.log(JSON.stringify(coordinator.inspect(), null, 2));
        process.exit(0);
      }
      if (recoveryMode === "scan") {
        const result = coordinator.scanAndRecover({ executeSafeRecovery: false });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }
      if (recoveryMode === "pending") {
        console.log(JSON.stringify({ ok: true, status: "healthy", pending: coordinator.pendingAttempts(), modelUse: false, networkUse: false }, null, 2));
        process.exit(0);
      }
      if (recoveryMode === "decisions") {
        console.log(JSON.stringify({ ok: true, status: "healthy", decisions: coordinator.listDecisions(), modelUse: false, networkUse: false }, null, 2));
        process.exit(0);
      }
    } finally {
      store.close();
    }
    throw new Error("Recovery command must be 'inspect', 'scan', 'prove', 'pending', or 'decisions'.");
  }

  if (cmd === "execution") {
    const [executionMode, executionId] = rest;
    if (executionMode === "prove") {
      const result = await runIsolatedExecutionProof();
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    const config = createRuntimeStateConfig({ projectRoot: process.cwd() });
    const store = openRuntimeState(config);
    try {
      const engine = new IsolatedExecutionEngine(store, { projectRoot: process.cwd() });
      if (executionMode === "policy") {
        console.log(JSON.stringify({ ok: true, status: "INSPECTED", ...engine.policy() }, null, 2));
        process.exit(0);
      }
      if (executionMode === "list") {
        console.log(JSON.stringify({ ok: true, status: "INSPECTED", executions: engine.listExecutions(), modelUse: false, networkUse: false }, null, 2));
        process.exit(0);
      }
      if (executionMode === "inspect") {
        console.log(JSON.stringify(engine.inspectExecution(requireArg(executionId, "execution id")), null, 2));
        process.exit(0);
      }
    } finally {
      store.close();
    }
    throw new Error("Execution command must be 'policy', 'list', 'inspect', or 'prove'.");
  }

  if (cmd === "evaluation") {
    const [evaluationMode, evaluationId] = rest;
    if (evaluationMode === "prove") {
      const result = await runEvaluationEngineProof();
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    const config = createRuntimeStateConfig({ projectRoot: process.cwd() });
    const store = openRuntimeState(config);
    try {
      const engine = new EvaluationEngine(store, { projectRoot: process.cwd() });
      if (evaluationMode === "profiles") {
        console.log(JSON.stringify({ ok: true, status: "INSPECTED", ...engine.profiles() }, null, 2));
        process.exit(0);
      }
      if (evaluationMode === "list") {
        console.log(JSON.stringify({ ok: true, status: "INSPECTED", evaluations: engine.listEvaluations(), modelUse: false, networkUse: false }, null, 2));
        process.exit(0);
      }
      if (evaluationMode === "inspect") {
        console.log(JSON.stringify(engine.inspectEvaluation(requireArg(evaluationId, "evaluation id")), null, 2));
        process.exit(0);
      }
    } finally {
      store.close();
    }
    throw new Error("Evaluation command must be 'profiles', 'list', 'inspect', or 'prove'.");
  }

  if (cmd === "repository") {
    const [repositoryMode] = rest;
    if (repositoryMode !== "snapshot" && repositoryMode !== "truth") {
      throw new Error("Repository command must be 'snapshot' or 'truth'.");
    }
    const result = repositoryMode === "snapshot" ? kernel.runRepositorySnapshot() : kernel.runRepositoryTruth({ refreshSnapshot: true });
    console.log(JSON.stringify({
      ok: result.ok,
      status: result.status,
      message: result.message,
      snapshotId: "snapshotId" in result ? result.snapshotId : undefined,
      truthId: "truthId" in result ? result.truthId : undefined,
      sourceSnapshotId: "sourceSnapshotId" in result ? result.sourceSnapshotId : undefined,
      outputRoot: repositoryMode === "snapshot" ? ".sera/repository" : ".sera/repository-truth",
      manifest: result.manifest,
      warningCount: "warnings" in result ? result.warnings.length : result.warningCount,
      errorCount: "errors" in result ? result.errors.length : result.errorCount,
      summary: result.summary,
      modelUse: false,
      networkUse: false
    }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (cmd === "snapshot") {
    const result = kernel.runRepositorySnapshot();
    console.log(JSON.stringify({
      ok: result.ok,
      status: result.status,
      message: result.message,
      snapshotId: result.snapshotId,
      outputRoot: ".sera/repository",
      manifest: result.manifest,
      warningCount: result.warnings.length,
      errorCount: result.errors.length,
      summary: result.summary,
      modelUse: false,
      networkUse: false
    }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (cmd === "truth") {
    const result = kernel.runRepositoryTruth({ refreshSnapshot: true });
    console.log(JSON.stringify({
      ok: result.ok,
      status: result.status,
      message: result.message,
      truthId: result.truthId,
      sourceSnapshotId: result.sourceSnapshotId,
      outputRoot: ".sera/repository-truth",
      manifest: result.manifest,
      warningCount: result.warningCount,
      errorCount: result.errorCount,
      summary: result.summary,
      modelUse: false,
      networkUse: false
    }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
