export const metadata = {
  title: "Форма обратной связи | Mira Brands | Burker",
  description: "Свяжитесь с нами — форма обратной связи Mira Brands | Burker",
};

import ContactForm from "./ContactForm";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center">Форма обратной связи</h1>
        <p className="text-gray-600 text-center mb-8">
          Оставьте сообщение, и мы свяжемся с вами
        </p>
        <ContactForm />
      </div>
    </div>
  );
}
