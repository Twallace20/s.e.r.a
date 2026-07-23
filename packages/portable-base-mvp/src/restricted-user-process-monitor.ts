export interface ProcessEvent { timestamp: string; pid: number; parentPid: number; executableName: string; executablePath: string; proofSid?: string; prohibited?: boolean; }
const prohibited = /^(git|npm|npx|codex|code|devenv|cl|msbuild|winget|choco)(\.exe|\.cmd)?$/i;
export class ProofProcessMonitor {
  readonly startedAt = new Date().toISOString(); readonly events: ProcessEvent[] = []; readonly readyHandshake = true; private interrupted = false;
  constructor(readonly sessionId: string, readonly nonce: string, readonly proofSid: string) {}
  record(event: ProcessEvent): void { this.events.push({ ...event, prohibited: event.prohibited === true || prohibited.test(event.executableName) }); }
  markInterrupted(): void { this.interrupted = true; }
  stop(): any { return { sessionId: this.sessionId, nonce: this.nonce, proofSid: this.proofSid, startedAt: this.startedAt, stoppedAt: new Date().toISOString(), readyHandshake: this.readyHandshake, completeness: this.interrupted ? "INTERRUPTED" : "COMPLETE", events: this.events }; }
}
