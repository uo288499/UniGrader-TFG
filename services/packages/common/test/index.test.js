// @ts-check

const request = require("supertest");
const express = require("express");
const { describe, it, expect, afterEach } = require("@jest/globals");
const { setupDefaultHandlers } = require("../src/index");

/** @type {import("http").Server} */
let server;

afterEach(async () => {
  jest.clearAllMocks();
  await new Promise((r) => {
    if (server != null) server.close(r);
    else r();
  });
});

describe("Helper functions (index.js)", () => {

  it("Should handle 404s & errors", async () => {
    // Setup
    const app = express();

    app.get("/error", () => {
      throw new Error("Test error");
    });
    setupDefaultHandlers(app);

    server = app.listen(9998);

    // Test
    const response = await request(server).get("/404").send();

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("errorKey", "notFound");

    const errorResponse = await request(server).get("/error").send();

    expect(errorResponse.status).toBe(500);
    expect(errorResponse.body).toHaveProperty("success", false);
    expect(errorResponse.body).toHaveProperty("errorKey", "serverError");
  });
});
