import { buildApp } from './app.js';

const PORT = Number(process.env.PORT || 4000);

async function start() {
  const app = await buildApp();
  await app.listen({ port: PORT, host: '127.0.0.1' });
  console.log(`BeeloftMetric API listening at http://127.0.0.1:${PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
