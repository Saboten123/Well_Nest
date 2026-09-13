import { Op } from "sequelize";
import HealthWorkerProfile from "../models/HealthWorkerProfile.js";
import User from "../models/User.js";

/**
 * Create or update health worker profile for logged-in user
 */
export const upsertHealthWorkerProfile = async (req, res) => {
  try {
    const { name, employer, certId, region } = req.body;

    const [profile] = await HealthWorkerProfile.findOrCreate({
      where: { userId: req.user.id },
      defaults: { userId: req.user.id },
    });
    // do NOT accept `blogs` here on profile upsert to avoid mixing concerns.
    await profile.update({
      name: name ?? null,
      employer: employer ?? null,
      certId: certId ?? null,
      region: region ?? null,
      isProfileComplete: true
    });

    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error("upsertHealthWorkerProfile:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get logged-in health worker's profile
 */
export const getMyHealthWorkerProfile = async (req, res) => {
  try {
    const profile = await HealthWorkerProfile.findOne({
      where: { userId: req.user.id },
      include: [{ model: User, attributes: ["email", "firstName", "lastName"] }],
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error("getMyHealthWorkerProfile:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Add a blog post (stored inside HealthWorkerProfile.blogs array)
 */
export const addBlog = async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: "title and body are required" });
    }

    const profile = await HealthWorkerProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    // Reassign (not .push) so Sequelize's dirty-checking on the JSONB
    // column actually picks up the change.
    profile.blogs = [...profile.blogs, { title, body, createdAt: new Date() }];
    await profile.save();

    return res.json({ success: true, data: profile.blogs });
  } catch (err) {
    console.error("addBlog (healthworker):", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get all blogs for this health worker
 */
export const getMyBlogs = async (req, res) => {
  try {
    const profile = await HealthWorkerProfile.findOne({
      where: { userId: req.user.id },
      attributes: ["blogs"],
    });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    return res.json({ success: true, data: profile.blogs });
  } catch (err) {
    console.error("getMyBlogs (healthworker):", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Public listing of health workers (for navbar / search)
 * Optional query params: region, q (search by name/employer)
 */
export const listHealthWorkersPublic = async (req, res) => {
  try {
    const { region, q } = req.query;
    const where = {};
    if (region) where.region = region;
    if (q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { employer: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const workers = await HealthWorkerProfile.findAll({
      where,
      attributes: ["name", "employer", "region", "isProfileComplete"],
      include: [{ model: User, attributes: ["firstName", "lastName"] }],
    });

    return res.json({ success: true, data: workers });
  } catch (err) {
    console.error("listHealthWorkersPublic:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get all health worker blogs for public viewing
 */
export const getAllHealthWorkerBlogs = async (req, res) => {
  try {
    const healthWorkers = await HealthWorkerProfile.findAll({
      attributes: ["id", "blogs", "name", "userId"],
      include: [{ model: User, attributes: ["firstName", "lastName"] }],
    });

    const allBlogs = healthWorkers
      .filter(worker => worker.blogs && worker.blogs.length > 0)
      .map(worker => ({
        workerId: worker.id,
        workerName: worker.User ? `${worker.User.firstName} ${worker.User.lastName}` : worker.name || "Health Worker",
        blogs: worker.blogs.map(blog => ({
          ...blog,
          workerName: worker.User ? `${worker.User.firstName} ${worker.User.lastName}` : worker.name || "Health Worker"
        }))
      }))
      .flatMap(worker => worker.blogs);

    return res.json({ success: true, data: allBlogs });
  } catch (err) {
    console.error("getAllHealthWorkerBlogs:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};