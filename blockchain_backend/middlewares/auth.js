const jwt = require("jsonwebtoken");
const USR = require("../model/authUsers.js"); // Update path to your User model

require("dotenv").config();

async function authMiddleware(req, res, next) {
  try {
    // 1. Get token from header
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    // console.log(token)
    if (!token) return res.status(401).json({ error: "No token provided" });
    // console.log("token provided")
    // 2. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id)
      return res.status(401).json({ error: "Invalid token" });
    // console.log("Verify done");

    // 3. Fetch full user from DB
    const user = await USR.findById(decoded.id).select("-password"); // Exclude password
    if (!user) return res.status(401).json({ error: "User not found" });
    console.log("Auth done");

    // 4. Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
}
// middlewares/role.js
function restrictRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

module.exports = { authMiddleware, restrictRole };
