import Anthropic from '@anthropic-ai/sdk';
import { getPersona } from './persona';
import { getGameContext } from './game-kb';

const eventInstructions: Record<string, string> = {
  periodic: '画面を観察して、今起きていることについて短くコメントしてください。長くても1〜2文で。',
  death: 'プレイヤーが死亡しました。短く励ましのコメントをしてください。1文で。',
  kill: 'プレイヤーが敵を倒しました！称賛のコメントを短くしてください。1文で。',
  boss: 'ボス戦が始まりました。緊張感のあるコメントを短くしてください。1文で。',
  discovery: '何か新しいものを発見しました。探索を促すコメントを短くしてください。1文で。',
};

export class AiClient {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  async analyze(
    imageBase64: string,
    question?: string,
    gameName?: string,
    genre?: string
  ): Promise<string> {
    try {
      const g = genre ?? 'other';
      const name = gameName ?? '';
      const persona = getPersona(g, name);
      const gameContext = getGameContext(name);
      const systemPrompt = gameContext
        ? `${persona.systemPrompt}\n\n${gameContext}`
        : persona.systemPrompt;
      const userText = question && question.trim() !== '' ? question : '画面を見てアドバイスして';

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
              },
              { type: 'text', text: userText },
            ],
          },
        ],
      });

      const first = response.content[0];
      return first.type === 'text' ? first.text : 'すみません、解析できませんでした。';
    } catch (error) {
      console.error('[AiClient] analyze failed:', error instanceof Error ? error.message : error);
      return 'すみません、解析できませんでした。';
    }
  }

  async react(
    imageBase64: string,
    eventType: string,
    gameName?: string,
    genre?: string
  ): Promise<string | null> {
    try {
      const g = genre ?? 'other';
      const name = gameName ?? '';
      const persona = getPersona(g, name);
      const instruction = eventInstructions[eventType] ?? eventInstructions['periodic'];
      const systemPrompt = `${persona.systemPrompt}\n\nリアクションスタイル: ${persona.reactionStyle}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
              },
              { type: 'text', text: instruction },
            ],
          },
        ],
      });

      const first = response.content[0];
      return first.type === 'text' ? first.text : null;
    } catch (error) {
      console.error('[AiClient] react failed:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  // health check用（後方互換性のため残す）
  async isHealthy(): Promise<boolean> {
    return true;
  }
}
