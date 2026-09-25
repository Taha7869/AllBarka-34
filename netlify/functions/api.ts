import serverless from 'serverless-http';

let appHandler: ReturnType<typeof serverless> | null = null;
let loading: Promise<ReturnType<typeof serverless>> | null = null;

async function getHandler() {
  if (appHandler) return appHandler;
  if (!loading) {
    loading = (async () => {
      process.env.ALLBARKA_SERVERLESS = '1';
      const { app } = await import('../../server');
      appHandler = serverless(app);
      return appHandler;
    })();
  }
  return loading;
}

export async function handler(event: any, context: any) {
  const run = await getHandler();
  return run(event, context);
}
