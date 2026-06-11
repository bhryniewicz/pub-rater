import { getTranslations } from "next-intl/server";

export default async function UnderagePage() {
  const t = await getTranslations("underage");

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="text-6xl">🍺</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("description")}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("responsible")}{" "}
          <a
            href="https://www.drinkaware.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            drinkaware.co.uk
          </a>
        </p>
      </div>
    </main>
  );
}
