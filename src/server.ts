import { createApp } from './app.js';
import { readEnvironment } from './config/env.js';

const environment = readEnvironment(process.env);
const app = createApp();

await app.listen({ host: '0.0.0.0', port: environment.PORT });
