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
        const users = await User.findAll({ attributes: { exclude: ["password"] }, raw: true });

        const [doctors, patients, healthWorkers, ngos] = await Promise.all([
            DoctorProfile.findAll({ raw: true }),
            PatientProfile.findAll({ raw: true }),
            HealthWorkerProfile.findAll({ raw: true }),
            NGOProfile.findAll({ raw: true }),
        ]);

        const byUserId = (list) => {
            const map = new Map();
            for (const doc of list) map.set(doc.userId, doc);
            return map;
        };

        const doctorMap = byUserId(doctors);
        const patientMap = byUserId(patients);
        const healthWorkerMap = byUserId(healthWorkers);
        const ngoMap = byUserId(ngos);

        const merged = users.map((user) => {
            const id = user.id;
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
            User.count(),
            User.count({ where: { role: "doctor" } }),
            User.count({ where: { role: "patient" } }),
            User.count({ where: { role: "health_worker" } }),
            User.count({ where: { role: "ngo" } }),
            Appointment.count(),
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
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        await user.destroy();
        // Clean up the matching profile row, if any.
        await Promise.all([
            DoctorProfile.destroy({ where: { userId } }),
            PatientProfile.destroy({ where: { userId } }),
            HealthWorkerProfile.destroy({ where: { userId } }),
            NGOProfile.destroy({ where: { userId } }),
        ]);
        res.status(200).json({ success: true, message: "User deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};