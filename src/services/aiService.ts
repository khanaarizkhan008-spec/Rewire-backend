import { prisma } from '../config/db.js';
import { ENV } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

interface ChatOptions {
  userId: string;
  message: string;
  conversationId?: string;
  includeJournal?: boolean;
}

export class AIService {
  static async chat(options: ChatOptions) {
    const { userId, message, includeJournal = false } = options;

    // 1. Fetch authorized user context
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        progress: true,
        settings: true
      }
    });

    // Today's completed missions
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCompletions = await prisma.missionCompletion.findMany({
      where: { userId, dateString: todayStr },
      include: { mission: true }
    });

    // Active goals
    const activeGoals = await prisma.goal.findMany({
      where: { userId, status: 'ACTIVE' },
      take: 3
    });

    // Deep work minutes this week
    const recentFocus = await prisma.deepWorkSession.findMany({
      where: { userId },
      take: 5,
      orderBy: { completedAt: 'desc' }
    });

    // Journal context (ONLY IF user explicitly authorized via settings or request flag)
    let journalSnippet = '';
    const isJournalAuthorized = user.settings?.shareWithAI || includeJournal;
    if (isJournalAuthorized) {
      const latestJournal = await prisma.journalEntry.findFirst({
        where: { userId },
        orderBy: { date: 'desc' }
      });
      if (latestJournal) {
        journalSnippet = `\nLatest User Journal (${latestJournal.date}): Mood="${latestJournal.mood}", Reflection="${latestJournal.reflection}", PriorityTomorrow="${latestJournal.tomorrowPriority || 'None'}".`;
      }
    }

    // Build compact personalized prompt context
    const userContextPrompt = `
You are the REWIRE AI Coach, an elite personal discipline mentor, behavioral architect, and habit strategist.
The user is named "${user.fullName}".
Current Stats:
- Level: ${user.progress?.currentLevel || 1}
- Challenge Day: ${user.progress?.currentDay || 1}
- Current Streak: ${user.progress?.currentStreak || 0} Days
- Lifetime XP: ${user.progress?.lifetimeXP || 0} XP
- Spendable XP: ${user.progress?.spendableXP || 0} XP
- Today's Completed Missions (${todayCompletions.length}): ${todayCompletions.map(c => c.mission.title).join(', ') || 'None yet today'}
- Active Goals: ${activeGoals.map(g => `${g.title} (${g.progress}%)`).join(', ') || 'None set yet'}
- Recent Deep Work Sessions: ${recentFocus.length} sessions logged (${recentFocus.reduce((a, b) => a + b.durationMinutes, 0)}m total)${journalSnippet}

COACHING DIRECTIVES:
1. Speak with precision, psychological depth, and action-oriented authority. Avoid cheesy corporate fluff.
2. Ground advice in behavioral momentum, somatic reset techniques, dopamine regulation, and immediate next steps.
3. If the user mentions setbacks, relapse, or laziness, treat them with stoic clarity, not guilt or shame. Focus on immediate reset.
4. Give concrete, executable recommendations that fit their current level.
`.trim();

    // 2. Fetch or create conversation in database
    let conversation;
    if (options.conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: { id: options.conversationId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 12 } }
      });
    }

    if (!conversation) {
      // Create new conversation with title derived from first prompt
      const title = message.length > 30 ? message.slice(0, 30) + '...' : message;
      conversation = await prisma.aIConversation.create({
        data: {
          userId,
          title
        },
        include: { messages: true }
      });
    }

    // 3. Save User message to database
    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message
      }
    });

    // 4. Call Configured LLM Provider
    const aiResponseText = await this.callLLM(userContextPrompt, conversation.messages, message);

    // 5. Save Assistant response to database
    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponseText
      }
    });

    // Update conversation updatedAt
    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });

    return {
      conversationId: conversation.id,
      message: assistantMessage,
      userContextSummary: {
        level: user.progress?.currentLevel || 1,
        streak: user.progress?.currentStreak || 0,
        xp: user.progress?.lifetimeXP || 0,
        journalShared: isJournalAuthorized
      }
    };
  }

  private static async callLLM(
    systemPrompt: string,
    history: { role: string; content: string }[],
    newMessage: string
  ): Promise<string> {
    // If no API key is provided, return a clear, supportive system message explaining how to configure the LLM
    if (!ENV.AI_API_KEY) {
      return (
        `[REWIRE AI COACH — CONFIGURATION NOTICE]\n\n` +
        `The AI Coach engine is connected to the backend, but no LLM API key has been configured yet in backend/.env.\n\n` +
        `To activate live intelligence with Groq (free, high-speed Llama 3.3) or Gemini:\n` +
        `1. Open 'backend/.env'\n` +
        `2. Set AI_PROVIDER=groq (or gemini / openai)\n` +
        `3. Add your AI_API_KEY=your_key_here\n\n` +
        `In the meantime, remember this core law: "Action is the sovereign cure for hesitation. Take one single step right now without overthinking."`
      );
    }

    try {
      if (ENV.AI_PROVIDER === 'gemini') {
        return await this.callGemini(systemPrompt, history, newMessage);
      } else {
        // Groq or OpenAI-compatible endpoint
        return await this.callOpenAICompatible(systemPrompt, history, newMessage);
      }
    } catch (err: any) {
      console.error('LLM Provider API Call Failed:', err);
      return `I encountered an issue connecting to the AI provider (${err.message || 'Network error'}). Verify your API key and connection in backend/.env, or try again in a moment.`;
    }
  }

  private static async callOpenAICompatible(
    systemPrompt: string,
    history: { role: string; content: string }[],
    newMessage: string
  ): Promise<string> {
    const baseUrl = ENV.AI_BASE_URL || (ENV.AI_PROVIDER === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1');
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const cleanKey = (ENV.AI_API_KEY || '').replace(/^["']|["']$/g, '').trim();

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      })),
      { role: 'user', content: newMessage }
    ];

    const modelsToTry = [
      ENV.AI_MODEL,
      ...(ENV.AI_PROVIDER === 'groq' ? ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'] : [])
    ];

    // Deduplicate
    const candidateModels = Array.from(new Set(modelsToTry));

    let lastError: Error | null = null;
    for (const model of candidateModels) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 800
          })
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          if (data.choices?.[0]?.message?.content) {
            return data.choices[0].message.content;
          }
        } else {
          const errText = await response.text();
          lastError = new Error(`AI Provider (${model}) HTTP ${response.status}: ${errText}`);
          // If model not found or invalid request, try next candidate
          if (response.status === 404 || errText.includes('model_not_found') || errText.includes('does not exist')) {
            console.warn(`Model ${model} not available, trying next fallback...`);
            continue;
          }
          throw lastError;
        }
      } catch (err: any) {
        lastError = err;
        if (err.message?.includes('model_not_found') || err.message?.includes('404')) {
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('Failed to generate response from AI provider.');
  }

  private static async callGemini(
    systemPrompt: string,
    history: { role: string; content: string }[],
    newMessage: string
  ): Promise<string> {
    const model = ENV.AI_MODEL || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.AI_API_KEY}`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nPrevious context:\n${history.map(h => `${h.role}: ${h.content}`).join('\n')}\n\nUser Question:\n${newMessage}` }]
      }
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
  }

  static async getConversations(userId: string) {
    return prisma.aIConversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  static async getConversation(userId: string, conversationId: string) {
    const conv = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conv) {
      throw new AppError('Conversation not found.', 404);
    }

    return conv;
  }

  static async deleteConversation(userId: string, conversationId: string) {
    const conv = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId }
    });

    if (!conv) {
      throw new AppError('Conversation not found.', 404);
    }

    await prisma.aIConversation.delete({
      where: { id: conversationId }
    });

    return { success: true };
  }

  static async clearHistory(userId: string) {
    await prisma.aIConversation.deleteMany({
      where: { userId }
    });

    return { success: true, message: 'All AI Coach conversation history cleared.' };
  }
}
