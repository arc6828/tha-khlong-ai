module.exports = {
  apps: [
    {
      name: "tha-khlong-next-3003",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        PORT: 3003,
        WS_PORT: 3004,
        NODE_ENV: "production"
      }
    },
    {
      name: "tha-khlong-ws-3004",
      script: "npx",
      args: "tsx ws-server.ts",
      env: {
        PORT: 3004,
        NODE_ENV: "production"
      }
    }
  ]
};