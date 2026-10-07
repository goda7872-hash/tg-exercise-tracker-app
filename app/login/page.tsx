"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginInner() {
  const error = useSearchParams().get("error");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-tg-orange to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-tg-black">TG</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">TG Exercise Tracker</h1>
          <p className="text-tg-text-secondary">Team Goda coaching platform</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-tg-danger/10 border border-tg-danger/30 rounded-lg">
            <p className="text-tg-danger text-sm font-medium">
              Sign-in failed. If you were invited, use the same Google account your coach invited.
            </p>
          </div>
        )}

        <div className="card p-8">
          <button onClick={() => signIn("google", { callbackUrl: "/" })} className="btn-primary w-full py-3">
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
