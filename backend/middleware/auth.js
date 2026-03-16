import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const cleanEnv = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).replace(/\r/g, '').trim();
};

const JWT_SECRET = cleanEnv(process.env.JWT_SECRET, 'dev-secret-key');

const getCookieValue = (cookieHeader, name) => {
  if (typeof cookieHeader !== 'string' || !cookieHeader.trim()) return null;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawKey, ...rawValueParts] = cookie.trim().split('=');
    if (rawKey !== name) continue;
    const rawValue = rawValueParts.join('=');
    return rawValue ? decodeURIComponent(rawValue) : null;
  }

  return null;
};

const getTokenFromRequest = (req) => {
  const cookieToken = getCookieValue(req.headers.cookie, 'utlwa_auth');
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization || '';
  const [scheme, bearerToken] = authHeader.split(' ');
  if (scheme === 'Bearer' && bearerToken) {
    return bearerToken;
  }

  return null;
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
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
