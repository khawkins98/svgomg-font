#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
if (!existsSync(join(root, 'node_modules'))) {
  console.log('Installing dependencies (first run)...');
  await new Promise((resolve, reject) => {
    const p = spawn('npm', ['install'], { cwd: root, stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`npm install exited with ${code}`))));
  });
}
spawn('npx', ['vite'], { cwd: root, stdio: 'inherit' });
