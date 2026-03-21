"use client";

import { SignUp, useAuth, useSession } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function SignUpForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard";
  const { userId, getToken } = useAuth();
  const { session } = useSession();

  // Handle native app OAuth callback — redirect back to iOS app with session token + session ID
  useEffect(() => {
    if (userId && session?.id && redirectUrl?.startsWith("shootplanner://")) {
      getToken().then((token) => {
        if (token) {
          const params = new URLSearchParams({
            session_token: token,
            session_id: session.id,
            user_id: userId,
          });
          window.location.href = `${redirectUrl}?${params.toString()}`;
        }
      });
    }
  }, [userId, session, redirectUrl, getToken]);

  return <SignUp forceRedirectUrl={redirectUrl} />;
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">ShootPlaner</h1>
        <p className="text-text-muted text-sm mt-1">Plan your shoots collaboratively</p>
      </div>
      <Suspense>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
