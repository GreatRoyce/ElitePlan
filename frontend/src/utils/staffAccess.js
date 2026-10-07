export const staffHome = (user) => user?.role === "admin" ? "/admin" : user?.role === "moderator" ? "/moderator" : "/lounge";
export const isStaff = (user) => ["admin", "moderator"].includes(user?.role);
export const hasStaffPermission = (user, permission) => user?.role === "admin" || (user?.role === "moderator" && Array.isArray(user.permissions) && user.permissions.includes(permission));
