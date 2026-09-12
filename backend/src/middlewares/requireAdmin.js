// Use AFTER authRequired — relies on req.user (decoded JWT) being set.
export function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access only",
        });
    }
    return next();
}