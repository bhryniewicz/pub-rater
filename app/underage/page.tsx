export default function UnderagePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="text-6xl">🍺</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground">
            Sorry, you can&apos;t enter
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This site is for people aged 18 and over. You must be of legal
            drinking age in your country to access Pub Rater.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Enjoy alcohol responsibly.{" "}
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
