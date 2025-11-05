const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { beforeAll, afterAll, beforeEach, describe, it, expect } = require("@jest/globals");
const config = require("../src/config");
const { Grade, FinalGrade } = require("../src/models");
const mongoose = require("mongoose");
const axios = require("axios");

jest.mock("axios");

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

beforeEach(async () => {
  await Grade.deleteMany({});
  await FinalGrade.deleteMany({});
});

describe("Grades API", () => {
  it("Should create new grades when none exist (via sync)", async () => {
    const payload = {
      grades: [
        {
          studentId: new mongoose.Types.ObjectId(),
          itemId: new mongoose.Types.ObjectId(),
          courseId: new mongoose.Types.ObjectId(),
          value: 8.5,
          user: "tester"
        },
        {
          studentId: new mongoose.Types.ObjectId(),
          itemId: new mongoose.Types.ObjectId(),
          courseId: new mongoose.Types.ObjectId(),
          value: 7,
          user: "tester"
        }
      ]
    };

    const res = await request(app).put("/grades/sync").send(payload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.grades).toHaveLength(2);
    expect(res.body.grades[0]).toHaveProperty("_id");
    expect(res.body.grades[1].value).toBe(7);
  });

  it("Should update existing grade instead of duplicating it", async () => {
    const studentId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    await Grade.create({ studentId, itemId, courseId, value: 5 });

    const payload = {
      grades: [{ studentId, itemId, courseId, value: 9, user: "tester" }]
    };

    const res = await request(app).put("/grades/sync").send(payload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.grades).toHaveLength(1);
    expect(res.body.grades[0].value).toBe(9);

    const count = await Grade.countDocuments({ studentId, itemId });
    expect(count).toBe(1);
  });

  it("Should handle multiple updates and creations in one sync call", async () => {
    const existing = await Grade.create({
      studentId: new mongoose.Types.ObjectId(),
      itemId: new mongoose.Types.ObjectId(),
      courseId: new mongoose.Types.ObjectId(),
      value: 4
    });

    const newGrade = {
      studentId: new mongoose.Types.ObjectId(),
      itemId: new mongoose.Types.ObjectId(),
      courseId: new mongoose.Types.ObjectId(),
      value: 10,
      user: "tester"
    };

    const payload = {
      grades: [
        { ...existing.toObject(), value: 6 },
        newGrade
      ]
    };

    const res = await request(app).put("/grades/sync").send(payload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.grades).toHaveLength(2);

    const updated = await Grade.findById(existing._id);
    expect(updated.value).toBe(6);

    const created = await Grade.findOne({
      studentId: newGrade.studentId,
      itemId: newGrade.itemId
    });
    expect(created).not.toBeNull();
    expect(created.value).toBe(10);
  });

  it("Should get all grades for a specific student and course", async () => {
    const studentId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    await Grade.create([
      { studentId, itemId: new mongoose.Types.ObjectId(), courseId, value: 8 },
      { studentId, itemId: new mongoose.Types.ObjectId(), courseId, value: 9 }
    ]);

    const res = await request(app)
      .get(`/grades/by-student/${studentId}/course/${courseId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.grades).toHaveLength(2);
    expect(res.body.grades[0]).toHaveProperty("value");
  });

  it("Should return empty array when no grades for given student/course", async () => {
    const res = await request(app)
      .get(`/grades/by-student/${new mongoose.Types.ObjectId()}/course/${new mongoose.Types.ObjectId()}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.grades).toHaveLength(0);
  });

  it("Should get all grades for a specific student across courses", async () => {
    const studentId = new mongoose.Types.ObjectId();

    await Grade.create([
      { studentId, itemId: new mongoose.Types.ObjectId(), courseId: new mongoose.Types.ObjectId(), value: 5 },
      { studentId, itemId: new mongoose.Types.ObjectId(), courseId: new mongoose.Types.ObjectId(), value: 7 }
    ]);

    const res = await request(app)
      .get(`/grades/by-student/${studentId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.grades).toHaveLength(2);
  });

  it("Should handle server error gracefully on /by-student/:studentId", async () => {
    jest.spyOn(Grade, "find").mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .get(`/grades/by-student/${new mongoose.Types.ObjectId()}`)
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("serverError");
  });
});

describe("Final Grades API", () => {
  it("Should create a new final grade when none exists", async () => {
    const payload = {
      studentId: new mongoose.Types.ObjectId(),
      courseId: new mongoose.Types.ObjectId(),
      academicYearId: new mongoose.Types.ObjectId(),
      evaluationPeriod: "Ordinary",
      value: 7.5,
      isPassed: true,
      user: "test-user"
    };

    const res = await request(app).put("/final-grades/sync").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.value).toBe(7.5);
  });

  it("Should update an existing final grade instead of creating a duplicate", async () => {
    const payload = {
      studentId: new mongoose.Types.ObjectId(),
      courseId: new mongoose.Types.ObjectId(),
      academicYearId: new mongoose.Types.ObjectId(),
      evaluationPeriod: "Ordinary",
      value: 5,
      isPassed: false,
      user: "test-user"
    };
    await request(app).put("/final-grades/sync").send(payload);

    const updated = { ...payload, value: 8, isPassed: true };
    const res = await request(app).put("/final-grades/sync").send(updated);
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(8);
    expect(res.body.data.isPassed).toBe(true);
  });

  it("Should get a specific final grade by student/course/period", async () => {
    const studentId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const academicYearId = new mongoose.Types.ObjectId();

    await FinalGrade.create({
      studentId,
      courseId,
      academicYearId,
      evaluationPeriod: "Ordinary",
      value: 9,
      isPassed: true
    });

    const res = await request(app)
      .get(`/final-grades/by-student/${studentId}/course/${courseId}/Ordinary`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.grade.value).toBe(9);
  });

  it("Should return null if no grade found for student/course/period", async () => {
    const res = await request(app)
      .get(`/final-grades/by-student/${new mongoose.Types.ObjectId()}/course/${new mongoose.Types.ObjectId()}/Ordinary`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.grade).toBeNull();
  });

  it("Should delete a final grade by student/course/period", async () => {
    const studentId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    await FinalGrade.create({
      studentId,
      courseId,
      academicYearId: new mongoose.Types.ObjectId(),
      evaluationPeriod: "Extraordinary",
      value: 6,
      isPassed: true
    });

    const res = await request(app)
      .delete(`/final-grades/by-student/${studentId}/course/${courseId}/Extraordinary`)
      .expect(200);

    expect(res.body.success).toBe(true);

    const found = await FinalGrade.findOne({ studentId, courseId, evaluationPeriod: "Extraordinary" });
    expect(found).toBeNull();
  });

  it("Should return 404 when deleting non-existing final grade", async () => {
    const res = await request(app)
      .delete(`/final-grades/by-student/${new mongoose.Types.ObjectId()}/course/${new mongoose.Types.ObjectId()}/Extraordinary`)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Should get all grades for a specific student", async () => {
    const studentId = new mongoose.Types.ObjectId();

    await FinalGrade.create([
      { studentId, courseId: new mongoose.Types.ObjectId(), academicYearId: new mongoose.Types.ObjectId(), evaluationPeriod: "Ordinary", value: 8, isPassed: true },
      { studentId, courseId: new mongoose.Types.ObjectId(), academicYearId: new mongoose.Types.ObjectId(), evaluationPeriod: "Extraordinary", value: 6, isPassed: false },
    ]);

    const res = await request(app).get(`/final-grades/by-student/${studentId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.grades).toHaveLength(2);
  });
});

describe("Import grades", () => {
  const groupId = "65e000000000000000000000";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Should reject empty import", async () => {
    const res = await request(app).post(`/grades/import/${groupId}`).send({
      rows: []
    });

    expect(res.status).toBe(400);
    expect(res.body.errorKey).toBe("emptyCSV");
  });

  it("Should return 404 if group not found", async () => {
    axios.get.mockResolvedValueOnce({ data: { group: null } }); // Primera llamada a groups/:id

    const res = await request(app).post(`/grades/import/${groupId}`).send({
      rows: [
        { email: "uo288499@uniovi.es", a: "Theory", b: "Exam", c: "8" }
      ]
    });

    expect(res.status).toBe(404);
    expect(res.body.errorKey).toBe("groupNotFound");
  });

  it("Should detect duplicated student in file", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        group: {
          _id: groupId,
          courseId: { _id: "course1" },
          students: ["s1", "s2"],
        },
      },
    });

    axios.get.mockResolvedValueOnce({
      data: {
        course: { _id: "course1", universityId: { _id: "uni1" } },
        system: { evaluationGroups: [] },
      },
    });

    axios.get.mockResolvedValueOnce({ data: { evaluationTypes: [] } });

    axios.get.mockResolvedValueOnce({ data: { items: [] } });

    axios.get.mockResolvedValueOnce({
      data: {
        accounts: [
          { _id: "s1", email: "uo288499@uniovi.es" },
          { _id: "s2", email: "test@email.com" },
        ],
      },
    });

    const res = await request(app).post(`/grades/import/${groupId}`).send({
      rows: [
        { email: "uo288499@uniovi.es", a: "Theory", b: "Exam", c: "8" },
        { email: "uo288499@uniovi.es", a: "Theory", b: "Exam", c: "7" },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.errors.some(e => e.errorKey === "studentDuplicatedInFile")).toBe(true);
  });

  it("Should reject student not found in group", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        group: {
          _id: groupId,
          courseId: { _id: "course1" },
          students: ["s1"],
        },
      },
    });

    axios.get.mockResolvedValueOnce({
      data: {
        course: { _id: "course1", universityId: { _id: "uni1" } },
        system: { evaluationGroups: [] },
      },
    });

    axios.get.mockResolvedValueOnce({ data: { evaluationTypes: [] } });
    axios.get.mockResolvedValueOnce({ data: { items: [] } });
    axios.get.mockResolvedValueOnce({
      data: {
        accounts: [
          { _id: "s1", email: "other@student.com" },
        ],
      },
    });

    const res = await request(app).post(`/grades/import/${groupId}`).send({
      rows: [
        { email: "missing@student.com", a: "Theory", b: "Exam", c: "5" },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.errors[0].errorKey).toBe("studentNotFoundOrNotInGroup");
  });

  it("Should reject invalid grade values", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          group: {
            _id: groupId,
            courseId: { _id: "course1" },
            students: ["s1"],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          course: {
            _id: "course1",
            universityId: { _id: "uni1" },
            maxGrade: 4,
          },
          system: { evaluationGroups: [] },
        },
      })
      .mockResolvedValueOnce({
        data: { evaluationTypes: [{ _id: "t1", name: "Theory" }] },
      })
      .mockResolvedValueOnce({
        data: { items: [{ _id: "i1", name: "Exam", evaluationTypeId: "t1", weight: 100 }] },
      })
      .mockResolvedValueOnce({
        data: {
          accounts: [{ _id: "s1", email: "uo288499@uniovi.es" }],
        },
      });

    const res = await request(app).post(`/grades/import/${groupId}`).send({
      rows: [
        { email: "uo288499@uniovi.es", a: "Exam", b: "Theory", c: "invalid" },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.errors.some(e => e.errorKey === "invalidGradeValue")).toBe(true);
  });

  it("Should reject invalid extraordinary grade", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          group: {
            _id: groupId,
            courseId: { _id: "course1" },
            students: ["s1"],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          course: {
            _id: "course1",
            universityId: { _id: "uni1" },
            academicYearId: { _id: "ay1" },
          },
          system: { evaluationGroups: [] },
        },
      })
      .mockResolvedValueOnce({
        data: { evaluationTypes: [{ _id: "t1", name: "Theory" }] },
      })
      .mockResolvedValueOnce({
        data: { items: [{ _id: "i1", name: "Exam", evaluationTypeId: "t1", weight: 100 }] },
      })
      .mockResolvedValueOnce({
        data: {
          accounts: [{ _id: "s1", email: "uo288499@uniovi.es" }],
        },
      });

    const res = await request(app).post(`/grades/import/${groupId}`).send({
      rows: [
        { email: "uo288499@uniovi.es", a: "Exam", b: "Theory", c: "8", extraordinary: "eleven" },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.errors.some(e => e.errorKey === "invalidExtraordinaryGrade")).toBe(true);
  });

  it("Should import valid grades successfully", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          group: {
            _id: groupId,
            courseId: { _id: "course1" },
            students: ["s1"],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          course: {
            _id: "course1",
            universityId: { _id: "uni1" },
            academicYearId: { _id: "ay1" },
            maxGrade: 10,
          },
          system: { evaluationGroups: [] },
        },
      })
      .mockResolvedValueOnce({
        data: { evaluationTypes: [{ _id: "t1", name: "Theory" }] },
      })
      .mockResolvedValueOnce({
        data: { items: [{ _id: "i1", name: "Exam", evaluationTypeId: "t1", weight: 100 }] },
      })
      .mockResolvedValueOnce({
        data: {
          accounts: [{ _id: "s1", email: "uo288499@uniovi.es" }],
        },
      });

    axios.put.mockResolvedValue({}); 

    const res = await request(app).post(`/grades/import/${groupId}`).send({
      rows: [
        { email: "uo288499@uniovi.es", a: "Exam", b: "Theory", c: "8", extraordinary: "7" },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.added).toContain("uo288499@uniovi.es");
    expect(res.body.errors.length).toBe(0);
  });
});