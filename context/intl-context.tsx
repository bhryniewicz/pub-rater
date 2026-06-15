"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";

// Exposes only setLocale — reading locale goes through next-intl's useLocale()
const SetLocaleContext = createContext<(locale: string) => void>(() => {});

export function useSetLocale() {
  return useContext(SetLocaleContext);
}

type Props = {
  initialLocale: string;
  allMessages: Record<string, AbstractIntlMessages>;
  children: React.ReactNode;
};

export function IntlProvider({ initialLocale, allMessages, children }: Props) {
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback((lang: string) => {
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    setLocaleState(lang);
  }, []);

  return (
    <SetLocaleContext.Provider value={setLocale}>
      <NextIntlClientProvider locale={locale} messages={allMessages[locale]}>
        {children}
      </NextIntlClientProvider>
    </SetLocaleContext.Provider>
  );
}
