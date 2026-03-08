import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShootPlaner",
  description: "Plan your film shoots collaboratively",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#c87040",
          colorBackground: "#1a1a1a",
          colorText: "#e8e4df",
          colorTextSecondary: "#9a928a",
          colorInputBackground: "#151515",
          colorInputText: "#e8e4df",
          colorNeutral: "#e8e4df",
          borderRadius: "0.75rem",
          colorTextOnPrimaryBackground: "#ffffff",
        },
        elements: {
          card: "bg-[#1a1a1a] border border-[#252525] shadow-2xl",
          headerTitle: "text-[#e8e4df]",
          headerSubtitle: "text-[#9a928a]",
          socialButtonsBlockButton:
            "bg-[#151515] border border-[#252525] text-[#e8e4df] hover:bg-[#222222] hover:border-[#333333]",
          socialButtonsBlockButtonText: "text-[#e8e4df] font-medium",
          dividerLine: "bg-[#252525]",
          dividerText: "text-[#6b6560]",
          formFieldLabel: "text-[#9a928a]",
          formFieldInput:
            "bg-[#151515] border-[#252525] text-[#e8e4df] focus:border-[#c87040] focus:ring-[#c87040]/20",
          formButtonPrimary:
            "bg-[#c87040] hover:bg-[#d4845a] text-white font-medium",
          formFieldAction: "text-[#c87040] hover:text-[#d4845a]",
          footerActionLink: "text-[#c87040] hover:text-[#d4845a]",
          footerActionText: "text-[#6b6560]",
          identityPreviewEditButton: "text-[#c87040] hover:text-[#d4845a]",
          identityPreviewText: "text-[#e8e4df]",
          formFieldInputShowPasswordButton: "text-[#6b6560] hover:text-[#9a928a]",
          otpCodeFieldInput: "bg-[#151515] border-[#252525] text-[#e8e4df]",
          formResendCodeLink: "text-[#c87040] hover:text-[#d4845a]",
          alert: "bg-[#151515] border border-[#252525] text-[#e8e4df]",
          alertText: "text-[#e8e4df]",
          userButtonPopoverCard: "bg-[#1a1a1a] border border-[#252525]",
          userButtonPopoverActionButton: "text-[#e8e4df] hover:bg-[#222222]",
          userButtonPopoverActionButtonText: "text-[#e8e4df]",
          userButtonPopoverActionButtonIcon: "text-[#9a928a]",
          userButtonPopoverFooter: "hidden",
          internal: "text-[#e8e4df]",
        },
      }}
    >
      <html lang="en">
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
