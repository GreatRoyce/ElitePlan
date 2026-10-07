const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { sessionRejection } = require("./accountAccess.service");

const fields = "_id role accountStatus suspendedUntil moderationReason authVersion archivedAt";
function socketError(rejection) {
  const error = new Error(rejection.message);
  error.data = rejection;
  return error;
}

function configureRealtimeAccess(io, connectedUsers) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(socketError({ code: "SESSION_REVOKED", message: "Authentication required" }));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select(fields);
      const rejection = sessionRejection(user, decoded);
      if (rejection) return next(socketError(rejection));
      socket.data.user = { id: String(user._id), role: user.role };
      socket.data.authVersion = decoded.authVersion ?? 0;
      next();
    } catch { next(socketError({ code: "SESSION_REVOKED", message: "Your session is no longer valid. Please sign in again." })); }
  });

  io.on("connection", async (socket) => {
    const { id: userId, role } = socket.data.user;
    // Join before the second database check to cover moderation that races the handshake.
    socket.join(`user:${userId}`);
    socket.on("disconnect", () => {
      if (connectedUsers[userId]?.socketId === socket.id) delete connectedUsers[userId];
    });
    async function checkAccess() {
      const user = await User.findById(userId).select(fields);
      return sessionRejection(user, { authVersion: socket.data.authVersion });
    }
    function disconnect(rejection) {
      socket.emit("account_restricted", rejection);
      socket.disconnect(true);
    }
    socket.use(async (packet, next) => {
      try {
        const rejection = await checkAccess();
        if (rejection) { disconnect(rejection); return next(socketError(rejection)); }
        next();
      } catch { disconnect({ code: "SESSION_REVOKED", message: "Unable to verify your session. Please sign in again." }); }
    });
    try {
      const rejection = await checkAccess();
      if (rejection) return disconnect(rejection);
      if (!socket.connected) return;
      connectedUsers[userId] = { socketId: socket.id, role };
    } catch { disconnect({ code: "SESSION_REVOKED", message: "Unable to verify your session. Please sign in again." }); }
  });
}

module.exports = { configureRealtimeAccess };
