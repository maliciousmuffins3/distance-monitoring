import express from "express"; // Express server
import nodemailer from "nodemailer"; // Nodemailer for sending emails
import fs from "fs"; // To read HTML template
import dotenv from "dotenv"; // Env vars
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config(); // Load .env file

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json()); // Parse JSON requests
app.use(express.static(path.join(__dirname, "public")));
// Configure transporter (using Gmail + App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASS, // Gmail app password
  },
});

// Endpoint to send alert email
app.get("/send-alert", async (req, res) => {
  try {
    const { to } = req.query; // recipient email

    // Load HTML template
    const htmlTemplate = fs.readFileSync("./templates/alert.html", "utf-8");

    // Send mail
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

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
