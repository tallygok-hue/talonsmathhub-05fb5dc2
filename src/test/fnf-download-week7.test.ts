import { describe, it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

type TreeItem = {
  path: string;
  type: string;
};

describe('download local week7 fnf bundle', () => {
  it('downloads all src files into public/games/fnf/week7', async () => {
    const treeRes = await fetch('https://api.github.com/repos/kckarnige/fnf-week-7-scrape/git/trees/352c83123855e7fd5c3f8875464c9cf555491c20?recursive=1');
    expect(treeRes.ok).toBe(true);

    const treeJson = (await treeRes.json()) as { tree: TreeItem[]; truncated?: boolean };
    expect(treeJson.truncated).not.toBe(true);

    const files = treeJson.tree.filter((item) => item.type === 'blob').map((item) => item.path);

    for (const relativePath of files) {
      const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');
      const rawUrl = `https://raw.githubusercontent.com/kckarnige/fnf-week-7-scrape/main/src/${encodedPath}`;
      const outPath = join(process.cwd(), 'public', 'games', 'fnf', 'week7', relativePath);

      const response = await fetch(rawUrl);
      if (!response.ok) {
        throw new Error(`Failed to download ${rawUrl}: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, Buffer.from(arrayBuffer));
    }

    // eslint-disable-next-line no-console
    console.log(`Downloaded ${files.length} files to public/games/fnf/week7`);
  }, 300000);
});
