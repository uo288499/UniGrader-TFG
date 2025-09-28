const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { beforeAll, afterAll, beforeEach, describe, it, expect } = require("@jest/globals");
const config = require("../src/config");
const { User, EmailAccount } = require("../src/models");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

// ----------------------
// MOCK CLOUDINARY
// ----------------------
jest.mock("cloudinary", () => {
  const uploaderMock = {
    upload: jest.fn().mockResolvedValue({ secure_url: "https://mocked.url/photo.jpg" }),
    destroy: jest.fn().mockResolvedValue(true),
  };
  return {
    v2: {
      config: jest.fn(),
      uploader: uploaderMock,
    },
  };
});

jest.mock("nodemailer", () => {
  const sendMailMock = jest.fn().mockResolvedValue(true); // simula envío exitoso
  return {
    createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
  };
});

// ----------------------
// SETUP DB & APP
// ----------------------
let mongoServer;
let app;
let createGlobalAdmin;

const adminUser = {
  email: config.defaultAdmin.email,
  password: config.defaultAdmin.password,
  role: "global-admin",
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoUri = mongoServer.getUri();

  // Carga app DESPUÉS de los mocks
  const src = require("../src");
  app = src.server;
  createGlobalAdmin = src.createGlobalAdminIfMissing;

  await new Promise((r) => setTimeout(r, 500));
});

afterAll(async () => {
  if (app) app.close();
  await mongoServer.stop();
});

// ----------------------
// HELPERS
// ----------------------
const createTestUser = async () => {
  const hashedPassword = await argon2.hash("TestPassword123!", config.crypt);
  const testUser = await User.create({
    identityNumber: "testuser1",
    name: "Test",
    firstSurname: "User",
  });
  const emailAccount = await EmailAccount.create({
    email: "testuser@test.com",
    password: hashedPassword,
    userId: testUser._id,
    role: "student",
  });
  return { testUser, emailAccount };
};

// ----------------------
// TESTS
// ----------------------
describe("Auth & Admin", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await EmailAccount.deleteMany({});
  });

  it("Should create global admin if missing", async () => {
    await createGlobalAdmin();
    const account = await EmailAccount.findOne({ email: adminUser.email });
    expect(account).toBeDefined();
    const user = await User.findById(account.userId);
    expect(user).toBeDefined();
    const isPasswordValid = await argon2.verify(account.password, adminUser.password, config.crypt);
    expect(isPasswordValid).toBe(true);
  });

  it("Should not create duplicate global admin", async () => {
    await createGlobalAdmin();
    await createGlobalAdmin();
    const adminAccounts = await EmailAccount.find({ role: adminUser.role });
    expect(adminAccounts.length).toBe(1);
  });
});

describe("Public Routes (Login / Verify)", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await EmailAccount.deleteMany({});
  });

  it("Should perform a successful login", async () => {
    await createTestUser();
    const res = await request(app).post("/public/login").send({
      email: "testuser@test.com",
      password: "TestPassword123!"
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("token");
  });

  it("Should reject invalid credentials", async () => {
    await createTestUser();
    const res = await request(app).post("/public/login").send({
      email: "testuser@test.com",
      password: "WrongPass123!"
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("Should verify a valid token", async () => {
    const { emailAccount } = await createTestUser();
    const token = jwt.sign(
      { userId: emailAccount.userId, email: emailAccount.email, role: emailAccount.role },
      config.jwt.secret,
      config.jwt.opts
    );
    const res = await request(app).post("/verify").send({ token });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("Should reject invalid token", async () => {
    const token = jwt.sign({ userId: "123" }, "wrong-secret");
    const res = await request(app).post("/verify").send({ token });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("Password Recovery / Change", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await EmailAccount.deleteMany({});
  });

  it("Forgot password generates token", async () => {
    const { emailAccount } = await createTestUser();
    const res = await request(app).post("/public/forgot-password").send({
      email: emailAccount.email,
      language: "en"
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedAccount = await EmailAccount.findById(emailAccount._id);
    expect(updatedAccount.resetPasswordToken).toBeDefined(); // CORREGIDO
  });

  it("Reset password updates account", async () => {
    const { emailAccount } = await createTestUser();
    const resetToken = jwt.sign({ id: emailAccount._id }, config.jwt.secret, { expiresIn: '1h' });
    emailAccount.resetPasswordToken = resetToken;
    emailAccount.resetPasswordExpires = new Date(Date.now() + 3600000);
    await emailAccount.save();

    const res = await request(app).post(`/public/reset-password/${resetToken}`).send({
      password: "NewStrongPass123!"
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await EmailAccount.findById(emailAccount._id);
    const valid = await argon2.verify(updated.password, "NewStrongPass123!", config.crypt);
    expect(valid).toBe(true);
  });

  it("Change password returns 404 for invalid accountId", async () => {
    const res = await request(app).post("/change-password").send({
      accountId: "64e999999999999999999999",
      password: "NewStrongPass123!"
    });
    expect(res.status).toBe(404);
  });
});

describe("Users CRUD", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await EmailAccount.deleteMany({});
  });

  it("Create user", async () => {
    const res = await request(app).post("/public/users").send({
      identityNumber: "user1",
      name: "John",
      firstSurname: "Doe",
      email: "john@example.com",
      role: "student",
      password: "NewStrongPass123!"
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.account).toBeDefined();
  });

  it("Get users", async () => {
    await request(app).post("/public/users").send({
      identityNumber: "user1",
      name: "John",
      firstSurname: "Doe",
      email: "john@example.com",
      role: "student",
      password: "NewStrongPass123!"
    });
    const res = await request(app).get("/public/users");
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBe(1);
  });

  it("Update user", async () => {
    const { emailAccount } = await createTestUser();
    const res = await request(app).put(`/public/users/${emailAccount._id}`).send({
      name: "Updated",
      identityNumber: "testuser1",
      firstSurname: "User",
      email: emailAccount.email,
      role: emailAccount.role
    });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Updated");
  });

  it("Delete user", async () => {
    const { emailAccount } = await createTestUser();
    const res = await request(app).delete(`/public/users/${emailAccount._id}`);
    expect(res.status).toBe(200);
    const exists = await User.findById(emailAccount.userId);
    expect(exists).toBeNull();
  });
});

describe("Accounts CRUD", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await EmailAccount.deleteMany({});
  });

  it("Create account", async () => {
    const { testUser } = await createTestUser();
    const res = await request(app).post("/public/accounts").send({
      email: "new@example.com",
      role: "student",
      userId: testUser._id
    });
    expect(res.status).toBe(201);
    expect(res.body.account).toBeDefined();
  });

  it("Get accounts", async () => {
    await createTestUser();
    const res = await request(app).get("/public/accounts");
    expect(res.status).toBe(200);
    expect(res.body.accounts.length).toBe(1);
  });

  it("Delete account", async () => {
    const { emailAccount } = await createTestUser();
    const res = await request(app).delete(`/public/accounts/${emailAccount._id}`);
    expect(res.status).toBe(200);
    const exists = await EmailAccount.findById(emailAccount._id);
    expect(exists).toBeNull();
  });
});
