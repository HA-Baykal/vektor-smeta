"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramContextType {
  isInTelegram: boolean;
  isTelegramReady: boolean;
  user: TelegramUser | null;
  initData: string;
  isAdmin: boolean;
  webApp: any;
  expand: () => void;
  close: () => void;
}

const TelegramContext = createContext<TelegramContextType>({
  isInTelegram: false,
  isTelegramReady: false,
  user: null,
  initData: "",
  isAdmin: false,
  webApp: null,
  expand: () => {},
  close: () => {},
});

export const useTelegram = () => useContext(TelegramContext);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [isTelegramReady, setIsTelegramReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [webApp, setWebApp] = useState<any>(null);

  useEffect(() => {
    // Check if inside Telegram WebApp
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg) {
      setIsInTelegram(true);
      setWebApp(tg);
      
      try {
        tg.ready();
        tg.expand();

        // Enable closing confirmation if needed
        // tg.enableClosingConfirmation();

        const initDataStr = tg.initData || "";
        setInitData(initDataStr);

        // Get user from initDataUnsafe (client side, not validated)
        const tgUser = tg.initDataUnsafe?.user as TelegramUser | undefined;
        if (tgUser) {
          setUser(tgUser);
          
          // Check if admin - hardcoded check for your ID + env check via API
          // For security, proper admin check should be server-side via /api/telegram/validate
          if (String(tgUser.id) === "6567941949") {
            setIsAdmin(true);
          } else {
            // Check via API
            fetch(`/api/telegram/validate?userId=${tgUser.id}`)
              .then(res => res.json())
              .then(json => {
                if (json.isAdmin) setIsAdmin(true);
              })
              .catch(() => {});
          }
        }

        // Set theme
        if (tg.colorScheme === "dark") {
          document.documentElement.classList.add("dark");
        }

        setIsTelegramReady(true);
      } catch (e) {
        console.error("Telegram WebApp init error:", e);
        setIsTelegramReady(true);
      }
    } else {
      // Not in Telegram - still ready
      setIsTelegramReady(true);
    }
  }, []);

  const expand = () => {
    webApp?.expand();
  };

  const close = () => {
    webApp?.close();
  };

  return (
    <TelegramContext.Provider
      value={{
        isInTelegram,
        isTelegramReady,
        user,
        initData,
        isAdmin,
        webApp,
        expand,
        close,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
};
