const requireRoles = (...roles) => {
    return (req, res, next) => {

        const userRole = req.user ? req.user.role : null;

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this resource"
            });
        }

        next();
    };
};

export default requireRoles;