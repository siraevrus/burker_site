import LoginForm from "@/components/Auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Вход</h1>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
