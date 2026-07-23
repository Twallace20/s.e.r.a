param(
  [Parameter(Mandatory=$true)][string]$EvidenceRoot,
  [Parameter(Mandatory=$true)][string]$SessionId,
  [Parameter(Mandatory=$true)][string]$Nonce,
  [Parameter(Mandatory=$true)][string]$ProofSid,
  [Parameter(Mandatory=$true)][string]$CollectorSha256,
  [switch]$AllowPollingFallback
)
$ErrorActionPreference = 'Stop'
$ready = Join-Path $EvidenceRoot 'monitor-ready.json'
$events = Join-Path $EvidenceRoot 'monitor-events.ndjson'
$stop = Join-Path $EvidenceRoot 'monitor-stop.request'
$complete = Join-Path $EvidenceRoot 'monitor-complete.json'
$started = [DateTime]::UtcNow.ToString('o')
$source = 'SERARestrictedProcessTrace'
$watcherPid = $PID
$flushed = $false
$polling = $false
$known = @{}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
function Write-Utf8NoBom([string]$Path, [string]$Text) { [System.IO.File]::WriteAllText($Path, $Text + [Environment]::NewLine, $script:utf8NoBom) }
function Add-Utf8NoBom([string]$Path, [string]$Text) { [System.IO.File]::AppendAllText($Path, $Text + [Environment]::NewLine, $script:utf8NoBom) }
try {
  if ($AllowPollingFallback) { $polling=$true; Get-Process | ForEach-Object { $known[[int]$_.Id]=$true } }
  else { Register-WmiEvent -Class Win32_ProcessStartTrace -SourceIdentifier $source -ErrorAction Stop | Out-Null }
  Write-Utf8NoBom $ready (@{ schemaVersion='sera.live-process-monitor-ready.v1'; ready=$true; liveSubscription=(-not $polling); sourceEventType=if($polling){'Win32_ProcessPollingSmoke'}else{'Win32_ProcessStartTrace'}; sessionId=$SessionId; nonce=$Nonce; proofSid=$ProofSid; collectorSha256=$CollectorSha256; watcherPid=$watcherPid; monitorStartedAt=$started } | ConvertTo-Json -Compress)
  while (-not (Test-Path -LiteralPath $stop)) {
    if ($polling) {
      Get-Process | ForEach-Object { $pidValue=[int]$_.Id;if(-not $known.ContainsKey($pidValue)){$known[$pidValue]=$true;$processPath=$null;try{$processPath=$_.Path}catch{};Add-Utf8NoBom $events (@{schemaVersion='sera.live-process-start-event.v1';sessionId=$SessionId;nonce=$Nonce;proofSid=$ProofSid;collectorSha256=$CollectorSha256;eventTimestamp=([DateTime]::UtcNow.ToString('o'));processName=($_.ProcessName+'.exe');pid=$pidValue;parentPid=0;sourceEventType='Win32_ProcessPollingSmoke';original=@{processName=$_.ProcessName;processId=$pidValue};enrichmentStatus='SMOKE_POLL_OBSERVED';enrichment=@{executablePath=$processPath;commandLine=$null;sessionId=$_.SessionId;owner=$null;ownerSid=$null}}|ConvertTo-Json -Depth 6 -Compress)} };Start-Sleep -Milliseconds 100;continue
    }
    $event = Wait-Event -SourceIdentifier $source -Timeout 1
    if ($null -eq $event) { continue }
    $trace = $event.SourceEventArgs.NewEvent
    $classification = 'OBSERVED_PARTIAL'
    $enriched = $null
    try {
      $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($trace.ProcessID)" -ErrorAction Stop
      $owner = Invoke-CimMethod -InputObject $process -MethodName GetOwner -ErrorAction Stop
      $ownerSid = Invoke-CimMethod -InputObject $process -MethodName GetOwnerSid -ErrorAction Stop
      $classification = 'OBSERVED_AND_ENRICHED'
      $enriched = @{ executablePath=$process.ExecutablePath; commandLine=$process.CommandLine; sessionId=$process.SessionId; owner="$($owner.Domain)\$($owner.User)"; ownerSid=$ownerSid.Sid }
    } catch [Microsoft.Management.Infrastructure.CimException] {
      $classification = if ($_.Exception.Message -match 'Access') {'ENRICHMENT_ACCESS_DENIED'} else {'ENRICHMENT_PROCESS_EXITED'}
    } catch { $classification = 'ENRICHMENT_ERROR' }
    Add-Utf8NoBom $events (@{ schemaVersion='sera.live-process-start-event.v1'; sessionId=$SessionId; nonce=$Nonce; proofSid=$ProofSid; collectorSha256=$CollectorSha256; eventTimestamp=([DateTime]::FromFileTimeUtc([int64]$trace.TIME_CREATED).ToString('o')); processName=$trace.ProcessName; pid=[int]$trace.ProcessID; parentPid=[int]$trace.ParentProcessID; sourceEventType='Win32_ProcessStartTrace'; original=@{TIME_CREATED=[int64]$trace.TIME_CREATED;ProcessName=$trace.ProcessName;ProcessID=[int]$trace.ProcessID;ParentProcessID=[int]$trace.ParentProcessID;Sid=$trace.Sid;SessionID=$trace.SessionID}; enrichmentStatus=$classification; enrichment=$enriched } | ConvertTo-Json -Depth 6 -Compress)
    Remove-Event -EventIdentifier $event.EventIdentifier
  }
  do {
    $event = Get-Event -SourceIdentifier $source -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($event) { Remove-Event -EventIdentifier $event.EventIdentifier }
  } while ($event -and -not $polling)
  $flushed = $true
} catch {
  $classification = if ($_.Exception.Message -match 'Access') { 'ACCESS_DENIED' } elseif ($_.Exception.Message -match 'timed out|timeout') { 'TIMEOUT' } else { 'SUBSCRIPTION_ERROR' }
  $hresult = $null
  try { $hresult = ('0x{0:X8}' -f ($_.Exception.HResult -band 0xffffffff)) } catch {}
  $handshake = if(Test-Path -LiteralPath $ready){'CREATED'}else{'NOT_CREATED'}
  Write-Utf8NoBom (Join-Path $EvidenceRoot 'monitor-failure.json') (@{ schemaVersion='sera.live-process-monitor-failure.v1'; classification=$classification; exceptionType=$_.Exception.GetType().FullName; message=$_.Exception.Message; hresult=$hresult; subscriptionState='FAILED'; handshakeState=$handshake; timestamp=([DateTime]::UtcNow.ToString('o')) } | ConvertTo-Json -Compress)
  throw
} finally {
  $unsubscribed = $polling
  if (-not $polling) { Unregister-Event -SourceIdentifier $source -ErrorAction SilentlyContinue; $unsubscribed = -not [bool](Get-EventSubscriber -SourceIdentifier $source -ErrorAction SilentlyContinue) }
  Write-Utf8NoBom $complete (@{ schemaVersion='sera.live-process-monitor-complete.v1'; complete=$true; flushed=$flushed; unsubscribed=$unsubscribed; interrupted=$false; sessionId=$SessionId; nonce=$Nonce; proofSid=$ProofSid; collectorSha256=$CollectorSha256; watcherPid=$watcherPid; monitorStartedAt=$started; monitorStoppedAt=([DateTime]::UtcNow.ToString('o')) } | ConvertTo-Json -Compress)
}
