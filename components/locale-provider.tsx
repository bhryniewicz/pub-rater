"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";

type LocaleContextType = {
  locale: string;
  setLocale: (locale: string) => void;
};

const LocaleContext = createContext<LocaleContextType>({
  locale: "pl",
  setLocale: () => {},
});

export function useLocaleContext() {
  return useContext(LocaleContext);
}

type Props = {
  locale: string;
  messages: Record<string, AbstractIntlMessages>;
  children: React.ReactNode;
};

export function LocaleProvider({
  locale: initialLocale,
  messages,
  children,
}: Props) {
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale);
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
