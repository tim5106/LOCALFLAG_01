import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.info(`Local Flag API listening on http://localhost:${env.PORT}/api/v1`);
});

