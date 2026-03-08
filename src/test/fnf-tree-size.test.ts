import { describe, it, expect } from 'vitest';

describe('fnf web tree sizing', () => {
  it('logs file counts and sizes', async () => {
    const res = await fetch('https://api.github.com/repos/MrMeowzz/Funkin-MrMeowzz/git/trees/7171e5c6bf5249ea279be363649dd14afbc83635?recursive=1');
    expect(res.ok).toBe(true);

    const json = await res.json() as {
      tree: Array<{ path: string; type: string; size?: number }>;
      truncated?: boolean;
    };

    const blobs = json.tree.filter((item) => item.type === 'blob');
    const totalBytes = blobs.reduce((sum, item) => sum + (item.size ?? 0), 0);

    const bucket = (prefix: string) => {
      const items = blobs.filter((item) => item.path.startsWith(prefix));
      const bytes = items.reduce((sum, item) => sum + (item.size ?? 0), 0);
      return { count: items.length, bytes };
    };

    const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

    // eslint-disable-next-line no-console
    console.log({
      truncated: Boolean(json.truncated),
      totalFiles: blobs.length,
      totalBytes,
      totalMB: formatMb(totalBytes),
      assets: { ...bucket('assets/'), mb: formatMb(bucket('assets/').bytes) },
      mods: { ...bucket('mods/'), mb: formatMb(bucket('mods/').bytes) },
      flixel: { ...bucket('flixel/'), mb: formatMb(bucket('flixel/').bytes) },
      manifest: { ...bucket('manifest/'), mb: formatMb(bucket('manifest/').bytes) },
    });
  }, 60000);
});
