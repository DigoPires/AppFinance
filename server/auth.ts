import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import type { UserWithoutPassword } from "@shared/schema";
import { storage } from "./storage";

const JWT_SECRET = process.env.SESSION_SECRET || "fallback-secret-change-in-production";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface AuthenticatedRequest extends Request {
  user?: UserWithoutPassword;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(user: UserWithoutPassword): string {
  return jwt.sign(
    { userId: Number(user.id), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(): string {
  return jwt.sign(
    { type: "refresh", timestamp: Date.now(), random: Math.random().toString(36) },
    JWT_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
  );
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

export function verifyAccessToken(token: string): { userId: number; email: string; name: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string | number; email: string; name: string };
    return {
      userId: typeof decoded.userId === 'string' ? parseInt(decoded.userId) : decoded.userId,
      email: decoded.email,
      name: decoded.name
    };
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const token = authHeader.substring(7);
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }

  const user = await storage.getUser(decoded.userId);
  if (!user) {
    return res.status(401).json({ message: "Usuário não encontrado" });
  }

  req.user = { id: user.id, email: user.email, name: user.name };
  next();
}

export function excludePassword(user: { id: number; email: string; name: string; password: string }): UserWithoutPassword {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
