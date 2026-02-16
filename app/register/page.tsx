import RegisterForm from "@/components/Auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Регистрация</h1>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
