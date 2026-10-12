/**
 * Concurrent launcher for both Backend Server and React Dashboard
 */
const { spawn } = require('child_process');
const path = require('path');

console.log('====================================================');
console.log('🚀 Starting CausalFunnel Full-Stack Analytics System');
console.log('====================================================\n');

// 1. Start Backend Server
const serverProcess = spawn('node', ['server/src/server.js'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..')
});

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// 2. Start Dashboard
const dashboardProcess = spawn(npmCmd, ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '../dashboard')
});

process.on('SIGINT', () => {
  console.log('\nStopping all services...');
  serverProcess.kill();
  dashboardProcess.kill();
  process.exit();
});
