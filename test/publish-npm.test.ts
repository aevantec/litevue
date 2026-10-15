import { describe, expect, test } from 'vitest';
// @ts-expect-error -- a plain .mjs script, untyped
import { publishRelease } from '../scripts/publish-npm.mjs';

/**
 * The release job's publish step, against a scripted registry. Each scenario is
 * one the real workflow has hit or can hit: 0.5.7 published fine and was
 * declared failed because the registry took 96s to show it, and its re-run then
 * failed because `npm publish` refuses an existing version.
 */

const PKG = '@aevantec/litevue';
const VERSION = '0.5.8';

type Reply = { status: number; stdout?: string; stderr?: string };
const visible: Reply = { status: 0, stdout: JSON.stringify(VERSION) };
const missing: Reply = {
  status: 1,
  stdout: JSON.stringify({ error: { code: 'E404', summary: 'No match' } }),
};
const offline: Reply = {
  status: 1,
  stdout: JSON.stringify({ error: { code: 'ETIMEDOUT', summary: 'timeout' } }),
};
const published: Reply = { status: 0, stdout: `+ ${PKG}@${VERSION}` };
const withProvenance: Reply = {
  status: 0,
  stdout: JSON.stringify({ provenance: { predicateType: 'slsa' } }),
};

/**
 * A fake `npm`: `view … version` answers come from `views` in order (the last
 * one repeats), `publish` from `publishReply`, and attestation reads from
 * `attestations`.
 */
const registry = ({
  views,
  publishReply = published,
  attestations = withProvenance,
}: {
  views: Reply[];
  publishReply?: Reply;
  attestations?: Reply;
}) => {
  const calls: string[][] = [];
  let i = 0;
  const npm = (args: string[]): Reply => {
    calls.push(args);
    if (args[0] === 'publish') return publishReply;
    if (args.includes('dist.attestations')) return attestations;
    return views[Math.min(i++, views.length - 1)];
  };
  return { npm, calls };
};

const run = async (
  npm: (args: string[]) => Reply,
  overrides: Record<string, unknown> = {}
) => {
  const lines: string[] = [];
  const code = await publishRelease({
    pkg: PKG,
    version: VERSION,
    npm,
    sleep: async () => {},
    log: (line: string) => lines.push(line),
    attempts: 5,
    intervalMs: 0,
    ...overrides,
  });
  return { code, out: lines.join('\n') };
};

const publishCalls = (calls: string[][]) =>
  calls.filter((a) => a[0] === 'publish').length;

describe('publishing a new version', () => {
  test('publishes, then waits until the registry shows it', async () => {
    // missing before publishing, then two polls before it appears — the 0.5.7
    // shape, where publish returned long before the version was readable
    const { npm, calls } = registry({
      views: [missing, missing, missing, visible],
    });
    const { code, out } = await run(npm);
    expect(code).toBe(0);
    expect(publishCalls(calls)).toBe(1);
    expect(out).toMatch(/visible on the registry after 3 check/);
  });

  test('reports why each check failed instead of hiding it', async () => {
    const { npm } = registry({ views: [missing, offline, visible] });
    const { code, out } = await run(npm);
    expect(code).toBe(0);
    expect(out).toContain('ETIMEDOUT');
  });

  test('reports provenance once the version is readable', async () => {
    const { npm } = registry({ views: [missing, visible] });
    const { out } = await run(npm);
    expect(out).toMatch(/provenance attestation present/);
  });

  test('warns when a readable version has no provenance', async () => {
    const { npm } = registry({
      views: [missing, visible],
      attestations: { status: 0, stdout: '' },
    });
    const { code, out } = await run(npm);
    expect(code).toBe(0);
    expect(out).toMatch(/::warning::.*without a provenance attestation/);
  });
});

describe('re-running a release', () => {
  test('skips publishing a version that is already on the registry', async () => {
    const { npm, calls } = registry({ views: [visible] });
    const { code, out } = await run(npm);
    expect(code).toBe(0);
    expect(publishCalls(calls)).toBe(0);
    expect(out).toMatch(/already on the registry/);
  });

  test('accepts npm refusing to publish over the same version', async () => {
    // a re-run inside the propagation window: the check still says missing,
    // but npm already has it
    const { npm, calls } = registry({
      views: [missing, missing, visible],
      publishReply: {
        status: 1,
        stderr:
          'npm error code E403\nnpm error You cannot publish over the previously published versions: 0.5.8.',
      },
    });
    const { code, out } = await run(npm);
    expect(code).toBe(0);
    expect(publishCalls(calls)).toBe(1);
    expect(out).toMatch(/already published/);
  });
});

describe('failures that must stay failures', () => {
  test('a rejected publish fails without waiting', async () => {
    const { npm, calls } = registry({
      views: [missing],
      publishReply: {
        status: 1,
        stderr: 'npm error code E403\nnpm error 403 Forbidden',
      },
    });
    const { code, out } = await run(npm);
    expect(code).toBe(1);
    expect(out).toMatch(/::error::npm publish failed/);
    // only the initial check; no polling after a failed publish
    expect(calls.filter((a) => a[0] === 'view')).toHaveLength(1);
  });

  test('an unreachable registry fails before publishing', async () => {
    const { npm, calls } = registry({ views: [offline] });
    const { code, out } = await run(npm);
    expect(code).toBe(1);
    expect(publishCalls(calls)).toBe(0);
    expect(out).toMatch(/::error::could not reach the registry.*ETIMEDOUT/);
  });

  test('a version that never appears fails, and says a re-run is safe', async () => {
    const { npm } = registry({ views: [missing] });
    const { code, out } = await run(npm);
    expect(code).toBe(1);
    expect(out).toMatch(/::error::.*did not appear on the registry/);
    expect(out).toMatch(/re-run/i);
    // provenance cannot be judged on a version nobody can read
    expect(out).not.toMatch(/without a provenance attestation/);
  });

  test('rejects a missing or malformed version', async () => {
    const { npm, calls } = registry({ views: [visible] });
    for (const version of ['', 'latest', '1.2']) {
      const { code } = await run(npm, { version });
      expect(code).toBe(1);
    }
    expect(calls).toHaveLength(0);
  });
});
