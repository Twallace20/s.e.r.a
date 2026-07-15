export interface CapturedStream {
  text: string;
  observedBytes: number;
  capturedBytes: number;
  truncated: boolean;
}

export interface OutputCapture {
  stdout: CapturedStream;
  stderr: CapturedStream;
  combinedObservedBytes: number;
  combinedCapturedBytes: number;
  combinedTruncated: boolean;
  limitEvents: string[];
}

export class BoundedOutputCollector {
  private stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private stdoutObserved = 0;
  private stderrObserved = 0;
  private readonly events = new Set<string>();

  constructor(
    private readonly maxStdoutBytes: number,
    private readonly maxStderrBytes: number,
    private readonly maxCombinedBytes: number
  ) {}

  pushStdout(chunk: Buffer): void {
    this.stdoutObserved += chunk.length;
    this.stdout = this.append("stdout", this.stdout, chunk, this.maxStdoutBytes);
  }

  pushStderr(chunk: Buffer): void {
    this.stderrObserved += chunk.length;
    this.stderr = this.append("stderr", this.stderr, chunk, this.maxStderrBytes);
  }

  result(): OutputCapture {
    const combinedObserved = this.stdoutObserved + this.stderrObserved;
    const combinedCaptured = this.stdout.length + this.stderr.length;
    if (combinedObserved > this.maxCombinedBytes || combinedCaptured >= this.maxCombinedBytes) this.events.add("combined-output-limit");
    return {
      stdout: streamResult(this.stdout, this.stdoutObserved),
      stderr: streamResult(this.stderr, this.stderrObserved),
      combinedObservedBytes: combinedObserved,
      combinedCapturedBytes: combinedCaptured,
      combinedTruncated: this.events.has("combined-output-limit"),
      limitEvents: [...this.events].sort()
    };
  }

  private append(kind: "stdout" | "stderr", current: Buffer<ArrayBufferLike>, chunk: Buffer, limit: number): Buffer<ArrayBufferLike> {
    const remainingKind = Math.max(0, limit - current.length);
    const remainingCombined = Math.max(0, this.maxCombinedBytes - this.stdout.length - this.stderr.length);
    const keep = Math.min(remainingKind, remainingCombined, chunk.length);
    if (keep < chunk.length) this.events.add(`${kind}-limit`);
    if (remainingCombined < chunk.length) this.events.add("combined-output-limit");
    return keep > 0 ? Buffer.concat([current, chunk.subarray(0, keep)]) : current;
  }
}

function streamResult(buffer: Buffer, observed: number): CapturedStream {
  return {
    text: buffer.toString("utf8"),
    observedBytes: observed,
    capturedBytes: buffer.length,
    truncated: observed > buffer.length
  };
}
