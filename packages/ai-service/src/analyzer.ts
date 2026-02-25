/**
 * Claude Vision APIを使ったゲーム画面解析クラス
 */

import Anthropic from '@anthropic-ai/sdk';
import { getPersona } from './persona';
import { getGameContext } from './game-kb';

export interface AnalyzeRequest {
  image_base64: string; // JPEG画像のbase64
  question?: string;    // ユーザーの質問（任意）
  game_name?: string;   // 現在のゲーム名（任意）
  genre?: string;       // ゲームジャンル（任意）
}

export interface AnalyzeResponse {
  answer: string;
  persona_name: string;
}

export interface ReactRequest {
  image_base64: string;
  event_type: 'periodic' | 'death' | 'kill' | 'boss' | 'discovery';
  game_name?: string;
  genre?: string;
}

export interface ReactResponse {
  reaction: string;
  persona_name: string;
}

/** event_type ごとの指示文 */
const eventInstructions: Record<ReactRequest['event_type'], string> = {
  periodic:
    '画面を観察して、今起きていることについて短くコメントしてください。長くても1〜2文で。',
  death:
    'プレイヤーが死亡しました。短く励ましのコメントをしてください。1文で。',
  kill:
    'プレイヤーが敵を倒しました！称賛のコメントを短くしてください。1文で。',
  boss:
    'ボス戦が始まりました。緊張感のあるコメントを短くしてください。1文で。',
  discovery:
    '何か新しいものを発見しました。探索を促すコメントを短くしてください。1文で。',
};

export class GameAnalyzer {
  constructor(private client: Anthropic) {}

  /**
   * ゲーム画面を解析してアドバイスを返す
   */
  async analyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
    const genre = req.genre ?? 'other';
    const gameName = req.game_name ?? '';

    const persona = getPersona(genre, gameName);
    const gameContext = getGameContext(gameName);

    const systemPrompt = gameContext
      ? `${persona.systemPrompt}\n\n${gameContext}`
      : persona.systemPrompt;

    const userText = req.question && req.question.trim() !== ''
      ? req.question
      : '画面を見てアドバイスして';

    console.log(`[analyze] ペルソナ: ${persona.name}, ゲーム: ${gameName || '不明'}, 質問: ${userText}`);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: req.image_base64,
              },
            },
            {
              type: 'text',
              text: userText,
            },
          ],
        },
      ],
    });

    const firstBlock = response.content[0];
    const answer = firstBlock.type === 'text' ? firstBlock.text : '';

    return {
      answer,
      persona_name: persona.name,
    };
  }

  /**
   * ゲームイベントに応じた短いリアクションを返す
   */
  async react(req: ReactRequest): Promise<ReactResponse> {
    const genre = req.genre ?? 'other';
    const gameName = req.game_name ?? '';

    const persona = getPersona(genre, gameName);

    const instruction = eventInstructions[req.event_type];
    const systemPrompt = `${persona.systemPrompt}\n\nリアクションスタイル: ${persona.reactionStyle}`;

    console.log(`[react] ペルソナ: ${persona.name}, イベント: ${req.event_type}`);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: req.image_base64,
              },
            },
            {
              type: 'text',
              text: instruction,
            },
          ],
        },
      ],
    });

    const firstBlock = response.content[0];
    const reaction = firstBlock.type === 'text' ? firstBlock.text : '';

    return {
      reaction,
      persona_name: persona.name,
    };
  }
}
