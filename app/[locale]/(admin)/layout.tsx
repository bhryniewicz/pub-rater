import { Navbar } from "@/components/navbar/navbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar isSearchVisible={false} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
