import React, { useEffect, useState, useCallback, useRef } from 'react';

// ----------- Types (mirrors preload KibitzState) -----------
interface ReactionEntry {
  id: string;
  text: string;
  personaName: string;
  timestamp: string;
}

interface KibitzState {
  serverUrl: string;
  isCapturing: boolean;
  currentGame: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  recentReactions: ReactionEntry[];
}

// Access the API injected by preload.ts
declare global {
  interface Window {
    kibitz: {
      getState(): Promise<KibitzState>;
      setServerUrl(url: string): Promise<{ ok: boolean }>;
      startCapture(): Promise<{ ok: boolean }>;
      stopCapture(): Promise<{ ok: boolean }>;
      testConnection(): Promise<{ ok: boolean }>;
      onStateUpdate(callback: (state: KibitzState) => void): () => void;
    };
  }
}

// ----------- Small UI helpers -----------
function StatusDot({ status }: { status: KibitzState['connectionStatus'] }) {
  const colors: Record<KibitzState['connectionStatus'], string> = {
    connected: 'var(--green)',
    disconnected: 'var(--text-muted)',
    error: 'var(--red)',
  };
  const labels: Record<KibitzState['connectionStatus'], string> = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: colors[status],
          boxShadow: status === 'connected' ? `0 0 6px ${colors[status]}` : undefined,
        }}
      />
      <span style={{ color: colors[status], fontSize: 13 }}>{labels[status]}</span>
    </span>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ----------- Main App -----------
export default function App() {
  const [state, setState] = useState<KibitzState>({
    serverUrl: '',
    isCapturing: false,
    currentGame: null,
    connectionStatus: 'disconnected',
    recentReactions: [],
  });
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const reactionsEndRef = useRef<HTMLDivElement>(null);

  // Load initial state
  useEffect(() => {
    window.kibitz.getState().then((s) => {
      setState(s);
      setServerUrlInput(s.serverUrl);
    });

    const unsubscribe = window.kibitz.onStateUpdate((s) => {
      setState(s);
    });
    return unsubscribe;
  }, []);

  // Auto-scroll reactions list to bottom
  useEffect(() => {
    reactionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.recentReactions.length]);

  const handleToggleCapture = useCallback(async () => {
    if (state.isCapturing) {
      await window.kibitz.stopCapture();
    } else {
      await window.kibitz.startCapture();
    }
  }, [state.isCapturing]);

  const handleSaveServerUrl = useCallback(async () => {
    setIsSavingUrl(true);
    await window.kibitz.setServerUrl(serverUrlInput);
    setIsSavingUrl(false);
  }, [serverUrlInput]);

  const handleTestConnection = useCallback(async () => {
    setIsTestingConn(true);
    setTestResult(null);
    const result = await window.kibitz.testConnection();
    setTestResult(result.ok ? 'ok' : 'fail');
    setIsTestingConn(false);
  }, []);

  // ----------- Render -----------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header
        style={{
          padding: '14px 16px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎮</span>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '0.5px' }}>Kibitz</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>AI Game Companion</span>
        </div>
        <button
          onClick={() => setShowSettings((v) => !v)}
          title="Settings"
          style={{
            background: 'none',
            border: 'none',
            color: showSettings ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: 18,
            padding: '2px 6px',
            borderRadius: 4,
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          ⚙️
        </button>
      </header>

      {/* Settings panel (collapsible) */}
      {showSettings && (
        <div
          style={{
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            padding: '12px 16px',
          }}
        >
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            AI Service URL
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={serverUrlInput}
              onChange={(e) => setServerUrlInput(e.target.value)}
              placeholder="https://kibitz-ai.railway.app"
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                padding: '6px 10px',
                fontSize: 13,
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveServerUrl();
              }}
            />
            <button
              onClick={handleSaveServerUrl}
              disabled={isSavingUrl}
              style={btnStyle('var(--bg-input)')}
            >
              {isSavingUrl ? '...' : 'Save'}
            </button>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleTestConnection}
              disabled={isTestingConn}
              style={btnStyle('var(--bg-input)')}
            >
              {isTestingConn ? 'Testing...' : 'Test Connection'}
            </button>
            {testResult === 'ok' && (
              <span style={{ color: 'var(--green)', fontSize: 13 }}>Connection OK</span>
            )}
            {testResult === 'fail' && (
              <span style={{ color: 'var(--red)', fontSize: 13 }}>Connection failed</span>
            )}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div
        style={{
          padding: '10px 16px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <StatusDot status={state.connectionStatus} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          {state.currentGame ? (
            <span style={{ fontSize: 13, color: 'var(--text)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Playing: </span>
              <strong>{state.currentGame}</strong>
            </span>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No game detected</span>
          )}
        </div>
        {/* Capture toggle */}
        <button
          onClick={handleToggleCapture}
          style={{
            ...btnStyle(state.isCapturing ? 'var(--accent)' : 'var(--bg-input)'),
            minWidth: 100,
            fontWeight: 600,
          }}
        >
          {state.isCapturing ? '⏹ Stop' : '▶ Start'}
        </button>
      </div>

      {/* Reactions list */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <h2 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Recent AI Reactions
        </h2>

        {state.recentReactions.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              marginTop: 60,
              lineHeight: 1.8,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎮</div>
            <div>
              {state.isCapturing
                ? 'Watching for a game...'
                : 'Press Start to begin capturing'}
            </div>
            {state.isCapturing && !state.currentGame && (
              <div style={{ fontSize: 12, marginTop: 8 }}>
                Switch to a game window to get AI reactions
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.recentReactions.map((reaction) => (
              <ReactionCard key={reaction.id} reaction={reaction} />
            ))}
            <div ref={reactionsEndRef} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        Kibitz minimizes to the system tray — reactions appear as notifications
      </footer>
    </div>
  );
}

// ----------- Reaction card -----------
function ReactionCard({ reaction }: { reaction: ReactionEntry }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {reaction.personaName}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {formatTime(reaction.timestamp)}
        </span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)', margin: 0 }}>
        {reaction.text}
      </p>
    </div>
  );
}

// ----------- Button style helper -----------
function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    whiteSpace: 'nowrap',
  };
}
