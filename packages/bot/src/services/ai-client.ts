import axios from 'axios';

interface AnalyzeRequest {
  image: string;
  question?: string;
  gameName?: string;
  genre?: string;
}

interface AnalyzeResponse {
  answer: string;
}

interface ReactRequest {
  image: string;
  eventType: string;
  gameName?: string;
  genre?: string;
}

interface ReactResponse {
  reaction: string;
}

interface HealthResponse {
  status: string;
}

export class AiClient {
  constructor(private baseUrl: string) {}

  async analyze(
    imageBase64: string,
    question?: string,
    gameName?: string,
    genre?: string
  ): Promise<string> {
    try {
      const payload: AnalyzeRequest = {
        image: imageBase64,
        ...(question !== undefined && { question }),
        ...(gameName !== undefined && { gameName }),
        ...(genre !== undefined && { genre }),
      };

      const response = await axios.post<AnalyzeResponse>(
        `${this.baseUrl}/analyze`,
        payload,
        { timeout: 30000 }
      );

      return response.data.answer;
    } catch (error) {
      console.error(
        '[AiClient] analyze failed:',
        error instanceof Error ? error.message : error
      );
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
      const payload: ReactRequest = {
        image: imageBase64,
        eventType,
        ...(gameName !== undefined && { gameName }),
        ...(genre !== undefined && { genre }),
      };

      const response = await axios.post<ReactResponse>(
        `${this.baseUrl}/react`,
        payload,
        { timeout: 30000 }
      );

      return response.data.reaction;
    } catch (error) {
      console.error(
        '[AiClient] react failed:',
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await axios.get<HealthResponse>(`${this.baseUrl}/health`, {
        timeout: 3000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
