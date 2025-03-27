import { Providers } from "../providers";
import { ReactNode } from "react";

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
} 