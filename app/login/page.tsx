"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LoginForm from "@/components/Auth/LoginForm";
import RegisterForm from "@/components/Auth/RegisterForm";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") || "login";
  const [activeTab, setActiveTab] = useState<"login" | "register">(
    initialTab === "register" ? "register" : "login"
  );

  // Обновляем URL при изменении таба (только если таб изменился пользователем)
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    const shouldBeRegister = activeTab === "register";
    const isCurrentlyRegister = currentTab === "register";
    
    // Обновляем URL только если он не соответствует текущему табу
    if (shouldBeRegister !== isCurrentlyRegister) {
      const newUrl = shouldBeRegister ? "/login?tab=register" : "/login";
      router.replace(newUrl, { scroll: false });
    }
  }, [activeTab, router, searchParams]);

  const handleTabChange = (tab: "login" | "register") => {
    setActiveTab(tab);
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          {activeTab === "login" ? "Вход" : "Регистрация"}
        </h1>
        
        {/* Табы */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => handleTabChange("login")}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === "login"
                ? "text-black border-b-2 border-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Войти
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("register")}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === "register"
                ? "text-black border-b-2 border-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Регистрация
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {activeTab === "login" ? (
            <LoginForm onSwitchToRegister={() => handleTabChange("register")} />
          ) : (
            <RegisterForm onSwitchToLogin={() => handleTabChange("login")} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center">Загрузка...</div>
            </div>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
