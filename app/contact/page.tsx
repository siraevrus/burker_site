import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";
import ContactForm from "./ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/contact", {
    title: "Форма обратной связи | Мира Брендс | Буркер",
    description: "Свяжитесь с нами — форма обратной связи Мира Брендс | Буркер",
  });
}

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Форма обратной связи</h1>
        <ContactForm />
      </div>
    </div>
  );
}
