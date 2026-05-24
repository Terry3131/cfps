const express = require("express");
const cors = require("cors");
const os = require("os");

const attachmentRoutes = require("./routes/attachmentRoutes");
const authRoutes = require("./routes/authRoutes");
const memoRoutes = require("./routes/memoRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const auditRoutes = require("./routes/auditRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const referenceRoutes = require("./routes/referenceRoutes");
const systemRoutes = require("./routes/systemRoutes");
const userRoutes = require("./routes/userRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");
const { runNotificationChecks } = require("./services/notificationService");
const { CORS_ORIGIN, ENFORCE_HTTPS, HOST, NODE_ENV, PORT, TRUST_PROXY } = require("./config/env");
const upload = require("./config/multer");

const app = express();

if (TRUST_PROXY) {
  app.set("trust proxy", 1);
}

app.use(enforceHttps);
app.use(securityHeaders);
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CFPS API is running",
    health: "/health",
    authLogin: "/auth/login",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running"
  });
});

app.use("/auth", authRoutes);
app.use("/uploads", express.static(upload.uploadRoot));
app.use("/memos", memoRoutes);
app.use("/memos", attachmentRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/audit-logs", auditRoutes);
app.use("/notifications", notificationRoutes);
app.use("/reports", reportRoutes);
app.use("/system", systemRoutes);
app.use("/users", userRoutes);
app.use("/", referenceRoutes);

app.use(errorMiddleware);

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);

  if (HOST === "0.0.0.0") {
    const lanUrls = getLanUrls(PORT);

    if (lanUrls.length > 0) {
      console.log("LAN access enabled:");
      lanUrls.forEach((url) => console.log(`  ${url}`));
    } else {
      console.log("LAN access enabled, but no non-internal IPv4 address was detected.");
    }
  } else {
    console.log(`Local access: http://${HOST}:${PORT}`);
    console.log("For Android LAN testing, start with HOST=0.0.0.0.");
  }
});

const notificationCheckIntervalMinutes = Number(process.env.NOTIFICATION_CHECK_INTERVAL_MINUTES || 60);

runNotificationChecks().catch((error) => {
  console.error("Initial notification checks failed:", error.message);
});

setInterval(() => {
  runNotificationChecks().catch((error) => {
    console.error("Scheduled notification checks failed:", error.message);
  });
}, notificationCheckIntervalMinutes * 60 * 1000);

function getLanUrls(port) {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => `http://${entry.address}:${port}`);
}

function buildCorsOptions() {
  const allowedOrigins = CORS_ORIGIN
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0 && NODE_ENV !== "production") {
    return {};
  }

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(Object.assign(new Error("CORS origin not allowed."), { statusCode: 403 }));
    },
  };
}

function enforceHttps(req, res, next) {
  if (!ENFORCE_HTTPS || req.secure || req.headers["x-forwarded-proto"] === "https") {
    return next();
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }

  return res.status(426).json({
    success: false,
    message: "HTTPS is required.",
  });
}

function securityHeaders(req, res, next) {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");

  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.set("Strict-Transport-Security", "max-age=31536000");
  }

  next();
}
