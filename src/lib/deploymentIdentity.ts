/** Public deployment identifiers only; never serialize arbitrary environment data. */
export function deploymentIdentity(env: Record<string, string | undefined> = process.env) {
  const rawCommit = env.RAILWAY_GIT_COMMIT_SHA || env.BUILD_COMMIT_SHA || env.GITHUB_SHA || '';
  const rawBranch = env.RAILWAY_GIT_BRANCH || env.BUILD_BRANCH || '';
  return {
    commit: /^[a-fA-F0-9]{40}$/.test(rawCommit) ? rawCommit.toLowerCase() : null,
    branch: /^[A-Za-z0-9][A-Za-z0-9._/-]{0,119}$/.test(rawBranch) ? rawBranch : null,
  };
}
