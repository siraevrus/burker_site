"use client";

import { Suspense } from "react";
import EmailVerificationForm from "@/components/Auth/EmailVerificationForm";

function VerifyEmailContent() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <EmailVerificationForm />
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 text-center">Загрузка...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
