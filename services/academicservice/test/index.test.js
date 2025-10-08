const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { beforeAll, afterAll, beforeEach, describe, it, expect } = require("@jest/globals");
const config = require("../src/config");
const { University, AcademicYear, Course, Subject, StudyProgram, Enrollment, EvaluationType, Group } = require("../src/models");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const axios = require("axios");

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

// ----------------------
// MOCK AXIOS
// ----------------------
jest.mock("axios");

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

    axios.get.mockResolvedValue({ data: { accounts: [] } });

    const res = await request(app).delete(`/universities/${uni._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);

    const exists = await University.findById(uni._id);
    expect(exists).toBeNull();
  });
});

describe("AcademicYears CRUD", () => {
  let university;
  let userMock;

  beforeEach(async () => {
    await AcademicYear.deleteMany({});
    await University.deleteMany({});
    jest.clearAllMocks();

    university = await University.create({
      name: "Academic Year Test University",
      address: "1 AY Street",
      contactEmail: "ay@test.com",
      contactPhone: "111111111",
    });

    userMock = {
      _id: new mongoose.Types.ObjectId(),
      universityId: university._id.toString(),
    };
  });

  it("Should create an academic year successfully", async () => {
    const res = await request(app).post("/academicyears").send({
      yearLabel: "2024/2025",
      startDate: "2024-09-01",
      endDate: "2025-06-30",
      user: userMock,
      universityId: university._id.toString(),
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.academicYear.yearLabel).toBe("2024/2025");
  });

  it("Should not allow creating duplicate academic year for same university", async () => {
    await AcademicYear.create({
      yearLabel: "2024/2025",
      startDate: "2024-09-01",
      endDate: "2025-06-30",
      universityId: university._id,
      user: userMock,
    });

    const res = await request(app).post("/academicyears").send({
      yearLabel: "2024/2025",
      startDate: "2024-09-01",
      endDate: "2025-06-30",
      user: userMock,
      universityId: university._id.toString(),
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("yearExists");
  });

  it("Should list academic years by university", async () => {
    await AcademicYear.create({
      yearLabel: "2025/2026",
      startDate: "2025-09-01",
      endDate: "2026-06-30",
      universityId: university._id,
      user: userMock,
    });

    const res = await request(app).get(`/academicyears/by-university/${university._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.years)).toBe(true);
    expect(res.body.years.length).toBe(1);
    expect(res.body.years[0].yearLabel).toBe("2025/2026");
  });

  it("Should get an academic year by ID", async () => {
    const year = await AcademicYear.create({
      yearLabel: "2026/2027",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
      universityId: university._id,
      user: userMock,
    });

    const res = await request(app).get(`/academicyears/${year._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.academicYear.yearLabel).toBe("2026/2027");
  });

  it("Should return 404 if academic year not found", async () => {
    const randomId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/academicyears/${randomId}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Should update an academic year successfully", async () => {
    const year = await AcademicYear.create({
      yearLabel: "2027/2028",
      startDate: "2027-09-01",
      endDate: "2028-06-30",
      universityId: university._id,
      user: userMock,
    });

    const res = await request(app).put(`/academicyears/${year._id}`).send({
      yearLabel: "2028/2029",
      startDate: "2028-09-01",
      endDate: "2029-06-30",
      user: userMock,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.academicYear.yearLabel).toBe("2028/2029");
  });

  it("Should prevent updating to duplicate yearLabel in same university", async () => {
    const yearA = await AcademicYear.create({
      yearLabel: "2030/2031",
      startDate: "2030-09-01",
      endDate: "2031-06-30",
      universityId: university._id,
      user: userMock,
    });

    const yearB = await AcademicYear.create({
      yearLabel: "2031/2032",
      startDate: "2031-09-01",
      endDate: "2032-06-30",
      universityId: university._id,
      user: userMock,
    });

    const res = await request(app).put(`/academicyears/${yearB._id}`).send({
      yearLabel: "2030/2031",
      startDate: "2031-09-01",
      endDate: "2032-06-30",
      user: userMock,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("yearExists");
  });

  it("Should delete an academic year successfully", async () => {
    const year = await AcademicYear.create({
      yearLabel: "2032/2033",
      startDate: "2032-09-01",
      endDate: "2033-06-30",
      universityId: university._id,
      user: userMock,
    });

    const res = await request(app).delete(`/academicyears/${year._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await AcademicYear.findById(year._id);
    expect(deleted).toBeNull();
  });

  it("Should return 404 when deleting non-existing academic year", async () => {
    const randomId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/academicyears/${randomId}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });
});

describe("StudyPrograms CRUD", () => {
  let testUniversity;

  beforeEach(async () => {
    await StudyProgram.deleteMany({});
    await University.deleteMany({});
    jest.clearAllMocks();

    testUniversity = await University.create({
      name: "Test University",
      address: "123 Test Street",
      contactEmail: "contact@testuni.com",
      contactPhone: "123456789",
    });
  });

  it("Should create a study program", async () => {
    const res = await request(app).post("/studyprograms").send({
      name: "Computer Science",
      type: "Bachelor",
      universityId: testUniversity._id,
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.program.name).toBe("Computer Science");

    const inDb = await StudyProgram.findOne({ name: "Computer Science" });
    expect(inDb).not.toBeNull();
  });

  it("Should not create duplicate study program for same university", async () => {
    await StudyProgram.create({
      name: "Computer Science",
      type: "Bachelor",
      universityId: testUniversity._id,
    });

    const res = await request(app).post("/studyprograms").send({
      name: "Computer Science",
      type: "Bachelor",
      universityId: testUniversity._id,
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("programExists");
  });

  it("Should get all study programs by university", async () => {
    await StudyProgram.create({
      name: "Software Engineering",
      type: "Bachelor",
      universityId: testUniversity._id,
    });

    const res = await request(app).get(`/studyprograms/by-university/${testUniversity._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.programs.length).toBe(1);
    expect(res.body.programs[0].name).toBe("Software Engineering");
  });

  it("Should get study program by ID", async () => {
    const program = await StudyProgram.create({
      name: "Math Program",
      type: "Bachelor",
      universityId: testUniversity._id,
    });

    const res = await request(app).get(`/studyprograms/${program._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.program.name).toBe("Math Program");
  });

  it("Should return 404 if study program not found", async () => {
    const res = await request(app).get("/studyprograms/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Should update study program name", async () => {
    const program = await StudyProgram.create({
      name: "Physics Program",
      type: "Bachelor",
      universityId: testUniversity._id,
    });

    const res = await request(app).put(`/studyprograms/${program._id}`).send({
      name: "Updated Physics Program",
      type: "Bachelor",
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.program.name).toBe("Updated Physics Program");
  });

  it("Should not update to duplicate name in same university", async () => {
    await StudyProgram.create({
      name: "Chemistry",
      type: "Bachelor",
      universityId: testUniversity._id,
    });
    const program = await StudyProgram.create({
      name: "Biology",
      type: "Bachelor",
      universityId: testUniversity._id,
    });

    const res = await request(app).put(`/studyprograms/${program._id}`).send({
      name: "Chemistry",
      type: "Bachelor",
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("programExists");
  });

  it("Should delete a study program", async () => {
    const program = await StudyProgram.create({
      name: "History",
      type: "Bachelor",
      universityId: testUniversity._id,
    });

    const res = await request(app).delete(`/studyprograms/${program._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const exists = await StudyProgram.findById(program._id);
    expect(exists).toBeNull();
  });

  it("Should return 404 when deleting nonexistent study program", async () => {
    const res = await request(app).delete("/studyprograms/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });
});

describe("EvaluationTypes CRUD", () => {
  let testUniversity;

  beforeEach(async () => {
    const { University } = require("../src/models");
    const { EvaluationType } = require("../src/models");
    await University.deleteMany({});
    await EvaluationType.deleteMany({});
    testUniversity = await University.create({
      name: "EvalTest University",
      address: "Some Street",
      contactEmail: "eval@uni.com",
      contactPhone: "111222333",
    });
  });

  it("Should create an evaluation type", async () => {
    const res = await request(app).post("/evaluation-types").send({
      name: "Exam",
      universityId: testUniversity._id,
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.evaluationType.name).toBe("Exam");
  });

  it("Should not create duplicate evaluation type for same university", async () => {
    const { EvaluationType } = require("../src/models");
    await EvaluationType.create({
      name: "Exam",
      universityId: testUniversity._id,
    });

    const res = await request(app).post("/evaluation-types").send({
      name: "Exam",
      universityId: testUniversity._id,
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("evaluationTypeExists");
  });

  it("Should get all evaluation types by university", async () => {
    const { EvaluationType } = require("../src/models");
    await EvaluationType.create({
      name: "Project",
      universityId: testUniversity._id,
    });

    const res = await request(app).get(`/evaluation-types/by-university/${testUniversity._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.evaluationTypes.length).toBe(1);
    expect(res.body.evaluationTypes[0].name).toBe("Project");
  });

  it("Should get evaluation type by ID", async () => {
    const { EvaluationType } = require("../src/models");
    const type = await EvaluationType.create({
      name: "Presentation",
      universityId: testUniversity._id,
    });

    const res = await request(app).get(`/evaluation-types/${type._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.evaluationType.name).toBe("Presentation");
  });

  it("Should return 404 if evaluation type not found", async () => {
    const res = await request(app).get("/evaluation-types/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("Should update evaluation type name", async () => {
    const { EvaluationType } = require("../src/models");
    const type = await EvaluationType.create({
      name: "Oral",
      universityId: testUniversity._id,
    });

    const res = await request(app).put(`/evaluation-types/${type._id}`).send({
      name: "Written",
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.evaluationType.name).toBe("Written");
  });

  it("Should not update to duplicate name in same university", async () => {
    const { EvaluationType } = require("../src/models");
    const t1 = await EvaluationType.create({
      name: "Quiz",
      universityId: testUniversity._id,
    });
    await EvaluationType.create({
      name: "Final",
      universityId: testUniversity._id,
    });

    const res = await request(app).put(`/evaluation-types/${t1._id}`).send({
      name: "Final",
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("evaluationTypeExists");
  });

  it("Should delete an evaluation type", async () => {
    const { EvaluationType } = require("../src/models");
    const type = await EvaluationType.create({
      name: "Midterm",
      universityId: testUniversity._id,
    });

    const res = await request(app).delete(`/evaluation-types/${type._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const exists = await EvaluationType.findById(type._id);
    expect(exists).toBeNull();
  });

  it("Should return 404 when deleting nonexistent evaluation type", async () => {
    const res = await request(app).delete("/evaluation-types/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("Enrollments CRUD", () => {
  let testUniversity, testProgram, testYear;
  const mockedAccount = {
    _id: new mongoose.Types.ObjectId(),
    email: "alice@example.com",
    role: "student",
    universityId: new mongoose.Types.ObjectId(),
    user: {
      _id: new mongoose.Types.ObjectId(),
      identityNumber: "12345678A",
      name: "Alice",
      firstSurname: "Fernández",
      secondSurname: "Cabrero",
      photoUrl: "http://photo.com/alice.jpg",
    },
  };

  beforeEach(async () => {
    await University.deleteMany({});
    await StudyProgram.deleteMany({});
    await AcademicYear.deleteMany({});
    await Enrollment.deleteMany({});

    // Create base university
    testUniversity = await University.create({
      name: "Enrollment University",
      address: "Main St",
      contactEmail: "uni@test.com",
      contactPhone: "123456789",
    });

    // Create dependencies
    testProgram = await StudyProgram.create({
      name: "Software Engineering",
      type: "Bachelor",
      universityId: testUniversity._id,
    });

    testYear = await AcademicYear.create({
      yearLabel: "2024/2025",
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-07-01"),
      universityId: testUniversity._id,
    });

    // Mock axios.get to return the "external" account
    axios.get.mockResolvedValue({
      data: { account: mockedAccount },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should create an enrollment", async () => {
    const res = await request(app).post("/enrollments").send({
      accountId: mockedAccount._id,
      studyProgramId: testProgram._id,
      academicYearId: testYear._id,
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.enrollment.accountId).toBe(String(mockedAccount._id));
  });

  it("Should not create duplicate enrollment", async () => {
    await Enrollment.create({
      accountId: mockedAccount._id,
      studyProgramId: testProgram._id,
      academicYearId: testYear._id,
    });

    const res = await request(app).post("/enrollments").send({
      accountId: mockedAccount._id,
      studyProgramId: testProgram._id,
      academicYearId: testYear._id,
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("enrollmentExists");
  });

  it("Should get all enrollments (with mocked accounts)", async () => {
    await Enrollment.create({
      accountId: mockedAccount._id,
      studyProgramId: testProgram._id,
      academicYearId: testYear._id,
    });

    const res = await request(app).get("/enrollments");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.enrollments.length).toBe(1);
    expect(res.body.enrollments[0].account.email).toBe("alice@example.com");
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it("Should handle axios failure gracefully (account null)", async () => {
    await Enrollment.create({
      accountId: mockedAccount._id,
      studyProgramId: testProgram._id,
      academicYearId: testYear._id,
    });

    axios.get.mockRejectedValueOnce(new Error("Network error"));

    const res = await request(app).get("/enrollments");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.enrollments[0].account).toBeNull();
  });

  it("Should get enrollment by ID", async () => {
    const enr = await Enrollment.create({
      accountId: mockedAccount._id,
      studyProgramId: testProgram._id,
      academicYearId: testYear._id,
    });

    const res = await request(app).get(`/enrollments/${enr._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.enrollment.account.email).toBe("alice@example.com");
  });

  it("Should return 404 if enrollment not found", async () => {
    const res = await request(app).get("/enrollments/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("Should get enrollments by university", async () => {
    await Enrollment.create({
      accountId: mockedAccount._id,
      studyProgramId: testProgram._id,
      academicYearId: testYear._id,
    });

    const res = await request(app).get(`/enrollments/by-university/${testUniversity._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.enrollments.length).toBe(1);
    expect(res.body.enrollments[0].account.email).toBe("alice@example.com");
  });

  it("Should delete an enrollment", async () => {
    const enr = await Enrollment.create({
      accountId: mockedAccount._id,
      studyProgramId: testProgram._id,
      academicYearId: testYear._id,
    });

    const res = await request(app).delete(`/enrollments/${enr._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const exists = await Enrollment.findById(enr._id);
    expect(exists).toBeNull();
  });

  it("Should return 404 when deleting nonexistent enrollment", async () => {
    const res = await request(app).delete("/enrollments/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("Subjects CRUD", () => {
  let testUniversity;
  let testProgram;
  let mockedPolicy;

  beforeEach(async () => {
    await Subject.deleteMany({});
    await StudyProgram.deleteMany({});
    await University.deleteMany({});
    jest.clearAllMocks();

    testUniversity = await University.create({
      name: "Subject University",
      address: "1 Subj St",
      contactEmail: "subject@test.com",
      contactPhone: "111111111",
    });

    testProgram = await StudyProgram.create({
      name: "Test Program",
      type: "Bachelor",
      universityId: testUniversity._id,
    });

    mockedPolicy = { data: { policy: { _id: new mongoose.Types.ObjectId() } } };
  });

  it("Should create a subject with policy", async () => {
    axios.post.mockResolvedValue(mockedPolicy);

    const res = await request(app).post("/subjects").send({
      name: "Math",
      code: "MATH101",
      universityId: testUniversity._id,
      studyProgramIds: [testProgram._id],
      policyRules: [
        { evaluationTypeId: new mongoose.Types.ObjectId(), minPercentage: 0, maxPercentage: 100 },
      ],
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.subject.name).toBe("Math");
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it("Should not create duplicate subject code for same university", async () => {
    await Subject.create({
      name: "Math",
      code: "MATH101",
      universityId: testUniversity._id,
    });

    const res = await request(app).post("/subjects").send({
      name: "Math Advanced",
      code: "MATH101",
      universityId: testUniversity._id,
      studyProgramIds: [testProgram._id],
      policyRules: [
        { evaluationTypeId: new mongoose.Types.ObjectId(), minPercentage: 0, maxPercentage: 100 },
      ],
      user: { universityId: testUniversity._id },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("subjectExists");
  });

  it("Should get subject by ID with policy", async () => {
    const subj = await Subject.create({
      name: "Physics",
      code: "PHY101",
      universityId: testUniversity._id,
    });

    axios.get.mockResolvedValue(mockedPolicy);

    const res = await request(app).get(`/subjects/${subj._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subject.name).toBe("Physics");
    expect(res.body.policy).toBeDefined();
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it("Should update a subject and its policy", async () => {
    const subj = await Subject.create({
      name: "Chemistry",
      code: "CHEM101",
      universityId: testUniversity._id,
      evaluationPolicyId: new mongoose.Types.ObjectId(),
    });

    axios.put.mockResolvedValue({ data: {} });

    const res = await request(app).put(`/subjects/${subj._id}`).send({
      name: "Chemistry Advanced",
      code: "CHEM201",
      studyProgramIds: [testProgram._id],
      policyRules: [
        { evaluationTypeId: new mongoose.Types.ObjectId(), minPercentage: 0, maxPercentage: 100 },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subject.name).toBe("Chemistry Advanced");
    expect(axios.put).toHaveBeenCalledTimes(1);
  });

  it("Should delete a subject and its policy", async () => {
    const subj = await Subject.create({
      name: "Biology",
      code: "BIO101",
      universityId: testUniversity._id,
      evaluationPolicyId: new mongoose.Types.ObjectId(),
    });

    axios.delete.mockResolvedValue({});

    const res = await request(app).delete(`/subjects/${subj._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(axios.delete).toHaveBeenCalledTimes(1);

    const exists = await Subject.findById(subj._id);
    expect(exists).toBeNull();
  });

  it("Should get all subjects by university", async () => {
    await Subject.create({
      name: "History",
      code: "HIS101",
      universityId: testUniversity._id,
      studyPrograms: [testProgram._id],
    });

    const res = await request(app).get(`/subjects/by-university/${testUniversity._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.subjects)).toBe(true);
    expect(res.body.subjects.length).toBe(1);
    expect(res.body.subjects[0].name).toBe("History");
  });
});

describe("Courses CRUD", () => {
  let testUniversity, testProgram, testSubject, testYear;
  const mockedEvaluationSystem = { data: { system: { _id: new mongoose.Types.ObjectId() } } };

  beforeEach(async () => {
    await Course.deleteMany({});
    await StudyProgram.deleteMany({});
    await Subject.deleteMany({});
    await AcademicYear.deleteMany({});
    await University.deleteMany({});
    jest.clearAllMocks();

    testUniversity = await University.create({
      name: "Course University",
      address: "1 Course St",
      contactEmail: "course@test.com",
      contactPhone: "111111111",
    });

    testProgram = await StudyProgram.create({
      name: "Course Program",
      type: "Bachelor",
      universityId: testUniversity._id,
    });

    testYear = await AcademicYear.create({
      yearLabel: "2024/2025",
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-07-01"),
      universityId: testUniversity._id,
    });

    testSubject = await Subject.create({
      name: "Test Subject",
      code: "TS101",
      universityId: testUniversity._id,
      studyPrograms: [testProgram._id],
    });
  });

  it("Should create a course with evaluation system", async () => {
    axios.post.mockResolvedValue(mockedEvaluationSystem);

    const res = await request(app).post("/courses").send({
      name: "Test Course",
      code: "C101",
      subjectId: testSubject._id,
      academicYearId: testYear._id,
      studyProgramId: testProgram._id,
      universityId: testUniversity._id,
      evaluationGroups: [
        { evaluationTypeId: new mongoose.Types.ObjectId(), totalWeight: 100, itemIds: [] },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.course.name).toBe("Test Course");
    expect(res.body.course.evaluationSystemId).toBeDefined();
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it("Should not create duplicate course code for same university and year", async () => {
    await Course.create({
      name: "Existing Course",
      code: "C101",
      universityId: testUniversity._id,
      academicYearId: testYear._id,
      subjectId: testSubject._id,
      studyProgramId: testProgram._id,
    });

    const res = await request(app).post("/courses").send({
      name: "Duplicate Course",
      code: "C101",
      subjectId: testSubject._id,
      academicYearId: testYear._id,
      studyProgramId: testProgram._id,
      universityId: testUniversity._id,
      evaluationGroups: [
        { evaluationTypeId: new mongoose.Types.ObjectId(), totalWeight: 100, itemIds: [] },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("courseExists"); 
  });

  it("Should get course by ID with evaluation system", async () => {
    const course = await Course.create({
      name: "Course Fetch",
      code: "C102",
      universityId: testUniversity._id,
      subjectId: testSubject._id,
      academicYearId: testYear._id,
      studyProgramId: testProgram._id,
      evaluationSystemId: new mongoose.Types.ObjectId(),
    });

    axios.get.mockResolvedValue(mockedEvaluationSystem);

    const res = await request(app).get(`/courses/${course._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.course.name).toBe("Course Fetch");
    expect(res.body.system).toBeDefined();
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it("Should update a course and its evaluation system", async () => {
    const course = await Course.create({
      name: "Course Update",
      code: "C103",
      universityId: testUniversity._id,
      subjectId: testSubject._id,
      academicYearId: testYear._id,
      studyProgramId: testProgram._id,
      evaluationGroups: [
        { evaluationTypeId: new mongoose.Types.ObjectId(), totalWeight: 100, itemIds: [] },
      ],
    });

    axios.put.mockResolvedValue({ data: {} });

    const res = await request(app).put(`/courses/${course._id}`).send({
      name: "Updated Course Name",
      code: "C103",
      subjectId: testSubject._id,
      academicYearId: testYear._id,
      studyProgramId: testProgram._id,
      evaluationGroups: [
        { evaluationTypeId: new mongoose.Types.ObjectId(), totalWeight: 100, itemIds: [] },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.course.name).toBe("Updated Course Name");
    expect(axios.put).toHaveBeenCalledTimes(1);
  });

  it("Should delete a course and its evaluation system", async () => {
    const course = await Course.create({
      name: "Course Delete",
      code: "C104",
      universityId: testUniversity._id,
      subjectId: testSubject._id,
      academicYearId: testYear._id,
      studyProgramId: testProgram._id,
      evaluationSystemId: new mongoose.Types.ObjectId(),
    });

    axios.delete.mockResolvedValue({});

    const res = await request(app).delete(`/courses/${course._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(axios.delete).toHaveBeenCalledTimes(1);

    const exists = await Course.findById(course._id);
    expect(exists).toBeNull();
  });

  it("Should get all courses by university", async () => {
    await Course.create({
      name: "All Courses",
      code: "C105",
      universityId: testUniversity._id,
      subjectId: testSubject._id,
      academicYearId: testYear._id,
      studyProgramId: testProgram._id,
    });

    const res = await request(app).get(`/courses/by-university/${testUniversity._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.courses)).toBe(true);
    expect(res.body.courses.length).toBe(1);
    expect(res.body.courses[0].name).toBe("All Courses");
  });
});

describe("Groups CRUD", () => {
  let testUniversity, testCourse, userMock;
  let studentIds, professorIds;

  beforeEach(async () => {
    await Group.deleteMany({});
    await Course.deleteMany({});
    await University.deleteMany({});
    jest.clearAllMocks();

    testUniversity = await University.create({
      name: "Group University",
      address: "1 Group St",
      contactEmail: "group@test.com",
      contactPhone: "111111111",
    });

    testCourse = await Course.create({
      name: "Course A",
      code: "C001",
      subjectId: new mongoose.Types.ObjectId(),
      academicYearId: new mongoose.Types.ObjectId(),
      studyProgramId: new mongoose.Types.ObjectId(),
      universityId: testUniversity._id,
      evaluationGroups: [],
    });

    userMock = { _id: new mongoose.Types.ObjectId(), universityId: testUniversity._id };

    studentIds = [new mongoose.Types.ObjectId()];
    professorIds = [new mongoose.Types.ObjectId()];
  });

  it("Should create a group", async () => {
    const res = await request(app).post("/groups").send({
      name: "Group 1",
      universityId: testUniversity._id,
      courseId: testCourse._id,
      professors: professorIds,
      students: studentIds,
      user: userMock,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.group.name).toBe("Group 1");
  });

  it("Should not create duplicate group name in same course", async () => {
    await Group.create({
      name: "Group 1",
      universityId: testUniversity._id,
      courseId: testCourse._id,
      professors: professorIds,
      students: studentIds,
      user: userMock,
    });

    const res = await request(app).post("/groups").send({
      name: "Group 1",
      universityId: testUniversity._id,
      courseId: testCourse._id,
      professors: professorIds,
      students: studentIds,
      user: userMock,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("groupExists");
  });

  it("Should get a group by ID", async () => {
    const group = await Group.create({
      name: "Group Fetch",
      courseId: testCourse._id,
      professors: professorIds,
      students: studentIds,
    });

    const res = await request(app).get(`/groups/${group._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.group.name).toBe("Group Fetch");
  });

  it("Should return 404 for non-existing group", async () => {
    const res = await request(app).get("/groups/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Should get all groups by university", async () => {
    await Group.create({ name: "Group A", courseId: testCourse._id, professors: professorIds, students: studentIds });
    await Group.create({ name: "Group B", courseId: testCourse._id, professors: professorIds, students: studentIds });

    const res = await request(app).get(`/groups/by-university/${testUniversity._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.groups)).toBe(true);
    expect(res.body.groups.length).toBe(2);
  });

  it("Should update a group", async () => {
    const group = await Group.create({
      name: "Old Group",
      courseId: testCourse._id,
      professors: professorIds,
      students: studentIds,
    });

    const newProfessors = [new mongoose.Types.ObjectId()];
    const newStudents = [new mongoose.Types.ObjectId()];

    const res = await request(app).put(`/groups/${group._id}`).send({
      name: "Updated Group",
      professors: newProfessors,
      students: newStudents,
      courseId: testCourse._id,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.group.name).toBe("Updated Group");
    expect(res.body.group.professors[0].toString()).toEqual(newProfessors[0].toString());
    expect(res.body.group.students[0].toString()).toEqual(newStudents[0].toString());
  });

  it("Should not update to duplicate name in same course", async () => {
    const g1 = await Group.create({ name: "G1", courseId: testCourse._id, professors: professorIds, students: studentIds });
    const g2 = await Group.create({ name: "G2", courseId: testCourse._id, professors: professorIds, students: studentIds });

    const res = await request(app).put(`/groups/${g2._id}`).send({
      name: "G1",
      courseId: testCourse._id,
      professors: professorIds,
      students: studentIds,
      user: userMock,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("groupExists");
  });

  it("Should delete a group", async () => {
    const group = await Group.create({
      name: "To Delete",
      courseId: testCourse._id,
      professors: professorIds,
      students: studentIds,
    });

    const res = await request(app).delete(`/groups/${group._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const exists = await Group.findById(group._id);
    expect(exists).toBeNull();
  });

  it("Should return 404 when deleting non-existing group", async () => {
    const res = await request(app).delete("/groups/64e999999999999999999999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });
});