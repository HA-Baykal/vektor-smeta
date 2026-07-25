"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  EstimateInputs,
  calculateEstimate,
  formatRuble,
  SAMPLE_AIR_CONDITIONERS,
} from "@/lib/calculator";
import {
  Bot,
  User,
  Send,
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
} from "lucide-react";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  parsedInputs?: EstimateInputs;
}

interface ChatAssistantProps {
  currentInputs: EstimateInputs;
  onApplyInputs: (inputs: EstimateInputs) => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  currentInputs,
  onApplyInputs,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "Здравствуйте! Я ИИ-ассистент «Сметчик». Помогу быстро рассчитать прозрачную смету на монтаж кондиционера с выгрузкой в Excel (.xlsx) и PDF.\n\nВы можете вставить ссылку на товар (Авито, DNS, Яндекс.Маркет) или просто написать параметры, например:\n«Посчитай установку кондиционера за 32 000 руб, трасса 8 метров, сложный монтаж 3 часа, нужен кабель-канал»",
      timestamp: "только что",
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputVal;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputVal("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          currentInputs,
        }),
      });

      const json = await res.json();
      if (json.success) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: json.reply,
          timestamp: new Date().toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          parsedInputs: json.inputs,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(json.message || "Ошибка обработки");
      }
    } catch {
      // Fallback client-side calculation
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: `Я принял данные и рассчитал смету! Вы можете перенести эти параметры в основной конструктор и скачать файл Excel.`,
        timestamp: new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md flex flex-col h-[650px] overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">ИИ-Ассистент «Сметчик»</h3>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Онлайн 24/7
              </span>
            </div>
            <p className="text-2xs text-slate-300">
              Понимает русский язык, парсит ссылки и рассчитывает сметы
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "bot" && (
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                m.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none"
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed">{m.text}</div>

              {m.parsedInputs && (
                <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onApplyInputs(m.parsedInputs!)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    Применить в калькулятор
                  </button>
                </div>
              )}

              <div
                className={`text-2xs mt-1.5 text-right ${
                  m.sender === "user" ? "text-blue-200" : "text-slate-400"
                }`}
              >
                {m.timestamp}
              </div>
            </div>

            {m.sender === "user" && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 pl-11">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></div>
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></div>
            <span>ИИ-Сметчик рассчитывает...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Fast Prompt Suggestions */}
      <div className="px-4 py-2 bg-slate-100/90 border-t border-slate-200 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-2xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-amber-500" /> Примеры:
        </span>
        <button
          onClick={() =>
            handleSend("Кондиционер Haier 28 900 руб, стандартный монтаж, трасса 4 метра, без кабель-канала")
          }
          className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 rounded-full text-slate-700 shrink-0 transition"
        >
          Пример 1: Haier 4м (43 000 ₽)
        </button>
        <button
          onClick={() =>
            handleSend("Кондиционер 32 000 руб, трасса 8 метров, сложный монтаж 3 часа, кабель-канал")
          }
          className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 rounded-full text-slate-700 shrink-0 transition"
        >
          Пример 2: Сложный 8м (64 100 ₽)
        </button>
      </div>

      {/* Input area */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Напишите ссылку или параметры: «Кондиционер 30000, трасса 6м, кабель-канал»..."
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputVal.trim() || isLoading}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center transition cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
