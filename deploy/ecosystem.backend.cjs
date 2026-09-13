/** PM2 config — set REPO_ROOT before use, or edit cwd below */
const repoRoot = process.env.REPO_ROOT || '/home/ubuntu/LiveServer/LiveStreaming';
const backendDir = `${repoRoot}/backend`;

module.exports = {
  apps: [
    {
      name: 'cctv-api',
      script: 'dist/server.js',
      cwd: backendDir,
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
