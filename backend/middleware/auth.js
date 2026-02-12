import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication failed.' });
    }

    req.auth = {
      userId: user.id,
      role: user.role,
    };

    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    return next();
  };
};
