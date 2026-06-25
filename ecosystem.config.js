module.exports = {
  apps: [
    {
      name: "tha-khlong-next-3003",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        PORT: 3003,
        NODE_ENV: "production"
      }
    },
    {
      name: "tha-khlong-ws",
      script: "npx",
      args: "tsx ws-server.ts",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};