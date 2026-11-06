import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AIService } from '../services/aiService.js';
import { chatSchema } from '../validators/aiValidator.js';

export class AIController {
  static async chat(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = chatSchema.parse(req.body);

      const result = await AIService.chat({
        userId,
        message: validated.message,
        conversationId: validated.conversationId,
        includeJournal: validated.includeJournal
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getConversations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const conversations = await AIService.getConversations(userId);

      res.status(200).json({
        success: true,
        data: conversations
      });
    } catch (err) {
      next(err);
    }
  }

  static async getConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const conversation = await AIService.getConversation(userId, req.params.id);

      res.status(200).json({
        success: true,
        data: conversation
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await AIService.deleteConversation(userId, req.params.id);

      res.status(200).json({
        success: true,
        message: 'Conversation deleted.'
      });
    } catch (err) {
      next(err);
    }
  }

  static async clearHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await AIService.clearHistory(userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }
}

