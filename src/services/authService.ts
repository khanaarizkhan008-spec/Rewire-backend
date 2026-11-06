import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

export class AuthService {
  static async register(data: { fullName: string; email: string; password: string }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() }
    });

    if (existing) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Atomic transaction initializing User, Progress, and Settings
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          fullName: data.fullName.trim(),
          email: data.email.toLowerCase().trim(),
          passwordHash
        }
      });

      // User starts at Level 1, Day 1, 0 XP, 0 streak, 1 recovery token
      await tx.userProgress.create({
        data: {
          userId: newUser.id,
          currentLevel: 1,
          currentDay: 1,
          lifetimeXP: 0,
          spendableXP: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalCompletedMissions: 0,
          recoveryTokens: 1,
          inRecoveryMode: false
        }
      });

      // User Settings
      await tx.userSettings.create({
        data: {
          userId: newUser.id,
          pinCode: '1234',
          pinLockEnabled: false,
          shieldEnabled: false,
          shareWithAI: false
        }
      });

      // Initial Account Creation Transaction Ledger Entry
      await tx.xPTransaction.create({
        data: {
          userId: newUser.id,
          amount: 0,
          transactionType: 'earned',
          category: 'level_clear',
          description: 'REWIRE Protocol Activated: Level 1 Starter Initialized'
        }
      });

      return newUser;
    });

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt
      }
    });

    const progress = await prisma.userProgress.findUnique({ where: { userId: user.id } });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt
      },
      progress,
      accessToken,
      refreshToken
    };
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
      include: {
        progress: true,
        settings: true
      }
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt
      }
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt
      },
      progress: user.progress,
      settings: user.settings,
      accessToken,
      refreshToken
    };
  }

  static async refresh(token: string) {
    if (!token) {
      throw new AppError('Refresh token required.', 401);
    }

    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(token);
    } catch (err) {
      throw new AppError('Expired or invalid refresh token.', 401);
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      throw new AppError('Refresh token invalid or expired.', 401);
    }

    const newAccessToken = generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email
    });

    return { accessToken: newAccessToken };
  }

  static async logout(token?: string) {
    if (token) {
      await prisma.refreshToken.deleteMany({
        where: { token }
      });
    }
    return { success: true };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        progress: true,
        settings: true
      }
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      progress: user.progress,
      settings: user.settings,
      createdAt: user.createdAt
    };
  }

  static async resetPassword(data: { email: string; newPassword: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() }
    });

    if (!user) {
      throw new AppError('No account found with this email address.', 404);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return { success: true, message: 'Password has been successfully updated.' };
  }
}

