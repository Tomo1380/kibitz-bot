import psList from 'ps-list';
import activeWin from 'active-win';
import { GAME_LIST, GameEntry } from './game-list';

export interface DetectedGame {
  name: string;
  processName: string;
  pid: number;
  genre: string;
  persona: string;
  detectedAt: Date;
}

export class GameDetector {
  private currentGame: DetectedGame | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly scanIntervalMs = 5000;

  /**
   * 定期スキャンを開始する
   */
  start(): void {
    // 起動時に即座にスキャン
    this.scan().catch((err) => {
      console.error('[GameDetector] 初回スキャンエラー:', err);
    });

    this.intervalId = setInterval(() => {
      this.scan().catch((err) => {
        console.error('[GameDetector] スキャンエラー:', err);
      });
    }, this.scanIntervalMs);
  }

  /**
   * 定期スキャンを停止する
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 現在検出中のゲームを取得する
   */
  getDetectedGame(): DetectedGame | null {
    return this.currentGame;
  }

  /**
   * プロセス一覧をスキャンしてゲームを検出する
   */
  private async scan(): Promise<void> {
    try {
      const processes = await psList();

      // アクティブウィンドウ情報を補完情報として取得
      let activeWindowTitle: string | null = null;
      try {
        const activeWindow = await activeWin();
        if (activeWindow) {
          activeWindowTitle = activeWindow.title;
        }
      } catch {
        // active-win はプラットフォーム依存のため、失敗してもスキャンは継続する
      }

      // GAME_LIST と照合（processName を部分一致で検索）
      for (const process of processes) {
        const processNameLower = process.name.toLowerCase();

        const matchedEntry = this.findMatchingGame(processNameLower);
        if (matchedEntry) {
          const detected: DetectedGame = {
            name: matchedEntry.displayName,
            processName: process.name,
            pid: process.pid,
            genre: matchedEntry.genre,
            persona: matchedEntry.persona,
            detectedAt: new Date(),
          };

          const previousGame = this.currentGame;
          this.currentGame = detected;

          if (!previousGame || previousGame.name !== detected.name) {
            console.log(
              `[GameDetector] ゲーム検出: ${detected.name} (PID: ${detected.pid})`,
              activeWindowTitle ? `アクティブウィンドウ: ${activeWindowTitle}` : ''
            );
          }
          return;
        }
      }

      // ゲームが見つからなかった場合
      if (this.currentGame !== null) {
        console.log(`[GameDetector] ゲーム終了を検出: ${this.currentGame.name}`);
        this.currentGame = null;
      }
    } catch (err) {
      console.error('[GameDetector] プロセススキャン失敗:', err);
    }
  }

  /**
   * プロセス名に部分一致するゲームエントリを検索する
   */
  private findMatchingGame(processNameLower: string): GameEntry | undefined {
    return GAME_LIST.find((entry) =>
      processNameLower.includes(entry.processName.toLowerCase())
    );
  }
}
