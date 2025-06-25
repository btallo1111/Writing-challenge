import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Leaderboard } from "./Leaderboard";

interface TypingChallengeProps {
  userId: Id<"typingUsers">;
  sessionId: Id<"sessions">;
  session: any;
}

export function TypingChallenge({ userId, sessionId, session }: TypingChallengeProps) {
  const [currentText, setCurrentText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [score, setScore] = useState(100);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [activeTab, setActiveTab] = useState<'challenge' | 'leaderboard' | 'global'>('challenge');
  const [editsUsed, setEditsUsed] = useState(0);
  const [lastInputLength, setLastInputLength] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const participants = useQuery(api.sessions.getSessionParticipants, { sessionId });
  const startChallenge = useMutation(api.sessions.startChallenge);
  const updateProgress = useMutation(api.sessions.updateParticipantProgress);
  const generateText = useQuery(api.sessions.generateChallengeText, 
    session?.wordCount ? { wordCount: session.wordCount } : "skip"
  );
  
  const isCreator = session?.creatorId === userId;
  const challengeStarted = session?.challengeStarted;
  const challengeText = session?.challengeText || "";

  // Check if user is a participant (not just creator observing)
  const userParticipant = participants?.find(p => p.userId === userId);
  const isParticipant = !!userParticipant;

  // إعدادات الجلسة
  const allowEditing = session?.allowEditing ?? true;
  const maxEdits = session?.maxEdits ?? 3;
  const canEdit = allowEditing && (maxEdits === -1 || editsUsed < maxEdits);

  // Timer effect
  useEffect(() => {
    if (challengeStarted && session?.startTime && !isFinished && isParticipant) {
      const interval = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - session.startTime!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [challengeStarted, session?.startTime, isFinished, isParticipant]);

  // Calculate WPM and accuracy
  useEffect(() => {
    if (userInput.length > 0 && currentTime > 0 && isParticipant) {
      const wordsTyped = userInput.trim().split(' ').length;
      const minutes = currentTime / 60;
      setWpm(Math.round(wordsTyped / minutes));
      
      let correctChars = 0;
      for (let i = 0; i < Math.min(userInput.length, challengeText.length); i++) {
        if (userInput[i] === challengeText[i]) {
          correctChars++;
        }
      }
      const accuracyPercent = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
      setAccuracy(accuracyPercent);
    }
  }, [userInput, currentTime, challengeText, isParticipant]);

  // Update score based on accuracy and edits
  useEffect(() => {
    if (challengeStarted && userInput.length > 0 && isParticipant) {
      let newScore = 100;
      let correctChars = 0;
      
      for (let i = 0; i < Math.min(userInput.length, challengeText.length); i++) {
        if (userInput[i] === challengeText[i]) {
          correctChars++;
        } else {
          newScore -= 2; // Deduct 2 points for each mistake
        }
      }
      
      // خصم نقاط للتعديلات المستخدمة
      newScore -= editsUsed * 5;
      
      // Bonus for speed (if typing fast and accurate)
      if (wpm > 30 && accuracy > 90) {
        newScore += Math.floor(wpm / 10);
      }
      
      setScore(Math.max(0, Math.min(200, newScore))); // Keep score between 0-200
    }
  }, [userInput, challengeText, challengeStarted, wpm, accuracy, editsUsed, isParticipant]);

  // Update progress in database
  useEffect(() => {
    if (challengeStarted && userInput.length > 0 && isParticipant) {
      const currentPosition = userInput.length;
      const finished = currentPosition >= challengeText.length;
      
      if (finished && !isFinished) {
        setIsFinished(true);
        toast.success("تهانينا! لقد أنهيت التحدي!");
        setActiveTab('leaderboard');
      }
      
      updateProgress({
        sessionId,
        userId,
        score,
        currentPosition,
        isFinished: finished,
        wpm,
        accuracy,
        editsUsed,
      });
    }
  }, [userInput, score, wpm, accuracy, challengeText.length, challengeStarted, isFinished, editsUsed, isParticipant]);

  const handleStartChallenge = async () => {
    if (!generateText) {
      toast.error("جاري تحضير النص...");
      return;
    }
    
    setCurrentText(generateText);
    
    try {
      await startChallenge({
        sessionId,
        challengeText: generateText,
      });
      setStartTime(Date.now());
      toast.success("بدأ التحدي!");
    } catch (error) {
      toast.error("حدث خطأ أثناء بدء التحدي");
      console.error(error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!challengeStarted || isFinished || !isParticipant) return;
    
    const value = e.target.value;
    
    // تتبع التعديلات (حذف النص)
    if (value.length < lastInputLength) {
      if (!canEdit) {
        toast.error(`لا يمكنك التعديل! ${allowEditing ? `استخدمت جميع المحاولات (${maxEdits})` : 'التعديل غير مسموح في هذه الجلسة'}`);
        return;
      }
      setEditsUsed(prev => prev + 1);
      if (editsUsed + 1 >= maxEdits && maxEdits !== -1) {
        toast.warning(`تبقى لك ${maxEdits - editsUsed - 1} محاولات تعديل`);
      }
    }
    
    setLastInputLength(value.length);
    setUserInput(value);
    
    if (!startTime) {
      setStartTime(Date.now());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // منع التعديل إذا لم يكن مسموحاً
    if ((e.key === 'Backspace' || e.key === 'Delete') && !canEdit) {
      e.preventDefault();
      toast.error(`لا يمكنك التعديل! ${allowEditing ? `استخدمت جميع المحاولات (${maxEdits})` : 'التعديل غير مسموح في هذه الجلسة'}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderText = () => {
    if (!challengeText) return null;
    
    return (
      <div className="text-lg leading-relaxed font-mono bg-gray-50 p-4 rounded-lg border-2 border-gray-200 mb-4">
        {challengeText.split('').map((char: string, index: number) => {
          let className = "relative";
          
          if (isParticipant && index < userInput.length) {
            if (userInput[index] === char) {
              className += " bg-green-200 text-green-800";
            } else {
              className += " bg-red-200 text-red-800";
            }
          } else if (isParticipant && index === userInput.length) {
            className += " bg-blue-200 animate-pulse";
          }
          
          return (
            <span key={index} className={className}>
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">تحدي الكتابة</h1>
        <p className="text-lg text-secondary">كود الجلسة: {session?.code}</p>
        
        {/* عرض إعدادات الجلسة */}
        <div className="mt-4 flex justify-center">
          <div className="bg-white rounded-lg shadow-sm border p-3 text-sm">
            <div className="flex items-center gap-4 text-gray-600">
              <span>📝 {session?.wordCount || 50} كلمة</span>
              <span>
                {allowEditing ? (
                  <>✏️ التعديل مسموح ({maxEdits === -1 ? 'غير محدود' : maxEdits + ' مرات'})</>
                ) : (
                  <>🚫 التعديل غير مسموح</>
                )}
              </span>
            </div>
          </div>
        </div>
        
        {isCreator && (
          <p className="text-sm text-orange-600 mt-2">
            🎯 أنت منشئ الجلسة - يمكنك مراقبة النتائج فقط
          </p>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-1 flex">
          <button
            onClick={() => setActiveTab('challenge')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'challenge'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {isCreator ? 'مراقبة التحدي' : 'التحدي'}
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ترتيب الجلسة
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'global'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            الترتيب العام
          </button>
        </div>
      </div>

      {/* Challenge Tab */}
      {activeTab === 'challenge' && (
        <div>
          {/* Stats Dashboard - Only show for participants */}
          {isParticipant && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                <div className="text-2xl font-bold text-blue-600">{score}</div>
                <div className="text-sm text-gray-600">النقاط</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                <div className="text-2xl font-bold text-green-600">{wpm}</div>
                <div className="text-sm text-gray-600">كلمة/دقيقة</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
                <div className="text-sm text-gray-600">الدقة</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                <div className="text-2xl font-bold text-orange-600">{formatTime(currentTime)}</div>
                <div className="text-sm text-gray-600">الوقت</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                <div className={`text-2xl font-bold ${canEdit ? 'text-green-600' : 'text-red-600'}`}>
                  {maxEdits === -1 ? '∞' : maxEdits - editsUsed}
                </div>
                <div className="text-sm text-gray-600">تعديلات متبقية</div>
              </div>
            </div>
          )}

          {/* Creator Controls */}
          {isCreator && !challengeStarted && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">أنت منشئ الجلسة</h3>
              <p className="text-yellow-700 mb-4">اضغط على "ابدأ التحدي" لبدء التحدي لجميع المشاركين</p>
              <button
                onClick={handleStartChallenge}
                disabled={!generateText}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {generateText ? "ابدأ التحدي" : "جاري تحضير النص..."}
              </button>
            </div>
          )}

          {/* Creator observation mode */}
          {isCreator && challengeStarted && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">🎯 وضع المراقبة</h3>
              <p className="text-blue-700">أنت في وضع المراقبة - يمكنك مشاهدة تقدم المشاركين أدناه</p>
            </div>
          )}

          {/* Waiting for challenge to start */}
          {!challengeStarted && !isCreator && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-blue-700">في انتظار بدء التحدي من منشئ الجلسة...</p>
            </div>
          )}

          {/* Typing Challenge - Only for participants */}
          {challengeStarted && isParticipant && (
            <div className="space-y-4">
              {renderText()}
              
              <textarea
                ref={inputRef}
                value={userInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="w-full h-32 p-4 text-lg font-mono border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 outline-none resize-none"
                placeholder="ابدأ الكتابة هنا..."
                disabled={isFinished}
                autoFocus
              />
              
              {/* تحذير التعديل */}
              {allowEditing && maxEdits !== -1 && (
                <div className={`text-sm p-2 rounded ${
                  canEdit ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {canEdit ? 
                    `يمكنك التعديل ${maxEdits - editsUsed} مرات أخرى` : 
                    'لا يمكنك التعديل - استخدمت جميع المحاولات'
                  }
                </div>
              )}
              
              {isFinished && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">تهانينا! لقد أنهيت التحدي!</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="font-semibold">النقاط النهائية:</span> {score}
                    </div>
                    <div>
                      <span className="font-semibold">السرعة:</span> {wpm} كلمة/دقيقة
                    </div>
                    <div>
                      <span className="font-semibold">الدقة:</span> {accuracy}%
                    </div>
                    <div>
                      <span className="font-semibold">التعديلات:</span> {editsUsed}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    عرض الترتيب
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Challenge text display for creator */}
          {challengeStarted && isCreator && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">نص التحدي:</h3>
              {renderText()}
            </div>
          )}

          {/* Participants Overview */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">المشاركون ({participants?.length || 0})</h3>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الاسم</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">النقاط</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">التقدم</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">السرعة</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">الدقة</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">التعديلات</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {participants?.map((participant) => (
                      <tr key={participant._id} className={participant.userId === userId ? "bg-blue-50" : ""}>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center">
                            <span className="font-medium">{participant.user?.name}</span>
                            {participant.userId === userId && (
                              <span className="mr-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">أنت</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-mono">{participant.score}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          {challengeText ? `${participant.currentPosition}/${challengeText.length}` : "0/0"}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">{participant.wpm || 0}</td>
                        <td className="px-4 py-3 text-sm text-center">{participant.accuracy || 100}%</td>
                        <td className="px-4 py-3 text-sm text-center">{participant.editsUsed || 0}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          {participant.isFinished ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">مكتمل</span>
                          ) : challengeStarted ? (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">يكتب</span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">في الانتظار</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <Leaderboard sessionId={sessionId} userId={userId} type="session" />
      )}

      {/* Global Leaderboard Tab */}
      {activeTab === 'global' && (
        <Leaderboard userId={userId} type="global" />
      )}
    </div>
  );
}
