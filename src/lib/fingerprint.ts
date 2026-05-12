// Stable device fingerprint — survives session/cookie clears better than IP,
// since school computers all share one WiFi IP. Combines hardware traits +
// a persistent localStorage seed (regenerated only if storage is wiped).

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function canvasFp(): string {
  try {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 50;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('TalonsMathHub-fp-✦', 2, 2);
    ctx.strokeStyle = 'rgba(0,80,200,0.5)';
    ctx.strokeRect(10, 10, 180, 30);
    return c.toDataURL();
  } catch { return ''; }
}

let cached: string | null = null;
const KEY = 'tmh_device_seed_v1';

export async function getDeviceHash(): Promise<string> {
  if (cached) return cached;
  let seed = localStorage.getItem(KEY);
  if (!seed) {
    seed = crypto.randomUUID();
    try { localStorage.setItem(KEY, seed); } catch {}
  }
  const traits = [
    seed,
    navigator.userAgent,
    navigator.platform,
    navigator.language,
    String(navigator.hardwareConcurrency || ''),
    String((navigator as any).deviceMemory || ''),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    canvasFp(),
  ].join('|');
  cached = await sha256(traits);
  return cached;
}
