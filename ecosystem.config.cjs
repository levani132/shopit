module.exports = {
  apps: [
    {
      name: "api",
      cwd: "/var/www/shopit/apps/api",
      script: "dist/main.js",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
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
