import screenshot from 'screenshot-desktop';
import sharp from 'sharp';

export interface CapturedFrame {
  base64: string;
  width: number;
  height: number;
  capturedAt: Date;
  sizeBytes: number;
}

export class ScreenCapture {
  private latestFrame: CapturedFrame | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly captureIntervalMs: number;
  private readonly quality: number;
  private readonly targetWidth = 1280;
  private readonly targetHeight = 720;

  constructor() {
    this.captureIntervalMs = parseInt(
      process.env.CAPTURE_INTERVAL_MS ?? '2000',
      10
    );
    this.quality = parseInt(process.env.SCREENSHOT_QUALITY ?? '80', 10);
  }

  /**
   * バックグラウンドキャプチャを開始する
   */
  start(): void {
    // 起動時に即座に1枚撮影
    this.captureOnce().catch((err) => {
      console.error('[ScreenCapture] 初回キャプチャエラー:', err);
    });

    this.intervalId = setInterval(() => {
      this.captureOnce().catch((err) => {
        console.error('[ScreenCapture] キャプチャエラー:', err);
      });
    }, this.captureIntervalMs);
  }

  /**
   * バックグラウンドキャプチャを停止する
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 最新のキャプチャフレームを取得する
   */
  getLatestFrame(): CapturedFrame | null {
    return this.latestFrame;
  }

  /**
   * スクリーンショットを1枚撮影してメモリキャッシュに保存する
   */
  private async captureOnce(): Promise<void> {
    // screenshot-desktop で画面全体をキャプチャ（Buffer を返す）
    const rawBuffer: Buffer = await screenshot({ format: 'png' });

    // sharp で 1280x720 にリサイズして JPEG に変換
    const jpegBuffer = await sharp(rawBuffer)
      .resize(this.targetWidth, this.targetHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: this.quality })
      .toBuffer();

    const base64 = jpegBuffer.toString('base64');

    this.latestFrame = {
      base64,
      width: this.targetWidth,
      height: this.targetHeight,
      capturedAt: new Date(),
      sizeBytes: jpegBuffer.byteLength,
    };
  }
}
