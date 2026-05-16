module.exports = {
  apps: [
    {
      name: "waitlist-next",
      script: "cmd.exe",
      args: "/c npm run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
}
