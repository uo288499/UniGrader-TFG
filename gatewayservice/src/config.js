// @ts-check
const pkg = require("../package.json");

const config = {
  name: `${pkg.name}@${pkg.version}`,
  port: Number(process.env.PORT ?? 8000),
  urls: {
    authVerify: process.env.AUTH_SERVICE_URL ?? "http://localhost:8001",
    auth: (process.env.AUTH_SERVICE_URL ?? "http://localhost:8001") + "/public",
    academic: process.env.ACADEMIC_SERVICE_URL ?? "http://localhost:8002",
    eval: process.env.EVAL_SERVICE_URL ?? "http://localhost:8003",
    grade: process.env.GRADE_SERVICE_URL ?? "http://localhost:8004",
    audit: process.env.AUDIT_SERVICE_URL ?? "http://localhost:8005",
  },
  auth: {
    url: (process.env.AUTH_SERVICE_URL ?? "http://localhost:8001") + "/verify",
    paths: ["/academic", "/eval", "/grade", "/audit", "/authVerify"],
  },
  /** @type {import("http-proxy-middleware").Options} */
  proxyOpts: {
    changeOrigin: true,
    logger: undefined,
  },
  /** @type {import("cors").CorsOptions} */
  cors: {},
  /** @type {import("helmet").HelmetOptions} */
  helmet: {
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: null,
        connectSrc: "*",
      },
    },
  },
};

module.exports = config;
