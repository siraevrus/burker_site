"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Проверяем, было ли уже дано согласие
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Показываем баннер с небольшой задержкой для лучшего UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20, x: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 right-4 left-4 md:left-auto z-50 max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-4"
          style={{ backgroundColor: "#FCFAF8" }}
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-700">
              Мы используем cookie для улучшения работы, анализа трафика и
              персонализации контента. Продолжая использовать сайт, вы
              соглашаетесь на обработку данных в соответствии с нашей{" "}
              <Link
                href="/privacy"
                className="text-black underline hover:text-gray-600"
              >
                Политикой конфиденциальности
              </Link>{" "}
              и соглашаетесь на использование файлов cookie.
            </p>
            <button
              onClick={handleAccept}
              className="self-end bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Хорошо
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
