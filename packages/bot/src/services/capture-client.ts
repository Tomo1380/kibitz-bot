import axios from 'axios';

interface ScreenshotResponse {
  image: string;
  capturedAt: string;
}

interface GameInfo {
  game: {
    name: string;
    genre: string;
    persona: string;
  } | null;
}

export class CaptureClient {
  constructor(private baseUrl: string) {}

  async getScreenshot(): Promise<ScreenshotResponse | null> {
    try {
      const response = await axios.get<ScreenshotResponse>(
        `${this.baseUrl}/screenshot`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      console.error('[CaptureClient] getScreenshot failed:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  async getGameInfo(): Promise<GameInfo> {
    try {
      const response = await axios.get<GameInfo>(
        `${this.baseUrl}/game-info`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      console.error('[CaptureClient] getGameInfo failed:', error instanceof Error ? error.message : error);
      return { game: null };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/health`, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
