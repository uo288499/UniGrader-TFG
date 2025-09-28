// @ts-check
const argon2 = require("argon2");
const pkg = require("../package.json");
require("dotenv").config()

module.exports = {
  name: `${pkg.name}@${pkg.version}`,
  port: Number(process.env.PORT ?? 8001),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/unigrader_auth",
  
  // Configuration for the default global admin
  defaultAdmin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASS || "", // Will be hashed on creation
  },
  
  /**
   * @see https://www.npmjs.com/package/jsonwebtoken
   * @see https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#jwt
   */
  jwt: {
    /**
     * @type {import("jsonwebtoken").SignOptions}
     */
    opts: {
      expiresIn: "2h",
      issuer: "unigrader", 
      audience: "usr",
    },
    /**
     * @type {import("jsonwebtoken").VerifyOptions}
     */
    vOpts: {
      algorithms: ["HS256"],
      issuer: "unigrader", 
      audience: "usr",
    },
    secret: process.env.JWT_SECRET ?? "secret",
  },
  
  /**
   * @see https://www.npmjs.com/package/argon2
   * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id
   * @type {import("argon2").Options}
   */
  crypt: {
    type: argon2.argon2id,
    memoryCost: 12_288,
    timeCost: 3,
    parallelism: 1,
    secret: Buffer.from(process.env.CRYPT_SECRET ?? "secret"),
  },
  
  /**
   * @see https://www.npmjs.com/package/express-validator
   * @see https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#implement-proper-password-strength-controls
   * @type {import("validator").StrongPasswordOptions}
   */
  pass: {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  },

  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  email: {
    service: "gmail",
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },

  cloudinary: {
    cloudName: process.env.CLOUD_NAME,
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
  },
};
