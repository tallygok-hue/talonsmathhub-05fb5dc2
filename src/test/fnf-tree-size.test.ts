import { describe, it, expect } from 'vitest';

type TreeResponse = {
  tree: Array<{ path: string; type: string; size?: number }>;
  truncated?: boolean;
};

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

async function analyzeTree(url: string) {
  const res = await fetch(url);
  expect(res.ok).toBe(true);

  const json = (await res.json()) as TreeResponse;
  const blobs = json.tree.filter((item) => item.type === 'blob');
  const totalBytes = blobs.reduce((sum, item) => sum + (item.size ?? 0), 0);

  return {
    truncated: Boolean(json.truncated),
    totalFiles: blobs.length,
    totalBytes,
    totalMB: formatMb(totalBytes),
  };
}

describe('fnf web tree sizing', () => {
  it('logs file counts and sizes', async () => {
    const [mrMeowzz, week7] = await Promise.all([
      analyzeTree('https://api.github.com/repos/MrMeowzz/Funkin-MrMeowzz/git/trees/7171e5c6bf5249ea279be363649dd14afbc83635?recursive=1'),
      analyzeTree('https://api.github.com/repos/kckarnige/fnf-week-7-scrape/git/trees/352c83123855e7fd5c3f8875464c9cf555491c20?recursive=1'),
    ]);

    // eslint-disable-next-line no-console
    console.log({ mrMeowzz, week7 });
  }, 60000);
});
