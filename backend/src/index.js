import express from 'express';
import { createApp } from './app.js';

// Vercel importa una aplicación, sin iniciar el servidor local ni su planificador.
const app = express();
app.disable('x-powered-by');
app.use(createApp());

export default app;
