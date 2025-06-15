import { IronSession, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export interface SessionData {
  isAuthenticated: boolean;
  userId?: string;
  loginTime?: number;
}

export const sessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD!,
  cookieName: 'auth-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return await getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function verifyPassword(inputPassword: string): Promise<boolean> {
  const correctPassword = process.env.ACCESS_PASSWORD;
  if (!correctPassword) {
    throw new Error('ACCESS_PASSWORD not configured');
  }
  
  // 简单比较，如果需要更高安全性可以使用bcrypt
  return inputPassword === correctPassword;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getSession();
    return session.isAuthenticated === true;
  } catch {
    return false;
  }
} 