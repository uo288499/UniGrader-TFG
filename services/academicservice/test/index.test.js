const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { beforeAll, afterAll, beforeEach, describe, it, expect } = require("@jest/globals");
const config = require("../src/config");
const { University } = require("../src/models");
const cloudinary = require("cloudinary").v2;

// ----------------------
// MOCK CLOUDINARY
// ----------------------
jest.mock("cloudinary", () => {
  const uploaderMock = {
    upload: jest.fn().mockResolvedValue({ secure_url: "https://mocked.url/logo.jpg" }),
    destroy: jest.fn().mockResolvedValue(true),
  };
  return {
    v2: {
      config: jest.fn(),
      uploader: uploaderMock,
    },
  };
});

jest.mock("axios", () => ({
  get: jest.fn().mockResolvedValue({
    data: [],
  }),
}));

// ----------------------
// SETUP DB & APP
// ----------------------
let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoUri = mongoServer.getUri();

  const src = require("../src");
  app = src.server;

  await new Promise((r) => setTimeout(r, 500));
});

afterAll(async () => {
  if (app) app.close();
  await mongoServer.stop();
});

// ----------------------
// HELPERS
// ----------------------
const createTestUniversity = async () => {
  const university = await University.create({
    name: "Test University",
    address: "123 Test Street",
    contactEmail: "contact@testuni.com",
    contactPhone: "123456789",
  });
  return university;
};

// ----------------------
// TESTS
// ----------------------
describe("Universities CRUD", () => {
  beforeEach(async () => {
    await University.deleteMany({});
    jest.clearAllMocks(); 
  });

  it("Should create a university with logos", async () => {
    const res = await request(app).post("/universities").send({
      name: "Uni Logo Test",
      smallLogoBase64: "data:image/png;base64,AAA",
      largeLogoBase64: "data:image/png;base64,BBB",
      address: "Some Street",
      contactEmail: "test@uni.com",
      contactPhone: "123456789",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.university.name).toBe("Uni Logo Test");
    expect(res.body.university.smallLogoUrl).toBe("https://mocked.url/logo.jpg");
    expect(res.body.university.largeLogoUrl).toBe("https://mocked.url/logo.jpg");
    expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(2);
  });

  it("Should get all universities", async () => {
    await createTestUniversity();
    const res = await request(app).get("/universities");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.universities.length).toBe(1);
  });

  it("Should get university by ID", async () => {
    const uni = await createTestUniversity();
    const res = await request(app).get(`/universities/${uni._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.university.name).toBe("Test University");
  });

  it("Should return 404 for invalid university ID", async () => {
    const res = await request(app).get("/universities/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("Should update university name and remove logos", async () => {
    const uni = await createTestUniversity();
    uni.smallLogoUrl = "https://mocked.url/old_small.jpg";
    uni.largeLogoUrl = "https://mocked.url/old_large.jpg";
    await uni.save();

    const res = await request(app).put(`/universities/${uni._id}`).send({
      name: "Updated Name",
      smallLogoUrl: "",
      largeLogoUrl: "",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.university.name).toBe("Updated Name");
    expect(res.body.university.smallLogoUrl).toBeNull();
    expect(res.body.university.largeLogoUrl).toBeNull();
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
  });

  it("Should delete university and logos", async () => {
    const uni = await createTestUniversity();
    uni.smallLogoUrl = "https://mocked.url/old_small.jpg";
    uni.largeLogoUrl = "https://mocked.url/old_large.jpg";
    await uni.save();

    const res = await request(app).delete(`/universities/${uni._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);

    const exists = await University.findById(uni._id);
    expect(exists).toBeNull();
  });
});
