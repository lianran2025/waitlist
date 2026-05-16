module.exports = {
  apps: [
    {
      name: "waitlist-next",
      script: "npm.cmd",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "waitlist-flask",
      script: "python.exe",
      args: "main.py",
      cwd: __dirname,
      env: {
        FLASK_HOST: "127.0.0.1",
        FLASK_PORT: "5000",
      },
    },
  ],
}
