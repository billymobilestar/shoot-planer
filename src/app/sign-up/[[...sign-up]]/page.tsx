"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignUpForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard";

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
