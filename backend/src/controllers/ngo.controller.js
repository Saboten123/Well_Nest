import NGOProfile from "../models/NGOProfile.js";
import User from "../models/User.js";

// Create or update NGO profile
export const upsertNGOProfile = async (req, res) => {
  try {
    const { orgName, registrationNumber, mission, website, email, services } = req.body;

    const [profile] = await NGOProfile.findOrCreate({
      where: { userId: req.user.id },
      defaults: { userId: req.user.id },
    });
    await profile.update({
      orgName,
      registrationNumber,
      mission,
      website,
      email,
      services,
      isProfileComplete: true
    });

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get NGO profile by logged-in user
export const getMyNGOProfile = async (req, res) => {
  try {
    const profile = await NGOProfile.findOne({
      where: { userId: req.user.id },
      include: [{ model: User, attributes: ["email", "firstName", "lastName"] }],
    });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add a blog post
export const addBlog = async (req, res) => {
  try {
    const { title, body } = req.body;

    const profile = await NGOProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    // Reassign (not .push) so Sequelize's dirty-checking on the JSONB
    // column actually picks up the change.
    profile.blogs = [...profile.blogs, { title, body, createdAt: new Date() }];
    await profile.save();

    res.json({ success: true, data: profile.blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all blogs for this NGO
export const getMyBlogs = async (req, res) => {
  try {
    const profile = await NGOProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({ success: true, data: profile.blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all NGO blogs for public viewing
export const getAllNGOBlogs = async (req, res) => {
  try {
    const ngos = await NGOProfile.findAll({
      attributes: ["id", "blogs", "orgName", "userId"],
      include: [{ model: User, attributes: ["firstName", "lastName"] }],
    });

    const allBlogs = ngos
      .filter(ngo => ngo.blogs && ngo.blogs.length > 0)
      .map(ngo => ({
        ngoId: ngo.id,
        ngoName: ngo.User ? `${ngo.User.firstName} ${ngo.User.lastName}` : ngo.orgName || "NGO",
        blogs: ngo.blogs.map(blog => ({
          ...blog,
          ngoName: ngo.User ? `${ngo.User.firstName} ${ngo.User.lastName}` : ngo.orgName || "NGO"
        }))
      }))
      .flatMap(ngo => ngo.blogs);

    res.json({ success: true, data: allBlogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};