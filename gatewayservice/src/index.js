const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: '*' // Allow requests from everywhere
}));

// Health Check
app.get("/health", (_req, res) => {
    res.json({ status: "OK" });
  });

// Endpoint for obtaining the current date and time
app.get("/datetime", (_req, res) => {
    const now = new Date();
    res.json({
        date: now.toDateString(),
        time: now.toTimeString()
    });
});

app.listen(PORT, () => {
  console.log(`Gateway listening on port ${PORT}`);
});