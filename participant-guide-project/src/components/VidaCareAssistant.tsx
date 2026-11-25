import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  MessageSquare,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import {
  AssistantMessage,
  createWelcomeMessage,
  generateAssistantReply,
  queryFutureAssistantBackendPlaceholder,
} from '../lib/assistantEngine';
import { formatINR } from '../lib/format';
import {
  VIDACARE_ASSISTANT_KEY,
  VIDACARE_RESET_EVENT,
  generateUniqueId,
  readStoredAssistantHistory,
  safeParseJSON,
  writeStoredAssistantHistory,
} from '../lib/storage';
import { BrandMark } from './ui/DesignPrimitives';

export const VidaCareAssistant: React.FC = () => {
  const { approvedCampaigns, categories, user } = useVidaCare();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>(() =>
    readStoredAssistantHistory([createWelcomeMessage(categories)])
  );
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Persist chat history in LocalStorage
  useEffect(() => {
    writeStoredAssistantHistory(messages);
  }, [messages]);

  // Listen for demo store resets and cross-tab assistant history updates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleReset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setIsTyping(false);
      setInputError('');
      setLastFailedPrompt(null);
      setMessages([createWelcomeMessage(categories)]);
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== VIDACARE_ASSISTANT_KEY) return;
      if (!e.newValue) {
        setMessages([createWelcomeMessage(categories)]);
        return;
      }
      const parsed = safeParseJSON<AssistantMessage[]>(e.newValue);
      if (parsed.ok && Array.isArray(parsed.value) && parsed.value.length > 0) {
        setMessages(parsed.value);
      }
    };
    window.addEventListener(VIDACARE_RESET_EVENT, handleReset);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(VIDACARE_RESET_EVENT, handleReset);
      window.removeEventListener('storage', handleStorage);
    };
  }, [categories]);

  // Smooth scroll to latest message when opened or updated
  useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when opened & Escape closes window
  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleClearChat = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setIsTyping(false);
    setInputError('');
    setLastFailedPrompt(null);
    const freshWelcome = createWelcomeMessage(categories);
    setMessages([freshWelcome]);
    writeStoredAssistantHistory([freshWelcome]);
  };

  const sendQuery = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setInputError('Please type a question or choose a quick topic below.');
      return;
    }
    if (trimmed.length > 320) {
      setInputError('Please keep your question under 320 characters.');
      return;
    }
    if (isTyping) return;

    setInputError('');
    setLastFailedPrompt(null);

    const userMsg: AssistantMessage = {
      id: generateUniqueId('usr'),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    const delayMs =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 40
        : 420;

    timerRef.current = window.setTimeout(async () => {
      try {
        const backendReply = await queryFutureAssistantBackendPlaceholder(trimmed);
        const reply =
          backendReply ??
          generateAssistantReply(trimmed, {
            approvedCampaigns,
            categories,
            user,
          });
        setMessages((prev) => [...prev, reply]);
      } catch {
        setLastFailedPrompt(trimmed);
        setMessages((prev) => [
          ...prev,
          {
            id: generateUniqueId('err'),
            sender: 'assistant',
            text: 'Unable to prepare a response right now. You can retry your question or use the direct VidaCare navigation links below.',
            timestamp: new Date().toISOString(),
            isError: true,
            links: [
              { label: 'Campaigns', to: '/campaigns' },
              { label: 'Contact Support', to: '/contact' },
            ],
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    }, delayMs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuery(inputValue);
  };

  return (
    <div className="print-hide fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {/* Floating Chat Window */}
      <div
        id="vidacare-assistant-panel"
        role="dialog"
        aria-label="VidaCare Assistant"
        aria-hidden={!isOpen}
        className={`mb-3 flex w-[calc(100vw-2rem)] max-w-[410px] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-sky-300/25 bg-[#070F22]/95 shadow-[0_24px_60px_-15px_rgba(2,6,23,0.95),0_0_40px_-14px_rgba(56,189,248,0.28)] backdrop-blur-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-95 opacity-0 h-0 border-0 shadow-none mb-0'
        }`}
        style={
          isOpen
            ? { maxHeight: 'min(610px, calc(100vh - 6.5rem))' }
            : undefined
        }
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b vc-hairline bg-[#0B1630]/90 px-4 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/35 bg-amber-300/10 text-amber-300">
              <BrandMark className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-base font-semibold text-slate-50">
                VidaCare Assistant
              </h2>
              <p className="truncate text-[11px] text-slate-400">
                Automated Helper · Not Medical Advice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleClearChat}
              title="Clear chat history"
              aria-label="Clear chat history"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-amber-300/40 hover:text-amber-200"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close VidaCare Assistant"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 transition-colors hover:border-sky-300/40 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Always-Accessible Portal Navigation Strip */}
        <div className="flex items-center gap-3 overflow-x-auto border-b vc-hairline bg-[#060D1E]/90 px-4 py-2 text-[11px] font-medium text-slate-300">
          <Link
            to="/campaigns"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-amber-300"
          >
            Campaigns
          </Link>
          <span aria-hidden="true" className="text-slate-700">
            ·
          </span>
          <Link
            to="/dashboard"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-teal-300"
          >
            Create Fundraiser
          </Link>
          <span aria-hidden="true" className="text-slate-700">
            ·
          </span>
          <Link
            to="/login"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-sky-300"
          >
            Login
          </Link>
          <span aria-hidden="true" className="text-slate-700">
            ·
          </span>
          <Link
            to="/signup"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-sky-300"
          >
            Signup
          </Link>
        </div>

        {/* Chat Thread */}
        <div
          aria-live="polite"
          className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4"
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-2 ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isUser
                      ? 'border border-amber-300/35 bg-amber-300/15 text-amber-50'
                      : msg.isError
                      ? 'border border-rose-400/35 bg-rose-950/35 text-rose-100'
                      : 'border border-slate-800/90 bg-slate-900/85 text-slate-200'
                  }`}
                >
                  {msg.isError && (
                    <div className="mb-1 flex items-center gap-1.5 font-semibold text-rose-300">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Response Interrupted</span>
                    </div>
                  )}
                  <p>{msg.text}</p>

                  {msg.isError && lastFailedPrompt && (
                    <button
                      type="button"
                      onClick={() => void sendQuery(lastFailedPrompt)}
                      className="mt-2 inline-flex items-center rounded-md border border-rose-300/40 bg-rose-900/40 px-2.5 py-1 text-[11px] font-medium text-rose-100 hover:bg-rose-900/60"
                    >
                      Retry Question
                    </button>
                  )}

                  {/* Approved Matching Campaigns */}
                  {msg.campaigns && msg.campaigns.length > 0 && (
                    <div className="mt-2.5 flex flex-col gap-2 border-t border-slate-800 pt-2.5">
                      {msg.campaigns.map((c) => (
                        <Link
                          key={c.id}
                          to={`/campaigns/${c.id}`}
                          className="group flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/75 p-2.5 transition-colors hover:border-amber-300/45"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 font-medium text-teal-300">
                              <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span>Approved · {c.category}</span>
                            </span>
                            <ArrowRight
                              className="h-3 w-3 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300"
                              aria-hidden="true"
                            />
                          </div>
                          <p className="font-medium text-slate-100 group-hover:text-amber-200">
                            {c.title}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {c.patientName} · {c.hospitalName}
                          </p>
                          <p className="font-mono text-[11px] tabular-nums text-sky-300">
                            {formatINR(c.raisedAmount)} raised of{' '}
                            {formatINR(c.goalAmount)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Functional Action Links */}
                  {msg.links && msg.links.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-2.5">
                      {msg.links.map((lnk) => (
                        <Link
                          key={`${msg.id}-${lnk.to}-${lnk.label}`}
                          to={lnk.to}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium text-sky-200 transition-colors hover:border-amber-300/50 hover:text-amber-200"
                        >
                          <span>{lnk.label}</span>
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suggested / Quick Question Buttons */}
                {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex max-w-[95%] flex-wrap gap-1.5">
                    {msg.suggestions.map((suggestion) => (
                      <button
                        key={`${msg.id}-${suggestion}`}
                        type="button"
                        onClick={() => void sendQuery(suggestion)}
                        className="rounded-lg border border-slate-800 bg-slate-950/75 px-2.5 py-1.5 text-left text-[11px] text-slate-300 transition-colors hover:border-amber-300/45 hover:text-amber-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Animation */}
          {isTyping && (
            <div className="flex items-start">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800/90 bg-slate-900/85 px-3.5 py-2.5 text-xs text-slate-300">
                <Bot className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                <span className="text-[11px] text-slate-400">Checking VidaCare</span>
                <span className="inline-flex items-center gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-bounce motion-reduce:animate-none rounded-full bg-amber-300 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce motion-reduce:animate-none rounded-full bg-sky-300 [animation-delay:140ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce motion-reduce:animate-none rounded-full bg-teal-300 [animation-delay:280ms]" />
                </span>
              </div>
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Composer Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="border-t vc-hairline bg-[#060D1E]/95 p-3"
        >
          {inputError && (
            <p role="alert" className="mb-2 text-[11px] text-rose-300">
              {inputError}
            </p>
          )}
          <div className="flex items-center gap-2">
            <label htmlFor="vidacare-assistant-input" className="sr-only">
              Ask VidaCare Assistant
            </label>
            <input
              ref={inputRef}
              id="vidacare-assistant-input"
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (inputError) setInputError('');
              }}
              placeholder="Ask about donating, categories, or fundraisers..."
              className="min-h-[42px] flex-1 rounded-xl border border-slate-800 bg-slate-950/85 px-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isTyping}
              aria-label="Send message"
              className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-teal-400 text-slate-950 transition-colors hover:bg-teal-300 disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>

      {/* Floating Launcher Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls="vidacare-assistant-panel"
          className="inline-flex h-12 items-center gap-2.5 rounded-full border border-amber-300/40 bg-[#0A1328]/95 px-4 text-xs font-semibold text-slate-50 shadow-[0_12px_32px_-8px_rgba(2,6,23,0.9),0_0_24px_-8px_rgba(251,191,36,0.45)] backdrop-blur-xl transition-transform duration-150 hover:scale-[1.03] hover:border-amber-300/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 whitespace-nowrap shrink-0"
        >
          {isOpen ? (
            <>
              <X className="h-4 w-4 text-amber-300" aria-hidden="true" />
              <span>Close Assistant</span>
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 text-amber-300" aria-hidden="true" />
              <span>VidaCare Assistant</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
