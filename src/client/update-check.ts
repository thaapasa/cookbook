// A home screen app on iPad resumes from memory instead of reloading, so it can
// run an old version long after a deploy. Check for a new version each time the
// app comes back to the foreground, and reload if there is one.

async function reloadIfOutdated() {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (!res.ok) return;
    const { buildId } = (await res.json()) as { buildId?: string };
    if (buildId && buildId !== __BUILD_ID__) location.reload();
  } catch {
    // Offline or a bad response: try again on the next visit.
  }
}

if (import.meta.env.PROD) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reloadIfOutdated();
  });
}
