import 'dotenv/config';
import Fastify from 'fastify';
import { GameDetector } from './game-detect';
import { ScreenCapture } from './capture';

const PORT = parseInt(process.env.PORT ?? '3456', 10);

const fastify = Fastify({ logger: true });

const gameDetector = new GameDetector();
const screenCapture = new ScreenCapture();

/**
 * GET /health
 * サービスの稼働状態、検出中ゲーム、最終キャプチャ日時を返す
 */
fastify.get('/health', async (_request, reply) => {
  const game = gameDetector.getDetectedGame();
  const latestFrame = screenCapture.getLatestFrame();

  return reply.send({
    status: 'ok',
    game: game ?? null,
    lastCapture: latestFrame ? latestFrame.capturedAt : null,
  });
});

/**
 * GET /game-info
 * 現在検出中のゲーム情報を返す
 */
fastify.get('/game-info', async (_request, reply) => {
  const game = gameDetector.getDetectedGame();

  return reply.send({
    game: game ?? null,
  });
});

/**
 * GET /screenshot
 * 最新のスクリーンショット（base64 JPEG）を返す
 */
fastify.get('/screenshot', async (_request, reply) => {
  const frame = screenCapture.getLatestFrame();

  if (!frame) {
    return reply.status(503).send({
      error: 'キャプチャがまだ完了していません。しばらくお待ちください。',
    });
  }

  return reply.send({
    image: frame.base64,
    width: frame.width,
    height: frame.height,
    capturedAt: frame.capturedAt.toISOString(),
  });
});

/**
 * サーバー起動
 */
const start = async (): Promise<void> => {
  try {
    // GameDetector と ScreenCapture のバックグラウンド処理を開始
    gameDetector.start();
    screenCapture.start();

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Kibitz Capture] Server started: http://0.0.0.0:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// グレースフルシャットダウン
const shutdown = async (): Promise<void> => {
  console.log('[Kibitz Capture] Shutting down...');
  gameDetector.stop();
  screenCapture.stop();
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
