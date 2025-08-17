import express from "express"; // Express server
import nodemailer from "nodemailer"; // Nodemailer for sending emails
import fs from "fs"; // For reading HTML template
import dotenv from "dotenv"; // Load environment variables
import axios from "axios"; // For HTTP requests
import path from "path"; // For handling file paths
import { fileURLToPath } from "url"; // For ES modules __dirname equivalent
import rateLimit from "express-rate-limit"; // Rate limiter

dotenv.config(); // Load .env file

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json()); // Parse JSON requests
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// Configure Nodemailer transporter (Gmail with App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASS, // Gmail app password
  },
});

// Rate limiter: 1 request per 1 minute per IP
const emailRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1, // 1 request per IP per window
  message: {
    success: false,
    message: "Too many requests. Please wait 1 minute before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Endpoint to send alert email
app.get("/send-alert", emailRateLimiter, async (req, res) => {
  try {
    const { to } = req.query; // recipient email
    if (!to) {
      return res
        .status(400)
        .json({ success: false, message: "Recipient email is required" });
    }

    // Load HTML template
    const htmlTemplate = fs.readFileSync("./templates/alert.html", "utf-8");

    // Send email
    await transporter.sendMail({
      from: `"Water Alert System" <${process.env.EMAIL_USER}>`,
      to,
      subject: "🚨 URGENT: Water Level is Very High",
      html: htmlTemplate,
    });

    res
      .status(200)
      .json({ success: true, message: "Alert email sent successfully" });
  } catch (err) {
    console.error("Error sending email:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to send alert email" });
  }
});

// Overpass query for evacuation centers in the Philippines
const overpassQuery = `
[out:json][timeout:25];
area["name"="Philippines"]->.searchArea;
(
  node["social_facility"="shelter"](area.searchArea);
  way["social_facility"="shelter"](area.searchArea);
  relation["social_facility"="shelter"](area.searchArea);
);
out body;
>;
out skel qt;
`;

// Endpoint to fetch evacuation centers
app.get("/evac-centers", async (req, res) => {
  try {
    const response = await axios.post(
      "https://overpass-api.de/api/interpreter",
      overpassQuery,
      { headers: { "Content-Type": "text/plain" } }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(500).json({ error: "Failed to fetch evacuation centers" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
