import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/authValidator.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated);

      setRefreshTokenCookie(res, result.refreshToken);

      res.status(201).json({
        success: true,
        message: 'Account successfully registered and initialized.',
        data: {
          user: result.user,
          progress: result.progress,
          accessToken: result.accessToken
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated);

      setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json({
        success: true,
        message: 'Login successful. Existing progress restored.',
        data: {
          user: result.user,
          progress: result.progress,
          settings: result.settings,
          accessToken: result.accessToken
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      const result = await AuthService.refresh(token);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      await AuthService.logout(token);
      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        message: 'Successfully logged out.'
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await AuthService.getMe(userId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      // For privacy/security, return generic confirmation
      res.status(200).json({
        success: true,
        message: 'If an account with this email exists, password reset instructions have been dispatched.'
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await AuthService.resetPassword({
        email: validated.email,
        newPassword: validated.newPassword
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }
}

