import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface HomePageProps {
  onNext: (userId: Id<"typingUsers">) => void;
}

export function HomePage({ onNext }: HomePageProps) {
  const [name, setName] = useState("");
  const [trainingNumber, setTrainingNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const loginUser = useMutation(api.users.loginUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !trainingNumber.trim()) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    setIsLoading(true);
    try {
      const userId = await loginUser({
        name: name.trim(),
        trainingNumber: trainingNumber.trim(),
      });
      
      toast.success("تم تسجيل الدخول بنجاح");
      onNext(userId);
    } catch (error) {
      toast.error("حدث خطأ أثناء تسجيل الدخول");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4">تسجيل الدخول</h1>
        <p className="text-lg text-secondary">أدخل اسمك ورقمك التدريبي للدخول</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            الاسم
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            placeholder="أدخل اسمك"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="trainingNumber" className="block text-sm font-medium text-gray-700 mb-2">
            الرقم التدريبي
          </label>
          <input
            type="text"
            id="trainingNumber"
            value={trainingNumber}
            onChange={(e) => setTrainingNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            placeholder="أدخل رقمك التدريبي"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !name.trim() || !trainingNumber.trim()}
          className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
