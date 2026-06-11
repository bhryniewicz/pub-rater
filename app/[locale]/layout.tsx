import { hasLocale, type AbstractIntlMessages } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { NotificationWatcher } from "@/components/notification-watcher";
import { IntlProvider } from "@/components/intl-provider";
import plMessages from "@/messages/pl.json";
import enMessages from "@/messages/en.json";

const allMessages: Record<string, AbstractIntlMessages> = {
  pl: plMessages as AbstractIntlMessages,
  en: enMessages as AbstractIntlMessages,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <IntlProvider initialLocale={locale} allMessages={allMessages}>
      <NotificationWatcher />
      {children}
    </IntlProvider>
  );
}
