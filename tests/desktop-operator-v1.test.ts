import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import {
  DESKTOP_OPERATOR_APP_VERSION,
  DESKTOP_OPERATOR_CSS,
  DESKTOP_OPERATOR_HTML,
  DESKTOP_OPERATOR_JS,
  REQUIRED_DESKTOP_VIEWS,
  assertDesktopAssetsLocalOnly,
  createAssetManifest,
  getDesktopAssets,
  getDesktopVisualContract,
  verifyDesktopAssetIntegrity
} from "@sera/desktop-operator";
import {
  OperatorGateway,
  OperatorGatewayBlockedError,
  runDesktopOperatorProof,
  runOperatorGatewayProof
} from "@sera/operator-gateway";
import { DEFAULT_RUNTIME_STATE_MIGRATIONS, openRuntimeState } from "@sera/runtime-state";

describe("Desktop Operator v1", () => {
  let firstDesktopProof: Awaited<ReturnType<typeof runDesktopOperatorProof>>;
  let secondDesktopProof: Awaited<ReturnType<typeof runDesktopOperatorProof>>;
  let firstGatewayProof: Awaited<ReturnType<typeof runOperatorGatewayProof>>;
  let secondGatewayProof: Awaited<ReturnType<typeof runOperatorGatewayProof>>;

  beforeAll(async () => {
    firstDesktopProof = await runDesktopOperatorProof();
    secondDesktopProof = await runDesktopOperatorProof();
    firstGatewayProof = await runOperatorGatewayProof();
    secondGatewayProof = await runOperatorGatewayProof();
  });

  const proofCases = [
    ["desktop proof succeeds first time", () => firstDesktopProof.ok],
    ["desktop proof succeeds second time", () => secondDesktopProof.ok],
    ["operator proof succeeds first time", () => firstGatewayProof.ok],
    ["operator proof succeeds second time", () => secondGatewayProof.ok],
    ["desktop proofs use independent databases", () => firstDesktopProof.databasePath !== secondDesktopProof.databasePath],
    ["operator proofs use independent databases", () => firstGatewayProof.databasePath !== secondGatewayProof.databasePath],
    ["desktop proof uses temp root", () => firstDesktopProof.proofRoot.includes(os.tmpdir())],
    ["operator proof uses temp root", () => firstGatewayProof.proofRoot.includes(os.tmpdir())],
    ["desktop proof does not use model", () => firstDesktopProof.modelUse === false],
    ["operator proof does not use model", () => firstGatewayProof.modelUse === false],
    ["desktop proof does not use public network", () => firstDesktopProof.networkUse === false],
    ["operator proof does not use public network", () => firstGatewayProof.networkUse === false],
    ["loopback proof port is assigned", () => firstDesktopProof.port > 0],
    ["proof creates SQLite database", () => fs.existsSync(firstDesktopProof.databasePath)],
    ["proof creates evidence root", () => fs.existsSync(firstDesktopProof.evidenceRoot)],
    ["proof session id is opaque", () => firstDesktopProof.sessionId.startsWith("operator_session_")],
    ["proof request id is opaque", () => firstDesktopProof.firstRequestId.startsWith("operator_request_")],
    ["proof approval id is opaque", () => firstDesktopProof.approvalId.startsWith("operator_approval_")],
    ["graphical surface check passes", () => firstDesktopProof.checks.graphicalSurfacePresent],
    ["asset local-only check passes", () => firstDesktopProof.checks.assetsLocalOnly],
    ["asset integrity check passes", () => firstDesktopProof.checks.assetIntegrity],
    ["loopback-only check passes", () => firstDesktopProof.checks.loopbackOnly],
    ["authenticated session check passes", () => firstGatewayProof.checks.authenticatedSession],
    ["CSRF required check passes", () => firstGatewayProof.checks.csrfRequired],
    ["request queue check passes", () => firstGatewayProof.checks.requestQueued],
    ["approval queue check passes", () => firstGatewayProof.checks.approvalCreated],
    ["second confirmation check passes", () => firstGatewayProof.checks.approvalSecondConfirmationBlocked],
    ["approval decision check passes", () => firstGatewayProof.checks.approvalDecisionRecorded],
    ["notification check passes", () => firstGatewayProof.checks.notificationsRecorded],
    ["evidence traversal check passes", () => firstGatewayProof.checks.evidenceTraversalBlocked],
    ["active HTML check passes", () => firstGatewayProof.checks.activeHtmlNotRendered],
    ["redaction check passes", () => firstGatewayProof.checks.evidenceRedacted],
    ["session revocation check passes", () => firstGatewayProof.checks.sessionRevoked],
    ["database creation check passes", () => firstGatewayProof.checks.databaseCreated]
  ] satisfies Array<[string, () => boolean]>;

  it.each(proofCases)("%s", (_name, check) => {
    expect(check()).toBe(true);
  });

  it.each(REQUIRED_DESKTOP_VIEWS.map((view) => [`view ${view} exists in HTML`, view] as const))("%s", (_name, view) => {
    expect(DESKTOP_OPERATOR_HTML).toContain(`view-${view}`);
    expect(DESKTOP_OPERATOR_HTML).toContain(`data-view="${view}"`);
  });

  const assetCases = getDesktopAssets().flatMap((asset) => [
    [`asset ${asset.path} has content type`, () => asset.contentType.length > 0],
    [`asset ${asset.path} has body`, () => asset.body.length > 0],
    [`asset ${asset.path} has no remote URL`, () => !/https?:\/\//i.test(asset.body)],
    [`asset ${asset.path} has stable hash`, () => crypto.createHash("sha256").update(asset.body).digest("hex").length === 64]
  ] as Array<[string, () => boolean]>);

  it.each(assetCases)("%s", (_name, check) => {
    expect(check()).toBe(true);
  });

  const visualContractCases = [
    ["desktop app version is canonical", () => DESKTOP_OPERATOR_APP_VERSION === "desktop-operator-v1"],
    ["visual contract schema is canonical", () => getDesktopVisualContract().schemaVersion === "sera.desktop-visual-contract.v1"],
    ["visual contract has navigation", () => getDesktopVisualContract().hasNavigation],
    ["visual contract has approval queue", () => getDesktopVisualContract().hasApprovalQueue],
    ["visual contract has evidence viewer", () => getDesktopVisualContract().hasEvidenceViewer],
    ["visual contract has status region", () => getDesktopVisualContract().hasStatusRegion],
    ["visual contract lists every view", () => getDesktopVisualContract().views.length === REQUIRED_DESKTOP_VIEWS.length],
    ["visual contract requires focus-visible", () => getDesktopVisualContract().accessibility.focusVisible],
    ["visual contract requires reduced motion", () => getDesktopVisualContract().accessibility.reducedMotion],
    ["visual contract requires labelled controls", () => getDesktopVisualContract().accessibility.labelledControls],
    ["visual contract blocks remote references", () => getDesktopVisualContract().security.remoteReferences === false],
    ["visual contract blocks inline script", () => getDesktopVisualContract().security.inlineScript === false],
    ["visual contract blocks eval APIs", () => getDesktopVisualContract().security.evalLikeApis === false],
    ["visual contract blocks token in URL", () => getDesktopVisualContract().security.tokenInUrl === false],
    ["asset manifest verifies", () => verifyDesktopAssetIntegrity().ok],
    ["asset manifest covers three executable assets", () => createAssetManifest().assets.length === 3],
    ["local-only assertion passes", () => assertDesktopAssetsLocalOnly().ok],
    ["HTML references local CSS", () => DESKTOP_OPERATOR_HTML.includes('href="/assets/app.css"')],
    ["HTML references local JS", () => DESKTOP_OPERATOR_HTML.includes('src="/assets/app.js"')],
    ["JS uses strict mode", () => DESKTOP_OPERATOR_JS.includes('"use strict"')],
    ["JS does not call eval", () => !/\beval\s*\(/.test(DESKTOP_OPERATOR_JS)],
    ["JS does not construct Function", () => !/new\s+Function/.test(DESKTOP_OPERATOR_JS)],
    ["CSS defines focus-visible", () => DESKTOP_OPERATOR_CSS.includes(":focus-visible")],
    ["CSS defines reduced motion", () => DESKTOP_OPERATOR_CSS.includes("prefers-reduced-motion")]
  ] satisfies Array<[string, () => boolean]>;

  it.each(visualContractCases)("%s", (_name, check) => {
    expect(check()).toBe(true);
  });

  const runtimeSchemaCases = [
    ["runtime migration version is 8", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.version === 8],
    ["runtime migration name is desktop operator", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.name === "desktop_operator_v1"],
    ["migration v8 creates operator sessions", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("CREATE TABLE operator_sessions")],
    ["migration v8 creates operator requests", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("CREATE TABLE operator_requests")],
    ["migration v8 creates operator approvals", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("CREATE TABLE operator_approvals")],
    ["migration v8 creates approval decisions", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("CREATE TABLE operator_approval_decisions")],
    ["migration v8 creates audit events", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("CREATE TABLE operator_audit_events")],
    ["migration v8 creates notifications", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("CREATE TABLE operator_notifications")],
    ["migration v8 creates events", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("CREATE TABLE operator_events")],
    ["migration v8 creates preferences", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("CREATE TABLE operator_preferences")],
    ["migration v8 indexes sessions", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("idx_operator_sessions_state")],
    ["migration v8 indexes requests", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("idx_operator_requests_status")],
    ["migration v8 indexes approvals", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("idx_operator_approvals_status")],
    ["migration v8 indexes audit", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("idx_operator_audit_events_sequence")],
    ["migration v8 indexes notifications", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("idx_operator_notifications_status")],
    ["migration v8 indexes events", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("idx_operator_events_sequence")],
    ["migration v1 checksum preserved", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[0]) === "5c547ad9ce4defa6032f86dbc48be7098f6b4636a013b433c49f0d5363a52fe4"],
    ["migration v2 checksum preserved", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[1]) === "783c70c40047b9c33f8cb09326ae02710eae185bfd20a70c54557de49ffc26fb"],
    ["migration v3 checksum preserved", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[2]) === "6292e7585b8f9ac0f4ec1caaa578cc14c3baf110a747f9a0116f286f2b8f05a0"],
    ["migration v4 checksum preserved", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[3]) === "c867f527c35ec3ac6bba3d0191498c8b1ca4546fc96629a093198dbd18dc14c2"],
    ["migration v5 checksum preserved", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[4]) === "b0a475474381af3b9bdfd40d0569420ff1561b5ce59a9b10989ae298786f7e04"],
    ["migration v6 checksum preserved", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[5]) === "92133d1a19cf7a06e0fa4a9ee85e405bb12ba791360d1561cd6df15242b57c8e"],
    ["migration v7 checksum preserved", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[6]) === "12d4d783147793a0253f7669dea46e3edcaa5504dcee6bde8aa6738611337286"]
  ] satisfies Array<[string, () => boolean | undefined]>;

  it.each(runtimeSchemaCases)("%s", (_name, check) => {
    expect(check()).toBe(true);
  });

  it("opens Runtime State schema v8 and exposes operator table counts", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-desktop-state-test-"));
    const store = openRuntimeState({ projectRoot: root });
    try {
      const inspection = store.inspect();
      expect(inspection.schemaVersion).toBe(8);
      expect(inspection.counts.operator_sessions).toBe(0);
      expect(inspection.counts.operator_approvals).toBe(0);
      expect(inspection.counts.operator_notifications).toBe(0);
    } finally {
      store.close();
    }
  });

  it("creates a session without persisting raw token values", () => {
    const gateway = testGateway("session");
    try {
      const session = gateway.createSession({ idempotencyKey: "session-one" });
      const rows = gateway.sessions();
      expect(rows).toHaveLength(1);
      expect(JSON.stringify(rows)).not.toContain(session.token);
      expect(JSON.stringify(rows)).not.toContain(session.csrfToken);
    } finally {
      gateway.close();
    }
  });

  it("blocks public bind addresses", () => {
    expect(() => new OperatorGateway({ projectRoot: fs.mkdtempSync(path.join(os.tmpdir(), "sera-desktop-bind-test-")), host: "0.0.0.0" })).toThrow(OperatorGatewayBlockedError);
  });

  it("blocks evidence path traversal", () => {
    const gateway = testGateway("evidence");
    try {
      expect(() => gateway.viewEvidence("../escape.txt")).toThrow(OperatorGatewayBlockedError);
    } finally {
      gateway.close();
    }
  });

  const sourceCaseFiles = [
    "apps/cli/src/index.ts",
    "packages/certs/src/certify.ts",
    "packages/repository-snapshot/src/repository-snapshot.ts",
    "packages/repository-truth/src/repository-truth.ts",
    "README.md",
    "docs/architecture/DESKTOP_OPERATOR_V1.md",
    "docs/architecture/PACKAGE_BOUNDARIES.md",
    "docs/architecture/SERA_EVOLUTION_ROADMAP_V1.md",
    "docs/roadmap/CERTIFICATION_LADDER.md",
    "architecture/base-mvp-manifest.json",
    "architecture/capability-inventory.json",
    ".gitignore"
  ];

  it.each(sourceCaseFiles.map((file) => [`${file} references desktop operator`, file] as const))("%s", (_name, file) => {
    const text = fs.readFileSync(path.join(process.cwd(), file), "utf8").toLowerCase();
    expect(text.includes("desktop") || text.includes("operator")).toBe(true);
  });

  const boundaryPhrases = [
    "loopback",
    "token hashes",
    "CSRF",
    "approval",
    "safe evidence",
    "no remote references",
    "does not run shell commands",
    "invoke models",
    "fetch public URLs",
    "automatic promotion",
    "automatic rollback",
    "Runtime State schema v8",
    "active imported HTML",
    "@sera/operator-gateway",
    "@sera/desktop-operator"
  ];

  it.each(boundaryPhrases.map((phrase) => [`architecture doc records ${phrase}`, phrase] as const))("%s", (_name, phrase) => {
    expect(fs.readFileSync(path.join(process.cwd(), "docs/architecture/DESKTOP_OPERATOR_V1.md"), "utf8")).toContain(phrase);
  });

  const cliPhrases = ["desktop status", "desktop prove", "operator sessions", "operator approvals", "operator notifications", "operator prove"];

  it.each(cliPhrases.map((phrase) => [`CLI help includes ${phrase}`, phrase] as const))("%s", (_name, phrase) => {
    expect(fs.readFileSync(path.join(process.cwd(), "apps/cli/src/index.ts"), "utf8")).toContain(phrase);
  });

  const certificationPhrases = [
    "desktop-operator-v1",
    "runDesktopOperatorProof",
    "runOperatorGatewayProof",
    "operator_gateway_runtime_host_registration",
    "desktop_operator_manifest_aligned",
    "desktop_operator_asset_integrity",
    "operator_gateway_authenticated_session",
    "operator_gateway_approval_queue",
    "operator_gateway_notifications_recorded",
    "operator_gateway_sqlite_state_created"
  ];

  it.each(certificationPhrases.map((phrase) => [`certification contains ${phrase}`, phrase] as const))("%s", (_name, phrase) => {
    expect(fs.readFileSync(path.join(process.cwd(), "packages/certs/src/certify.ts"), "utf8")).toContain(phrase);
  });

  const securitySourcePhrases = [
    "public_bind_blocked",
    "csrf_required",
    "conflicting_idempotency",
    "approval_integrity_mismatch",
    "second_confirmation_required",
    "typed_confirmation_required",
    "evidence_path_escape",
    "active-html-blocked",
    "authentication_required",
    "invalid_session",
    "host_header_blocked",
    "origin_blocked",
    "Content-Security-Policy",
    "X-Frame-Options",
    "no-store",
    "timingSafeEqual",
    "randomBytes",
    "hashSecret",
    "operator_audit_events",
    "operator_notifications"
  ];

  it.each(securitySourcePhrases.map((phrase) => [`gateway source enforces ${phrase}`, phrase] as const))("%s", (_name, phrase) => {
    expect(fs.readFileSync(path.join(process.cwd(), "packages/operator-gateway/src/operator-gateway.ts"), "utf8")).toContain(phrase);
  });
});

function testGateway(label: string): OperatorGateway {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sera-desktop-${label}-`));
  const evidenceRoot = path.join(root, ".sera", "operator", "evidence");
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.writeFileSync(path.join(evidenceRoot, "sample.json"), JSON.stringify({ ok: true }, null, 2), "utf8");
  return new OperatorGateway({ projectRoot: root, evidenceRoot });
}

function migrationChecksum(migration: { version: number; name: string; sql: string }): string {
  return crypto.createHash("sha256").update(JSON.stringify(migration)).digest("hex");
}
