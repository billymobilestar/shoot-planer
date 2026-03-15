import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Free & Pro Plans",
  description:
    "ShootPlaner is free to start. Upgrade to Pro for unlimited projects, unlimited team members, and advanced collaboration features. From $14.99/month.",
  alternates: { canonical: "https://shootplaner.com/pricing" },
  openGraph: {
    title: "ShootPlaner Pricing — Free & Pro Plans",
    description:
      "Start free with 1 project. Upgrade to Pro for unlimited projects and team members. Built for filmmakers serious about their craft.",
    url: "https://shootplaner.com/pricing",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ShootPlaner" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
