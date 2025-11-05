const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { beforeAll, afterAll, beforeEach, describe, it, expect } = require("@jest/globals");
const config = require("../src/config");
const { User, EmailAccount } = require("../src/models");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const axios = require("axios");

jest.mock("axios");

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
  const sendMailMock = jest.fn().mockResolvedValue(true); 
  return {
    createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
  };
});

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

  const src = require("../src");
  app = src.server;
  createGlobalAdmin = src.createGlobalAdminIfMissing;

  await new Promise((r) => setTimeout(r, 500));
});

afterAll(async () => {
  if (app) app.close();
  await mongoServer.stop();
});

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

  it("Should reject login with non-existent email", async () => {
    const res = await request(app).post("/public/login").send({
      email: "nonexistent@test.com",
      password: "SomePassword123!"
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("invalidCredentials");
  });

  it("Should reject invalid credentials", async () => {
    await createTestUser();
    const res = await request(app).post("/public/login").send({
      email: "testuser@test.com",
      password: "WrongPass123!"
    });
    expect(res.status).toBe(400);
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
    expect(updatedAccount.resetPasswordToken).toBeDefined();
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
    const res = await request(app).put("/change-password").send({
      accountId: "64e999999999999999999999",
      password: "NewStrongPass123!",
      currentPassword: "SomePass123!",
    });
    expect(res.status).toBe(404);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Change password rejects wrong current password", async () => {
    const { emailAccount } = await createTestUser();
    const res = await request(app)
      .put("/change-password")
      .send({
        password: "NewStrongPass123!",
        currentPassword: "WrongPassword1!",
        accountId: emailAccount._id,
      });
    expect(res.status).toBe(401);
    expect(res.body.errorKey).toBe("passwordWrong");
  });

  it("Change password successfully returns 200", async () => {
    const { emailAccount } = await createTestUser();

    const res = await request(app)
      .put("/change-password")
      .send({
        password: "NewStrongPass123!",
        currentPassword: "TestPassword123!",
        accountId: emailAccount._id,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await EmailAccount.findById(emailAccount._id);
    const valid = await argon2.verify(updated.password, "NewStrongPass123!", config.crypt);
    expect(valid).toBe(true);
  });
});

describe("Users CRUD", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await EmailAccount.deleteMany({});
  });

  it("Create user", async () => {
    const res = await request(app).post("/users").send({
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
    await request(app).post("/users").send({
      identityNumber: "user1",
      name: "John",
      firstSurname: "Doe",
      email: "john@example.com",
      role: "student",
      password: "NewStrongPass123!"
    });
    const res = await request(app).get("/users");
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBe(1);
  });

  it("Get user by ID", async () => {
    const { testUser } = await createTestUser();
    const res = await request(app).get(`/users/${testUser._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.identityNumber).toBe("testuser1");
  });

  it("Update user", async () => {
    const { emailAccount } = await createTestUser();
    const res = await request(app).put(`/users/${emailAccount._id}`).send({
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
    const res = await request(app).delete(`/users/${emailAccount._id}`);
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
    const res = await request(app).post("/accounts").send({
      email: "new@example.com",
      role: "student",
      userId: testUser._id
    });
    expect(res.status).toBe(201);
    expect(res.body.account).toBeDefined();
  });

  it("Should reject creation if email already exists", async () => {
    const { testUser } = await createTestUser();
    await request(app).post("/accounts").send({
      email: "testuser@test.com",
      role: "student",
      userId: testUser._id,
    });
    const res = await request(app).post("/accounts").send({
      email: "testuser@test.com",
      role: "student",
      userId: testUser._id,
    });
    expect(res.status).toBe(400);
    expect(res.body.errorKey).toBe("emailExists");
  });

  it("Get accounts", async () => {
    await createTestUser();
    const res = await request(app).get("/accounts");
    expect(res.status).toBe(200);
    expect(res.body.accounts.length).toBe(1);
  });

  it("Get account by ID", async () => {
    const { emailAccount } = await createTestUser();
    const res = await request(app).get(`/accounts/${emailAccount._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.account.email).toBe("testuser@test.com");
  });

  it("Should return 404 if account not found", async () => {
    const res = await request(app).get("/accounts/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Delete account", async () => {
    const { emailAccount } = await createTestUser();
    const res = await request(app).delete(`/accounts/${emailAccount._id}`);
    expect(res.status).toBe(200);
    const exists = await EmailAccount.findById(emailAccount._id);
    expect(exists).toBeNull();
  });

  it("Should return 404 when deleting a non-existent account", async () => {
    const res = await request(app).delete("/accounts/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Get accounts by university ID", async () => {
    const { testUser } = await createTestUser();
    const universityId = "64e999999999999999999999";
    await EmailAccount.updateOne({ userId: testUser._id }, { universityId });

    axios.get.mockResolvedValueOnce({
      data: { _id: universityId, name: "University of Testing" },
    });

    const res = await request(app).get(`/accounts/by-university/${universityId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.accounts)).toBe(true);
    expect(res.body.accounts.length).toBe(1);

    const account = res.body.accounts[0];
    expect(account.university).toEqual({
      _id: universityId,
      name: "University of Testing",
    });
    expect(account.universityId).toBe(universityId);
  });
});

describe("Import users", () => {
  it("Should import valid users successfully", async () => {
    axios.get.mockResolvedValueOnce({
      data: { universities: [{ _id: "64e999999999999999999999", name: "University of Testing" }] }
    });

    const res = await request(app).post("/users/import").send({
      user: { role: "global-admin" },
      rows: [
        {
          identityNumber: "A001",
          name: "Alice",
          firstSurname: "Doe",
          secondSurname: "",
          email: "alice@test.com",
          role: "student",
          university: "University of Testing"
        }
      ]
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.added).toContain("alice@test.com");
    expect(res.body.errors.length).toBe(0);
  });

  it("Should reject empty import", async () => {
    const res = await request(app).post("/users/import").send({
      user: { role: "global-admin" },
      rows: []
    });
    expect(res.status).toBe(400);
    expect(res.body.errorKey).toBe("emptyCSV");
  });

  it("Should detect duplicated emails in file", async () => {
    axios.get.mockResolvedValueOnce({ data: { universities: [] } });

    const res = await request(app).post("/users/import").send({
      user: { role: "global-admin" },
      rows: [
        {
          identityNumber: "A001",
          name: "Alice",
          firstSurname: "Doe",
          email: "dup@test.com",
          role: "student"
        },
        {
          identityNumber: "A002",
          name: "Bob",
          firstSurname: "Doe",
          email: "dup@test.com",
          role: "student"
        }
      ]
    });

    expect(res.status).toBe(200);
    expect(res.body.errors.some(e => e.errorKey === "accountDuplicatedInFile")).toBe(true);
  });

  it("Should reject invalid university name", async () => {
    axios.get.mockResolvedValueOnce({ data: { universities: [] } });
    
    const res = await request(app).post("/users/import").send({
      user: { role: "global-admin" },
      rows: [
        {
          identityNumber: "A001",
          name: "Alice",
          firstSurname: "Doe",
          email: "alice@test.com",
          role: "student",
          university: "Nonexistent University"
        }
      ]
    });

    expect(res.status).toBe(200);
    expect(res.body.errors[0].errorKey).toBe("invalidUniversity");
  });

  it("Should prevent non-global admin from creating users in another university", async () => {
    axios.get.mockResolvedValueOnce({
      data: { universities: [{ _id: "64e999999999999999999999", name: "Other University" }] }
    });

    const res = await request(app).post("/users/import").send({
      user: { role: "admin", universityId: "64e111111111111111111111" },
      rows: [
        {
          identityNumber: "A001",
          name: "Alice",
          firstSurname: "Doe",
          email: "alice@test.com",
          role: "student",
          university: "Other University"
        }
      ]
    });

    expect(res.status).toBe(200);
    expect(res.body.errors[0].errorKey).toBe("invalidUniversity");
  });
});