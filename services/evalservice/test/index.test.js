const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { beforeAll, afterAll, beforeEach, describe, it, expect } = require("@jest/globals");
const config = require("../src/config");
const { EvaluationPolicy, EvaluationItem, EvaluationSystem } = require("../src/models");
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

describe("Evaluation Policies CRUD", () => {
  let subjectId;
  let evaluationTypeId;

  beforeEach(async () => {
    await EvaluationPolicy.deleteMany({});
    jest.clearAllMocks();

    subjectId = new mongoose.Types.ObjectId();
    evaluationTypeId = new mongoose.Types.ObjectId();
  });

  it("Should create a new evaluation policy", async () => {
    const res = await request(app).post("/evaluation-policies").send({
      subjectId,
      policyRules: [
        { evaluationTypeId, minPercentage: 0, maxPercentage: 100 },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.policy.subjectId.toString()).toBe(subjectId.toString());
    expect(res.body.policy.policyRules.length).toBe(1);
  });

  it("Should not create a duplicate policy for the same subject", async () => {
    await EvaluationPolicy.create({
      subjectId,
      policyRules: [
        { evaluationTypeId, minPercentage: 10, maxPercentage: 50 },
      ],
    });

    const res = await request(app).post("/evaluation-policies").send({
      subjectId,
      policyRules: [
        { evaluationTypeId, minPercentage: 20, maxPercentage: 60 },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("policyExists");
  });

  it("Should get an evaluation policy by subject ID", async () => {
    const policy = await EvaluationPolicy.create({
      subjectId,
      policyRules: [
        { evaluationTypeId, minPercentage: 0, maxPercentage: 100 },
      ],
    });

    const res = await request(app).get(`/evaluation-policies/by-subject/${subjectId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.policy._id.toString()).toBe(policy._id.toString());
  });

  it("Should return 404 when getting policy by non-existing subject ID", async () => {
    const fakeSubject = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/evaluation-policies/by-subject/${fakeSubject}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Should get an evaluation policy by ID", async () => {
    const policy = await EvaluationPolicy.create({
      subjectId,
      policyRules: [
        { evaluationTypeId, minPercentage: 0, maxPercentage: 100 },
      ],
    });

    const res = await request(app).get(`/evaluation-policies/${policy._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.policy._id.toString()).toBe(policy._id.toString());
  });

  it("Should update an evaluation policy", async () => {
    const policy = await EvaluationPolicy.create({
      subjectId,
      policyRules: [
        { evaluationTypeId, minPercentage: 0, maxPercentage: 50 },
      ],
    });

    const updatedRules = [
      { evaluationTypeId, minPercentage: 10, maxPercentage: 90 },
    ];

    const res = await request(app).put(`/evaluation-policies/${policy._id}`).send({
      subjectId,
      policyRules: updatedRules,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.policy.policyRules[0].minPercentage).toBe(10);
    expect(res.body.policy.policyRules[0].maxPercentage).toBe(90);
  });

  it("Should return 404 when updating a non-existing policy", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).put(`/evaluation-policies/${fakeId}`).send({
      subjectId,
      policyRules: [
        { evaluationTypeId, minPercentage: 0, maxPercentage: 100 },
      ],
    });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Should delete an evaluation policy", async () => {
    const policy = await EvaluationPolicy.create({
      subjectId,
      policyRules: [
        { evaluationTypeId, minPercentage: 0, maxPercentage: 100 },
      ],
    });

    const res = await request(app).delete(`/evaluation-policies/${policy._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const found = await EvaluationPolicy.findById(policy._id);
    expect(found).toBeNull();
  });

  it("Should return 404 when deleting a non-existing policy", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).delete(`/evaluation-policies/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });
});

describe("Evaluation Systems CRUD", () => {
  let courseId;
  let evaluationTypeId;

  const { EvaluationSystem } = require("../src/models");

  beforeEach(async () => {
    await EvaluationSystem.deleteMany({});
    jest.clearAllMocks();

    courseId = new mongoose.Types.ObjectId();
    evaluationTypeId = new mongoose.Types.ObjectId();
  });

  it("Should create a new evaluation system", async () => {
    const res = await request(app).post("/evaluation-systems").send({
      courseId,
      evaluationGroups: [
        { evaluationTypeId, totalWeight: 100, itemIds: [] },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.system.courseId.toString()).toBe(courseId.toString());
    expect(res.body.system.evaluationGroups.length).toBe(1);
  });

  it("Should not create a duplicate system for the same course", async () => {
    await EvaluationSystem.create({
      courseId,
      evaluationGroups: [
        { evaluationTypeId, totalWeight: 50, itemIds: [] },
      ],
    });

    const res = await request(app).post("/evaluation-systems").send({
      courseId,
      evaluationGroups: [
        { evaluationTypeId, totalWeight: 75, itemIds: [] },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("systemExists");
  });

  it("Should get an evaluation system by course ID", async () => {
    const system = await EvaluationSystem.create({
      courseId,
      evaluationGroups: [
        { evaluationTypeId, totalWeight: 80, itemIds: [] },
      ],
    });

    const res = await request(app).get(`/evaluation-systems/by-course/${courseId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.system._id.toString()).toBe(system._id.toString());
  });

  it("Should return 404 when getting system by non-existing course ID", async () => {
    const fakeCourse = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/evaluation-systems/by-course/${fakeCourse}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Should get an evaluation system by ID", async () => {
    const system = await EvaluationSystem.create({
      courseId,
      evaluationGroups: [
        { evaluationTypeId, totalWeight: 100, itemIds: [] },
      ],
    });

    const res = await request(app).get(`/evaluation-systems/${system._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.system._id.toString()).toBe(system._id.toString());
  });

  it("Should update an evaluation system", async () => {
    const system = await EvaluationSystem.create({
      courseId,
      evaluationGroups: [
        { evaluationTypeId, totalWeight: 40, itemIds: [] },
      ],
    });

    const updatedGroups = [
      { evaluationTypeId, totalWeight: 90, itemIds: [] },
    ];

    const res = await request(app).put(`/evaluation-systems/${system._id}`).send({
      courseId,
      evaluationGroups: updatedGroups,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.system.evaluationGroups[0].totalWeight).toBe(90);
  });

  it("Should return 404 when updating a non-existing system", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).put(`/evaluation-systems/${fakeId}`).send({
      courseId,
      evaluationGroups: [
        { evaluationTypeId, totalWeight: 60, itemIds: [] },
      ],
    });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });

  it("Should delete an evaluation system", async () => {
    const system = await EvaluationSystem.create({
      courseId,
      evaluationGroups: [
        { evaluationTypeId, totalWeight: 100, itemIds: [] },
      ],
    });

    const res = await request(app).delete(`/evaluation-systems/${system._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const found = await EvaluationSystem.findById(system._id);
    expect(found).toBeNull();
  });

  it("Should return 404 when deleting a non-existing system", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).delete(`/evaluation-systems/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorKey).toBe("notFound");
  });
});

  describe("Evaluation Items (sync + get by group)", () => {
    const { EvaluationItem } = require("../src/models");
    let evaluationSystemId;
    let evaluationTypeId;
    let groupId;

    beforeEach(async () => {
      await EvaluationItem.deleteMany({});
      jest.clearAllMocks();

      evaluationSystemId = new mongoose.Types.ObjectId();
      evaluationTypeId = new mongoose.Types.ObjectId();
      groupId = new mongoose.Types.ObjectId();
    });

    it("Should create new evaluation items when syncing", async () => {
      const itemsPayload = [
        {
          evaluationSystemId,
          evaluationTypeId,
          name: "Final Exam",
          groupId,
          weight: 60,
          minGrade: 4,
        },
        {
          evaluationSystemId,
          evaluationTypeId,
          name: "Assignments",
          groupId,
          weight: 40,
        },
      ];

      const res = await request(app)
        .put(`/evaluation-items/sync/${groupId}`)
        .send({ items: itemsPayload });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.createdCount).toBe(2);
      expect(res.body.updatedCount).toBe(0);
      expect(res.body.deletedCount).toBe(0);
      expect(res.body.items.length).toBe(2);
    });

    it("Should update existing evaluation items when syncing", async () => {
      const item = await EvaluationItem.create({
        evaluationSystemId,
        evaluationTypeId,
        name: "Midterm Exam",
        groupId,
        weight: 50,
      });

      const updatedPayload = [
        {
          _id: item._id,
          evaluationSystemId,
          evaluationTypeId,
          name: "Midterm Exam",
          groupId,
          weight: 70,
          minGrade: 5,
        },
      ];

      const res = await request(app)
        .put(`/evaluation-items/sync/${groupId}`)
        .send({ items: updatedPayload });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.createdCount).toBe(0);
      expect(res.body.updatedCount).toBe(1);
      expect(res.body.deletedCount).toBe(0);
      expect(res.body.items[0].weight).toBe(70);
      expect(res.body.items[0].minGrade).toBe(5);
    });

    it("Should delete items not included in sync payload", async () => {
      const itemToKeep = await EvaluationItem.create({
        evaluationSystemId,
        evaluationTypeId,
        name: "Quiz 1",
        groupId,
        weight: 30,
      });

      const itemToDelete = await EvaluationItem.create({
        evaluationSystemId,
        evaluationTypeId,
        name: "Quiz 2",
        groupId,
        weight: 70,
      });

      const payload = [
        {
          _id: itemToKeep._id,
          evaluationSystemId,
          evaluationTypeId,
          name: "Quiz 1",
          groupId,
          weight: 50,
        },
      ];

      const res = await request(app)
        .put(`/evaluation-items/sync/${groupId}`)
        .send({ items: payload });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.createdCount).toBe(0);
      expect(res.body.updatedCount).toBe(1);
      expect(res.body.deletedCount).toBe(1);

      const remaining = await EvaluationItem.find({ groupId });
      expect(remaining.length).toBe(1);
      expect(remaining[0].name).toBe("Quiz 1");
    });

    it("Should return 400 if there are duplicate names in payload", async () => {
      const payload = [
        {
          evaluationSystemId,
          evaluationTypeId,
          name: "Duplicate",
          groupId,
          weight: 50,
        },
        {
          evaluationSystemId,
          evaluationTypeId,
          name: "Duplicate",
          groupId,
          weight: 50,
        },
      ];

      const res = await request(app)
        .put(`/evaluation-items/sync/${groupId}`)
        .send({ items: payload });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorKey).toBe("evaluationItemExists");
    });

    it("Should get all items by group", async () => {
      await EvaluationItem.insertMany([
        {
          evaluationSystemId,
          evaluationTypeId,
          name: "Test 1",
          groupId,
          weight: 40,
        },
        {
          evaluationSystemId,
          evaluationTypeId,
          name: "Test 2",
          groupId,
          weight: 60,
        },
      ]);

      const res = await request(app).get(`/evaluation-items/by-group/${groupId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items.length).toBe(2);
      expect(res.body.items[0]).toHaveProperty("name");
    });
  });
