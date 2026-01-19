module.exports = {
  apps: [
    {
      name: "api",
      cwd: "/var/www/shopit/apps/api/dist",
      script: "main.js",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        NODE_PATH: "/var/www/shopit/apps/api/dist/workspace_modules",
      },
    },
    {
      name: "web",
      cwd: "/var/www/shopit/apps/web",
      script: "../../node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
