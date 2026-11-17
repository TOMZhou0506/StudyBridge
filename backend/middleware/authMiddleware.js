import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Task 3: Token Verification Middleware
export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Check if the authorization header is present and properly formatted
    if (!authHeader) {
      return res.status(401).json({
        error: "authorization header is missing",
      });
    }

    // Check if the authorization header starts with "Bearer "
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "authorization header is malformed",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    // Verify the token using the secret key and the HS256 algorithm
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
    } catch (error) {
      // Handle token verification expired error
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "token has expired",
        });
      }
      //  Handle other token verification invalid errors
      return res.status(401).json({
        error: "token is invalid",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: "token user no longer exists",
      });
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        error: "token is no longer valid",
      });
    }

    req.user = {
      userId: user._id,
      role: user.role,
      fullName: user.fullName,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}

// Task 4: Role-Based Access Control Middleware.
// handle tutor, learner, and admin roles.
// This middleware checks if the user's role is included
// in the allowedRoles array.
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      let message = "you do not have permission to perform this action";
      if (allowedRoles.length === 1) {
        message = `only ${allowedRoles[0]}s may perform this action`;
      }
      return res.status(403).json({
        error: message,
      });
    }
    next();
  };
}
