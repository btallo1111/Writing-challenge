import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface SessionPageProps {
  userId: Id<"typingUsers">;
  onJoinSession: (sessionId: Id<"sessions">) => void;
}

export function SessionPage({ userId, onJoinSession }: SessionPageProps) {
  const [sessionCode, setSessionCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // إعدادات إنشاء الجلسة
  const [wordCount, setWordCount] = useState(50);
  const [allowEditing, setAllowEditing] = useState(true);
  const [maxEdits, setMaxEdits] = useState(3);
  
  const createSession = useMutation(api.sessions.createSession);
  const joinSession = useMutation(api.sessions.joinSession);

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const result = await createSession({ 
        creatorId: userId,
        wordCount,
        allowEditing,
        maxEdits: allowEditing ? maxEdits : 0,
      });
      toast.success(`تم إنشاء الجلسة بنجاح! الكود: ${result.code}`);
      onJoinSession(result.sessionId);
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء الجلسة");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionCode.trim() || sessionCode.length !== 7) {
      toast.error("يرجى إدخال كود صحيح مكون من 7 أرقام");
      return;
    }

    setIsJoining(true);
    try {
      const sessionId = await joinSession({
        code: sessionCode.trim(),
        userId,
      });
      
      toast.success("تم الانضمام للجلسة بنجاح");
      onJoinSession(sessionId);
    } catch (error) {
      toast.error("لم يتم العثور على الجلسة أو أنها غير نشطة");
      console.error(error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">اختر نوع الجلسة</h1>
        <p className="text-lg text-secondary">أنشئ جلسة جديدة أو انضم لجلسة موجودة</p>
      </div>

      <div className="space-y-6">
        {/* Create Session */}
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">إنشاء جلسة جديدة</h2>
          
          {!showCreateForm ? (
            <div>
              <p className="text-gray-600 mb-4">
                أنشئ جلسة جديدة وشارك الكود مع الآخرين للانضمام
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                إعداد الجلسة
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* عدد الكلمات */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عدد الكلمات في التحدي
                </label>
                <select
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value={25}>25 كلمة</option>
                  <option value={50}>50 كلمة</option>
                  <option value={75}>75 كلمة</option>
                  <option value={100}>100 كلمة</option>
                  <option value={150}>150 كلمة</option>
                  <option value={200}>200 كلمة</option>
                </select>
              </div>

              {/* السماح بالتعديل */}
              <div>
                <label className="flex items-center space-x-3 space-x-reverse">
                  <input
                    type="checkbox"
                    checked={allowEditing}
                    onChange={(e) => setAllowEditing(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    السماح للمشاركين بتعديل الأخطاء
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 mr-7">
                  إذا تم تفعيل هذا الخيار، يمكن للمشاركين مسح الأخطاء وإعادة الكتابة
                </p>
              </div>

              {/* عدد مرات التعديل */}
              {allowEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عدد مرات التعديل المسموحة لكل مشارك
                  </label>
                  <select
                    value={maxEdits}
                    onChange={(e) => setMaxEdits(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value={1}>مرة واحدة</option>
                    <option value={2}>مرتان</option>
                    <option value={3}>3 مرات</option>
                    <option value={5}>5 مرات</option>
                    <option value={10}>10 مرات</option>
                    <option value={-1}>غير محدود</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    عدد المرات التي يمكن للمشارك فيها استخدام مفتاح Backspace أو Delete
                  </p>
                </div>
              )}

              {/* معاينة الإعدادات */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">معاينة إعدادات الجلسة:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• عدد الكلمات: {wordCount} كلمة</li>
                  <li>• التعديل: {allowEditing ? `مسموح (${maxEdits === -1 ? 'غير محدود' : maxEdits + ' مرات'})` : 'غير مسموح'}</li>
                </ul>
              </div>

              <div className="flex space-x-3 space-x-reverse">
                <button
                  onClick={handleCreateSession}
                  disabled={isCreating}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? "جاري الإنشاء..." : "إنشاء الجلسة"}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Join Session */}
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">الانضمام لجلسة</h2>
          <p className="text-gray-600 mb-4">
            أدخل كود الجلسة المكون من 7 أرقام للانضمام
          </p>
          <form onSubmit={handleJoinSession} className="space-y-4">
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, '').slice(0, 7))}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-center text-lg font-mono"
              placeholder="1234567"
              maxLength={7}
              disabled={isJoining}
            />
            <button
              type="submit"
              disabled={isJoining || sessionCode.length !== 7}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? "جاري الانضمام..." : "انضمام للجلسة"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
