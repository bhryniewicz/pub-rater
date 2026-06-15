import { Navbar } from "@/components/navbar/navbar";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar isSearchVisible={false} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
