import User from "../models/User.js";
import DoctorProfile from "../models/DoctorProfile.js";
import PatientProfile from "../models/PatientProfile.js";
import HealthWorkerProfile from "../models/HealthWorkerProfile.js";
import NGOProfile from "../models/NGOProfile.js";
import Appointment from "../models/Appointments.js";

// GET /admin/users
// Returns every user account, merged with their role-specific profile
// (DoctorProfile / PatientProfile / HealthWorkerProfile / NGOProfile),
// so the admin sees one flat, readable record per person.
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password").lean();

        const [doctors, patients, healthWorkers, ngos] = await Promise.all([
            DoctorProfile.find().lean(),
            PatientProfile.find().lean(),
            HealthWorkerProfile.find().lean(),
            NGOProfile.find().lean(),
        ]);

        const byUserId = (list) => {
            const map = new Map();
            for (const doc of list) map.set(doc.user?.toString(), doc);
            return map;
        };

        const doctorMap = byUserId(doctors);
        const patientMap = byUserId(patients);
        const healthWorkerMap = byUserId(healthWorkers);
        const ngoMap = byUserId(ngos);

        const merged = users.map((user) => {
            const id = user._id.toString();
            let profile = null;

            if (user.role === "doctor") profile = doctorMap.get(id) || null;
            else if (user.role === "patient") profile = patientMap.get(id) || null;
            else if (user.role === "health_worker")
                profile = healthWorkerMap.get(id) || null;
            else if (user.role === "ngo") profile = ngoMap.get(id) || null;

            return {
                id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                location: user.location,
                role: user.role,
                createdAt: user.createdAt,
                isProfileComplete: profile?.isProfileComplete ?? null,
                profile,
            };
        });

        res.status(200).json({ success: true, data: merged });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /admin/stats
// Quick counts for a dashboard summary row.
export const getStats = async (req, res) => {
    try {
        const [
            totalUsers,
            doctors,
            patients,
            healthWorkers,
            ngos,
            appointments,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "doctor" }),
            User.countDocuments({ role: "patient" }),
            User.countDocuments({ role: "health_worker" }),
            User.countDocuments({ role: "ngo" }),
            Appointment.countDocuments(),
        ]);

        res.status(200).json({
            success: true,
            data: { totalUsers, doctors, patients, healthWorkers, ngos, appointments },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /admin/users/:userId
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        // Clean up the matching profile document, if any.
        await Promise.all([
            DoctorProfile.deleteOne({ user: userId }),
            PatientProfile.deleteOne({ user: userId }),
            HealthWorkerProfile.deleteOne({ user: userId }),
            NGOProfile.deleteOne({ user: userId }),
        ]);
        res.status(200).json({ success: true, message: "User deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};