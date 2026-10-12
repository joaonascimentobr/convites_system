import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const backendHealthUrl = process.env.BACKEND_HEALTH_URL ?? 'http://127.0.0.1:3000/health';
const startupTimeoutMs = Number(process.env.BACKEND_STARTUP_TIMEOUT_MS ?? 60_000);
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const backendEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: process.env.PORT ?? '3000',
  DATABASE_URL:
    process.env.DATABASE_URL ??
    `file:${resolve(process.cwd(), 'apps/backend/prisma/dev.db').replaceAll('\\', '/')}`,
};
const children = new Set();
let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startProcess(label, args, env = process.env) {
  console.log(`[dev] Iniciando ${label}: ${pnpmCommand} ${args.join(' ')}`);
  const child = spawn(pnpmCommand, args, {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  children.add(child);
  child.once('error', (error) => {
    console.error(`[dev] Falha ao iniciar ${label}: ${error.message}`);
  });
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (!shuttingDown && code !== 0) {
      console.error(`[dev] ${label} encerrou com código ${code ?? 'desconhecido'}${signal ? ` (${signal})` : ''}.`);
    }
  });

  return child;
}

function stopProcess(child) {
  if (!child || child.exitCode !== null || child.killed || !child.pid) return;

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

async function stopAll(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) stopProcess(child);
  await sleep(250);
  process.exit(exitCode);
}

async function waitForBackend(backend) {
  const deadline = Date.now() + startupTimeoutMs;

  while (Date.now() < deadline) {
    if (backend.exitCode !== null) {
      throw new Error('o processo do backend encerrou antes de responder');
    }

    try {
      const response = await fetch(backendHealthUrl);
      if (response.ok) {
        console.log(`[dev] Backend saudável em ${backendHealthUrl}.`);
        return;
      }
    } catch {
      // O backend ainda está compilando ou iniciando.
    }

    await sleep(1000);
  }

  throw new Error(`backend não respondeu em ${startupTimeoutMs / 1000}s`);
}

process.on('SIGINT', () => void stopAll(0));
process.on('SIGTERM', () => void stopAll(0));

const backend = startProcess('backend', ['-C', 'apps/backend', 'start:dev'], backendEnv);

try {
  await waitForBackend(backend);
  const frontend = startProcess('frontend', ['-C', 'apps/frontend', 'dev']);
  const frontendResult = await new Promise((resolve) => {
    frontend.once('exit', (code, signal) => resolve({ code, signal }));
  });

  const code = frontendResult.code ?? 1;
  await stopAll(code);
} catch (error) {
  console.error(`[dev] ${error.message}`);
  await stopAll(1);
}
