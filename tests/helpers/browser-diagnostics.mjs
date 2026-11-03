/** Capture required-resource failures with their URLs; never hide OS resource errors by message text. */
export function collectBrowserDiagnostics(page, origin) {
  const errors = [];
  const requiredFailure = request => {
    const url = new URL(request.url());
    return !(url.origin === origin && url.pathname === '/favicon.ico');
  };
  page.on('pageerror', error => errors.push(`Runtime: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const location = message.location();
    // Only the browser's optional same-origin favicon is excluded, never an API/script/stylesheet.
    if (location.url && new URL(location.url, origin).href === `${origin}/favicon.ico`) return;
    errors.push(`Console: ${message.text()}${location.url ? ` (${location.url})` : ''}`);
  });
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText || 'UNKNOWN_NETWORK_FAILURE';
    // Navigation can cancel the previous document's images. This is not an API-error exception.
    if (failure === 'net::ERR_ABORTED' && ['image', 'document'].includes(request.resourceType())) return;
    if (requiredFailure(request)) errors.push(`Request: ${request.method()} ${request.url()} — ${failure}`);
  });
  page.on('response', response => {
    if (response.status() >= 400 && requiredFailure(response.request())) {
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return errors;
}

/** Isolated browser journeys use local fonts rather than depending on Google/provider availability. */
export async function useLocalFixtureFonts(context, origin) {
  await context.route(/^https:\/\/fonts\.googleapis\.com\//, route => route.fulfill({
    status: 200,
    contentType: 'text/css',
    body: `@font-face{font-family:Amiri;src:url("${origin}/fonts/Amiri-Regular.ttf")}@font-face{font-family:"Noto Nastaliq Urdu";src:url("${origin}/fonts/NotoNastaliqUrdu.ttf")}`,
  }));
}
