import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const APP_URL = "https://shootplaner.com";
const APP_NAME = "ShootPlaner";
const APP_DESCRIPTION =
  "The collaborative shoot planner for filmmakers. Organize locations day-by-day, build moodboards, manage shot lists, and share with your crew — all in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Film Shoot Planning App for Filmmakers`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "shoot planner",
    "film shoot planning",
    "film production app",
    "shot list app",
    "moodboard for filmmakers",
    "location scouting app",
    "filmmaking tools",
    "video production planner",
    "crew collaboration",
    "director tools",
    "cinematography planner",
    "pre-production software",
    "film itinerary",
    "shooting schedule",
    "film crew app",
  ],
  authors: [{ name: APP_NAME, url: APP_URL }],
  creator: APP_NAME,
  publisher: APP_NAME,
  category: "productivity",
  applicationName: APP_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — Film Shoot Planning App`,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ShootPlaner — Plan Your Film Shoots Beautifully",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@shootplaner",
    creator: "@shootplaner",
    title: `${APP_NAME} — Film Shoot Planning App`,
    description: APP_DESCRIPTION,
    images: [{ url: "/og-image.png", alt: "ShootPlaner" }],
  },
  alternates: {
    canonical: APP_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  other: {
    "msapplication-TileColor": "#c87040",
    "theme-color": "#1a1a1a",
  },
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
