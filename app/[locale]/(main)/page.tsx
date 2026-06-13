import { Suspense } from "react";
import HomeContent from "./home-content";

function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <HomeContent />
    </Suspense>
  );
}
