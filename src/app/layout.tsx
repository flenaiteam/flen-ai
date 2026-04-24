import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ReduxProvider } from "@/lib/redux/provider";
import { StytchProvider } from "@/components/providers/stytch-provider";
import { AppProvider } from "@/contexts/app-context";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Flen AI — Google Business Profile Optimizer",
  description: "Google Business Profile optimizer for local businesses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {/*
            Provider order:
            1. ReduxProvider  — store must be available before any consumers
            2. StytchProvider — Stytch SDK context (needed by AppProvider's refresh hook)
            3. AppProvider    — hydrates Redux from localStorage, starts token refresh
          */}
          <ReduxProvider>
            <StytchProvider>
              <AppProvider>
                <TooltipProvider>
                  {children}
                  <Toaster />
                </TooltipProvider>
              </AppProvider>
            </StytchProvider>
          </ReduxProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
