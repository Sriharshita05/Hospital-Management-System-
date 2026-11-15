
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user || req.staff;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource"
      });
    }

    next();
  };
};
