/** Keep actionable SDK/transport diagnostics while withholding configured credentials and customer contacts. */
export function outboxErrorDetails(error: unknown, sensitive: Array<string | undefined> = []) {
  const redact = (raw: string): string => {
    let value = raw;
    const configured = [...sensitive, ...Object.entries(process.env).filter(([key]) =>
      /SECRET|PRIVATE_KEY|TOKEN|PASSWORD|WEBHOOK_URL|CLIENT_EMAIL/.test(key)).map(([, secret]) => secret)].filter((v): v is string => Boolean(v && v.length >= 4));
    for (const secret of configured.sort((a, b) => b.length - a.length)) value = value.split(secret).join('[redacted]');
    return value.replace(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, '[redacted private key]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
      .replace(/(?:\+?92|0)3\d{9}\b/g, '[redacted phone]');
  };
  const err = error instanceof Error ? error : new Error(String(error));
  const cause = err.cause instanceof Error ? `\nCaused by: ${err.cause.stack || err.cause.message}` : '';
  return { errorMessage: redact(err.message), errorStack: redact((err.stack || `${err.name}: ${err.message}`) + cause) };
}
