import 'dotenv/config';
import Fastify from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { GameAnalyzer } from './analyzer';

const PORT = parseInt(process.env.PORT ?? '3457', 10);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('[ai-service] ANTHROPIC_API_KEY が設定されていません。');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const analyzer = new GameAnalyzer(anthropic);

const fastify = Fastify({ logger: true });

// --- POST /analyze ---
interface AnalyzeBody {
  image: string;
  question?: string;
  gameName?: string;
  genre?: string;
}

fastify.post<{ Body: AnalyzeBody }>('/analyze', async (request, reply) => {
  const { image, question, gameName, genre } = request.body;

  if (!image) {
    return reply.status(400).send({ error: 'image は必須です。' });
  }

  const result = await analyzer.analyze({
    image_base64: image,
    question,
    game_name: gameName,
    genre,
  });

  return reply.send({
    answer: result.answer,
    persona_name: result.persona_name,
  });
});

// --- POST /react ---
interface ReactBody {
  image: string;
  eventType: string;
  gameName?: string;
  genre?: string;
}

fastify.post<{ Body: ReactBody }>('/react', async (request, reply) => {
  const { image, eventType, gameName, genre } = request.body;

  if (!image || !eventType) {
    return reply
      .status(400)
      .send({ error: 'image と eventType は必須です。' });
  }

  const result = await analyzer.react({
    image_base64: image,
    event_type: eventType as 'periodic' | 'death' | 'kill' | 'boss' | 'discovery',
    game_name: gameName,
    genre,
  });

  return reply.send({
    reaction: result.reaction,
    persona_name: result.persona_name,
  });
});

// --- GET /health ---
fastify.get('/health', async (_request, reply) => {
  return reply.send({ status: 'ok' });
});

// --- サーバー起動 ---
const start = async (): Promise<void> => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(
      `[ai-service] Fastify サーバーが起動しました: http://0.0.0.0:${PORT}`
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// グレースフルシャットダウン
const shutdown = async (): Promise<void> => {
  console.log('[ai-service] シャットダウン中...');
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', () => {
  shutdown().catch(console.error);
});
process.on('SIGTERM', () => {
  shutdown().catch(console.error);
});

start().catch(console.error);
