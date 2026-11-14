import express from 'express';
import { fileURLToPath } from 'node:url';
import authRouter from './authRouter.js';
import forecastRouter from './forecastRouter.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const clientDirectory = fileURLToPath(new URL('../../client/dist/', import.meta.url));
const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);

if (!Number.isSafeInteger(proxyHops) || proxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS должен быть целым неотрицательным числом.');
}
app.set('trust proxy', proxyHops);

app.use('/api/auth', authRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', forecastRouter);

app.use(express.static(clientDirectory));

app.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
});
