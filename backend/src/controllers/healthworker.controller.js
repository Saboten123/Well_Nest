import HealthWorkerProfile from "../models/HealthWorkerProfile.js";

/**
 * Create or update health worker profile for logged-in user
 */
export const upsertHealthWorkerProfile = async (req, res) => {
  try {
    const { name, employer, certId, region, blogs } = req.body;

    const profile = await HealthWorkerProfile.findOneAndUpdate(
      { user: req.user.id },
      {
        name: name ?? null,
        employer: employer ?? null,
        certId: certId ?? null,
        region: region ?? null,
        // do NOT accept `blogs` here on profile upsert to avoid mixing concerns.
        isProfileComplete: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

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
    const profile = await HealthWorkerProfile
      .findOne({ user: req.user.id })
      .populate("user", "email firstName lastName");

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

    const profile = await HealthWorkerProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    profile.blogs.push({ title, body });
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
    const profile = await HealthWorkerProfile.findOne({ user: req.user.id }, { blogs: 1, _id: 0 });
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
    const filter = {};
    if (region) filter.region = region;
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { employer: new RegExp(q, "i") }
      ];
    }

    const workers = await HealthWorkerProfile.find(filter, {
      name: 1,
      employer: 1,
      region: 1,
      isProfileComplete: 1
    }).populate("user", "firstName lastName");

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
    const healthWorkers = await HealthWorkerProfile.find({}, { blogs: 1, user: 1, name: 1 })
      .populate("user", "firstName lastName");
    
    const allBlogs = healthWorkers
      .filter(worker => worker.blogs && worker.blogs.length > 0)
      .map(worker => ({
        workerId: worker._id,
        workerName: worker.user ? `${worker.user.firstName} ${worker.user.lastName}` : worker.name || "Health Worker",
        blogs: worker.blogs.map(blog => ({
          ...blog.toObject(),
          workerName: worker.user ? `${worker.user.firstName} ${worker.user.lastName}` : worker.name || "Health Worker"
        }))
      }))
      .flatMap(worker => worker.blogs);
    
    return res.json({ success: true, data: allBlogs });
  } catch (err) {
    console.error("getAllHealthWorkerBlogs:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
