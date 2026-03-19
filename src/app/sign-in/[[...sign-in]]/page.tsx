"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function SignInForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard";
  const { userId, getToken } = useAuth();

  // Handle native app OAuth callback — redirect back to iOS app with session token
  useEffect(() => {
    if (userId && redirectUrl?.startsWith("shootplanner://")) {
      getToken().then((token) => {
        if (token) {
          window.location.href = `${redirectUrl}?session_token=${token}`;
        }
      });
    }
  }, [userId, redirectUrl, getToken]);

  return <SignIn forceRedirectUrl={redirectUrl} />;
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">ShootPlaner</h1>
        <p className="text-text-muted text-sm mt-1">Plan your shoots collaboratively</p>
      </div>
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
