// Publishes one version to npm from the release workflow, and is safe to re-run.
//
//   node scripts/publish-npm.mjs <version>
//
// Two failures shaped this. 0.5.7 published fine, but the registry showed it
// 96s after `npm publish` returned and the old check gave up at 100s, so a good
// release went red. Its re-run then failed outright, because npm refuses to
// publish a version that already exists. So: skip a version that is already
// there, treat npm's "cannot publish over" as success, and wait long enough.
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const PKG = '@aevantec/litevue';
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

// Long enough for the slowest propagation seen (96s) several times over
const DEFAULT_ATTEMPTS = 60;
const DEFAULT_INTERVAL_MS = 10_000;
const LOOKUP_RETRIES = 3;

const ALREADY_PUBLISHED_RE =
  /cannot publish over the previously published versions?/i;

/** Runs npm and captures its output; `status` is the exit code. */
const runNpm = (args) => {
  const r = spawnSync('npm', args, { encoding: 'utf8' });
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
};

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/**
 * Is this exact version on the registry? `published`, `missing` (an E404), or
 * `error` for anything else — a network failure must not read as "missing".
 * `--prefer-online` skips npm's local cache, which can hold a stale packument.
 */
export const lookup = (npm, pkg, version) => {
  const r = npm([
    'view',
    `${pkg}@${version}`,
    'version',
    '--json',
    '--prefer-online',
  ]);
  const body = parseJson(r.stdout.trim());
  if (r.status === 0 && body === version) return { state: 'published' };
  const code = body?.error?.code;
  if (code === 'E404') return { state: 'missing' };
  return {
    state: 'error',
    detail: code || r.stderr.trim().split('\n')[0] || `exit ${r.status}`,
  };
};

const reportProvenance = (npm, pkg, version, log) => {
  const r = npm([
    'view',
    `${pkg}@${version}`,
    'dist.attestations',
    '--json',
    '--prefer-online',
  ]);
  if (r.status === 0 && /provenance/.test(r.stdout)) {
    log(`provenance attestation present for ${version}`);
  } else {
    log(
      `::warning::${version} published without a provenance attestation — ` +
        `the repository is public, so this is a regression in the trusted publisher setup`
    );
  }
};

/** Resolves to the process exit code: 0 on success, 1 on failure. */
export const publishRelease = async ({
  pkg = PKG,
  version,
  npm = runNpm,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  log = console.log,
  attempts = DEFAULT_ATTEMPTS,
  intervalMs = DEFAULT_INTERVAL_MS,
}) => {
  if (!SEMVER_RE.test(version || '')) {
    log(`::error::expected a version such as 1.2.3, got "${version ?? ''}"`);
    return 1;
  }

  // An outage here would otherwise look like "missing" and publish blind
  let before = lookup(npm, pkg, version);
  for (let i = 1; before.state === 'error' && i < LOOKUP_RETRIES; i++) {
    await sleep(intervalMs);
    before = lookup(npm, pkg, version);
  }
  if (before.state === 'error') {
    log(
      `::error::could not reach the registry to check ${version}: ${before.detail}`
    );
    return 1;
  }

  if (before.state === 'published') {
    log(`${pkg}@${version} is already on the registry — skipping npm publish`);
  } else {
    // No NODE_AUTH_TOKEN: the job's OIDC token is the credential (trusted
    // publishing), and provenance is attached automatically.
    const r = npm(['publish']);
    // npm's notices, including the signed provenance statement, go to stderr
    if (r.stderr) log(r.stderr.trimEnd());
    if (r.stdout) log(r.stdout.trimEnd());
    if (r.status !== 0) {
      if (ALREADY_PUBLISHED_RE.test(r.stderr)) {
        // a re-run inside the propagation window: npm has it, the check did not
        log(
          `${version} was already published — npm refused to publish it again`
        );
      } else {
        log(`::error::npm publish failed for ${version}`);
        return 1;
      }
    }
  }

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const now = lookup(npm, pkg, version);
    if (now.state === 'published') {
      log(`visible on the registry after ${attempt} check(s)`);
      reportProvenance(npm, pkg, version, log);
      return 0;
    }
    log(
      `not visible yet (${now.state === 'error' ? now.detail : 'E404'}) — ` +
        `check ${attempt}/${attempts}`
    );
    if (attempt < attempts) await sleep(intervalMs);
  }

  log(
    `::error::${version} did not appear on the registry within ` +
      `${(attempts * intervalMs) / 1000}s. npm accepted the publish, so this ` +
      `may only be slow propagation: check the registry, and re-run the job if ` +
      `needed — a re-run skips publishing a version that is already there.`
  );
  return 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await publishRelease({ version: process.argv[2] });
}
