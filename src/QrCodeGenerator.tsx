import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import { Loader2, AlertCircle, Activity } from "lucide-react";

/* ─────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────── */
interface QrApiResponse {
  downloadUrl: string;
  expiresInSeconds: number;
  fileName: string;
  contentType: string;
}

interface QrHistoryEntry {
  text: string;
  url: string;
  createdAt: number;
}

type AppState = "idle" | "loading" | "success" | "error";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string ?? "http://localhost:8080";
const API_URL = `${API_BASE_URL}/qrcode`;
const HISTORY_KEY = "qr-history";
const MAX_HISTORY = 6; 

/* ─────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────── */
function loadHistory(): QrHistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QrHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: QrHistoryEntry[]): void {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

function addToHistory(entry: QrHistoryEntry): QrHistoryEntry[] {
  const current = loadHistory();
  const next = [entry, ...current.filter((e) => e.text !== entry.text)].slice(0, MAX_HISTORY);
  saveHistory(next);
  return next;
}

/* ─────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────── */
export function QrCodeGenerator() {
  const [inputValue, setInputValue] = useState("");
  const [appState, setAppState] = useState<AppState>("idle");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [history, setHistory] = useState<QrHistoryEntry[]>(loadHistory);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateQr = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setAppState("error");
        setErrorMessage("Invalid input — please enter a URL or text.");
        return;
      }

      setAppState("loading");
      setErrorMessage("");

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(
            (errorBody as { message?: string })?.message ?? `Erro HTTP ${response.status}`
          );
        }

        const data = (await response.json()) as QrApiResponse;
        setQrUrl(data.downloadUrl);
        setAppState("success");

        const updated = addToHistory({ text: trimmed, url: data.downloadUrl, createdAt: Date.now() });
        setHistory(updated);
      } catch (err) {
        setAppState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Unable to reach the server. Please try again."
        );
      }
    },
    []
  );

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      generateQr(inputValue);
    }
  }

  function handleHistoryClick(entry: QrHistoryEntry) {
    setInputValue(entry.text);
    setQrUrl(entry.url);
    setAppState("success");
  }

  const isLoading = appState === "loading";
  const isSuccess = appState === "success";
  const isError = appState === "error";

  return (
    <div className="min-h-dvh flex flex-col bg-[#0a0a0a] text-[#ffffff] font-sans selection:bg-[#e8ff8b]/30">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 w-full h-[64px] px-6 bg-[#0a0a0a]/80 border-b border-[rgba(255,255,255,0.08)] backdrop-blur-md z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-[14px] text-[#ffffff]">QR Studio</span>
          <div className="flex items-center gap-2 px-2 py-1 bg-white/5 border border-[rgba(255,255,255,0.08)] rounded-[8px]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#e8ff8b] animate-pulse"></div>
            <span className="text-[11px] font-medium tracking-[0.05em] text-[#ffffff] uppercase leading-none mt-[1px]">LIVE</span>
          </div>
        </div>
        <div className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/5 transition-colors cursor-pointer">
          <Activity className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col items-center pt-[128px] pb-[64px] w-full max-w-[480px] mx-auto px-6">
        <div className="flex flex-col w-full gap-8">
          
          {/* Main Card */}
          <div className="flex flex-col p-8 gap-8 bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-[12px] w-full isolation-auto shadow-2xl">
            
            {/* Header Text */}
            <div className="flex flex-col gap-2">
              <h1 className="text-[20px] font-medium text-[#ffffff] tracking-tight">Create Code</h1>
              <p className="text-[14px] font-normal text-[rgba(255,255,255,0.5)] leading-relaxed">Generate high-fidelity QR codes instantly.</p>
            </div>

            {/* Input Area */}
            <div className="flex flex-col gap-3">
              <label htmlFor="qr-input" className="text-[11px] font-medium uppercase tracking-[0.05em] text-[rgba(255,255,255,0.5)]">
                CONTENT
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="qr-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (isError) setAppState("idle");
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder="https://example.com"
                  autoComplete="off"
                  className={`w-full h-[40px] px-0 bg-transparent border-b transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono text-[12px] ${
                    isError 
                      ? "border-[#ff6b6b] focus:border-[#ff6b6b] focus:shadow-[0_1px_0_0_#ff6b6b]" 
                      : "border-[rgba(255,255,255,0.08)] focus:border-[#e8ff8b] focus:shadow-[0_1px_0_0_rgba(232,255,139,0.5)]"
                  } text-[#ffffff] placeholder:text-[rgba(255,255,255,0.3)]`}
                />
              </div>
              {isError && errorMessage && (
                <div role="alert" className="flex items-center gap-1.5 mt-1 text-[13px] text-[#ff6b6b]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Success State Frame */}
            {isSuccess && qrUrl && (
              <div className="flex flex-col items-center pt-2 gap-4 w-full animate-fade-in">
                <div className="p-3 w-[240px] h-[240px] bg-white rounded-[12px] flex items-center justify-center shadow-xl">
                  <img src={qrUrl} alt="Generated QR Code" className="w-full h-full object-contain" />
                </div>
              </div>
            )}

            {/* Loading State Frame */}
            {isLoading && !qrUrl && (
              <div className="flex flex-col items-center pt-2 gap-4 w-full">
                <div className="p-3 w-[240px] h-[240px] bg-white/5 border border-[rgba(255,255,255,0.08)] rounded-[12px] flex items-center justify-center shadow-inner animate-pulse">
                  <div className="w-[200px] h-[200px] bg-white/10 rounded-sm"></div>
                </div>
              </div>
            )}

            {/* CTA Button */}
            <button
              type="button"
              onClick={() => generateQr(inputValue)}
              disabled={isLoading}
              className="w-full h-[48px] flex items-center justify-center gap-2 bg-[#e8ff8b] text-[#0a0a0a] font-medium text-[14px] rounded-[20px] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#0a0a0a]" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Generate</span>
              )}
            </button>
          </div>

          {/* Recent History */}
          {history.length > 0 && (
            <div className="flex flex-col gap-4 w-full animate-fade-in">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.05em] text-[rgba(255,255,255,0.5)]">Recent History</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {history.map((entry) => (
                  <button
                    key={entry.createdAt}
                    type="button"
                    onClick={() => handleHistoryClick(entry)}
                    className="p-1 w-[64px] h-[64px] shrink-0 bg-white border border-[rgba(255,255,255,0.08)] rounded-[8px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-sm overflow-hidden"
                    title={entry.text}
                  >
                    <img src={entry.url} alt="QR History" className="w-[54px] h-[54px] object-contain" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full mt-auto bg-transparent border-t border-[rgba(255,255,255,0.08)]">
        <div className="max-w-[480px] mx-auto px-6 py-8 flex justify-between items-center w-full">
          <div className="text-[13px] font-normal text-[rgba(255,255,255,0.5)]">© 2024 QR STUDIO</div>
          <div className="flex gap-6 text-[11px] font-medium text-[rgba(255,255,255,0.5)] tracking-[0.05em] uppercase">
            <a href="#" className="hover:text-[#ffffff] transition-colors">API DOCS</a>
            <a href="#" className="hover:text-[#ffffff] transition-colors">GITHUB</a>
            <a href="#" className="hover:text-[#ffffff] transition-colors">STATUS</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
