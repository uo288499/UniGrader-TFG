// @ts-check
const express = require("express");

const app = express();
app.use(express.json());

// Auth verify
app.post("/verify", (req, res) => {
  if (req.body.token === "valid") {
    res.json({
      userId: "u1",
      universityId: "uni1",
      role: "student",
      email: "test@example.com",
    });
  } else {
    res.status(401).json({ success: false, errorKey: "invalidToken" });
  }
});

// Academic service
app.get("/academic/test", (req, res) => {
  res.json({
    service: "academic",
    query: req.query,
    body: req.body,
  });
});

// Eval service status relay
app.get("/eval/status/:status", (req, res) => {
  res.status(Number.parseInt(req.params.status)).json({ status: req.params.status });
});

// Simulate proxied failure
app.get("/eval/fail", (req, res) => {
  res.destroy();
});

// Default catch-all for other services
app.all("/:service/:path?", (req, res) => {
  res.json({
    service: req.params.service,
    path: req.params.path || "",
    query: req.query,
    body: req.body,
  });
});

module.exports = app.listen(9999);
