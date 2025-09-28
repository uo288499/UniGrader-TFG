const request = require("supertest");
const express = require("express");
const fs = require("fs");

jest.mock("fs");
fs.existsSync.mockReturnValue(true);

const config = require("../src/config");

let server, mockServer;

beforeAll(() => {
  const app = express();
  app.use(express.json());

  // --- Mock Auth Verify Service ---
  app.post("/verify", (req, res) => {
    if (req.body.token === "valid") {
      res.json({
        userId: "u1",
        universityId: "uni1",
        role: "student",
        email: "test@example.com"
      });
    } else {
      res.status(401).json({ success: false, errorKey: "invalidToken" });
    }
  });

  // --- Mock Academic Service ---
  app.get("/academic/test", (req, res) => {
    res.json({
      service: "academic",
      query: req.query,
      body: req.body
    });
  });

  // --- Mock Eval Service ---
  app.get("/eval/status/:status", (req, res) => {
    res.status(Number(req.params.status)).json({ status: req.params.status });
  });

  // simulate socket error
  app.get("/eval/fail", (req, res) => {
    res.destroy();
  });

  // levantar mock server
  mockServer = app.listen(9999);

  // parchear config para que el gateway apunte al mock server
  config.urls.authVerify = "http://localhost:9999";
  config.urls.auth = "http://localhost:9999/public";
  config.urls.academic = "http://localhost:9999/academic";
  config.urls.eval = "http://localhost:9999/eval";
  config.urls.grade = "http://localhost:9999/grade";
  config.urls.audit = "http://localhost:9999/audit";
  config.auth.url = "http://localhost:9999/verify";

  // arrancar gateway real
  server = require("../src");
});

afterAll(async () => {
  if (mockServer) await new Promise(r => mockServer.close(r));
  if (server) await new Promise(r => server.close(r));
});

describe("Gateway Service (with mock server)", () => {
  test("Should return healthy status", async () => {
    const res = await request(server).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("Should proxy request to academic service", async () => {
    const res = await request(server)
      .get("/academic/test?foo=bar")
      .set("Authorization", "Bearer valid"); // <--- token required
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("academic");
    expect(res.body.query.foo).toBe("bar");
  });

  test("Should reject invalid route", async () => {
    const res = await request(server).get("/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("Should authenticate valid token", async () => {
    const res = await request(server)
      .get("/academic/test")
      .set("Authorization", "Bearer valid");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("academic");
  });

  test("Should reject invalid token", async () => {
    const res = await request(server)
      .get("/academic/test")
      .set("Authorization", "Bearer invalid");
    expect(res.status).toBe(401);
    expect(res.body.errorKey).toBe("invalidToken");
  });

  test("Should relay proxied service status codes", async () => {
    const statuses = [200, 201, 400, 401, 500];
    const results = await Promise.all(
      statuses.map((s) =>
        request(server)
          .get(`/eval/status/${s}`)
          .set("Authorization", "Bearer valid") // <--- token required
      )
    );
    results.forEach((res, i) => {
      expect(res.status).toBe(statuses[i]);
    });
  });

  test("Should handle proxy errors gracefully", async () => {
    // simulate ECONNREFUSED
    config.urls.eval = "http://localhost:1111"; // puerto inválido
    const res = await request(server)
      .get("/eval/test")
      .set("Authorization", "Bearer valid"); // <--- token required
    expect([500, 504]).toContain(res.status);

    // restaurar mock
    config.urls.eval = "http://localhost:9999/eval";
  });
});
