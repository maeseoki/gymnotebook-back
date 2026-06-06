import { buildApp } from './app.js';

const app = await buildApp();

const host = process.env['HOST'] ?? '0.0.0.0';
const port = Number(process.env['PORT'] ?? 8080);

try {
  await app.listen({ host, port });
  console.log(`GymNotebook API listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
