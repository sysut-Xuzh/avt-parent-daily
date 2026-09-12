import { BabyProvider } from "@/components/baby-provider";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <BabyProvider>{children}</BabyProvider>;
}
