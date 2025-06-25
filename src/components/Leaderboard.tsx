import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface LeaderboardProps {
  sessionId?: Id<"sessions">;
  userId?: Id<"typingUsers">;
  type: 'session' | 'global';
}

export function Leaderboard({ sessionId, userId, type }: LeaderboardProps) {
  const sessionLeaderboard = useQuery(
    api.leaderboard.getSessionLeaderboard,
    type === 'session' && sessionId ? { sessionId } : "skip"
  );
  
  const globalLeaderboard = useQuery(
    api.leaderboard.getGlobalLeaderboard,
    type === 'global' ? {} : "skip"
  );
  
  const leaderboard = type === 'session' ? sessionLeaderboard : globalLeaderboard;
  
  if (!leaderboard) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };
  
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-600 bg-yellow-50";
      case 2:
        return "text-gray-600 bg-gray-50";
      case 3:
        return "text-orange-600 bg-orange-50";
      default:
        return "text-gray-700 bg-white";
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <h2 className="text-xl font-bold text-center">
          {type === 'session' ? 'ترتيب الجلسة' : 'الترتيب العام'}
        </h2>
        <p className="text-center text-blue-100 mt-1">
          {type === 'session' ? 'ترتيب المشاركين في هذه الجلسة' : 'أفضل 50 لاعب على مستوى النظام'}
        </p>
      </div>
      
      {leaderboard.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <p>لا توجد نتائج بعد</p>
          <p className="text-sm mt-2">
            {type === 'session' ? 'ابدأ التحدي لرؤية الترتيب' : 'أكمل تحدياً لتظهر في الترتيب العام'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">الترتيب</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">اللاعب</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">النقاط</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">السرعة</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">الدقة</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">التعديلات</th>
                {type === 'session' && (
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">التقدم</th>
                )}
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaderboard.map((participant) => (
                <tr 
                  key={participant._id} 
                  className={`
                    ${participant.userId === userId ? "bg-blue-50 border-l-4 border-blue-500" : ""}
                    ${getRankColor(participant.rank)}
                    hover:bg-gray-50 transition-colors
                  `}
                >
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <span className={`
                        inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                        ${participant.rank <= 3 ? 'text-lg' : 'bg-gray-100 text-gray-700'}
                      `}>
                        {getRankIcon(participant.rank)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium text-gray-900">
                          {participant.user?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {participant.user?.trainingNumber}
                        </div>
                      </div>
                      {participant.userId === userId && (
                        <span className="mr-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          أنت
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-lg text-blue-600">
                      {participant.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-green-600">
                      {participant.wpm || 0}
                    </span>
                    <div className="text-xs text-gray-500">كلمة/دقيقة</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-purple-600">
                      {participant.accuracy || 100}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-orange-600">
                      {participant.editsUsed || 0}
                    </span>
                  </td>
                  {type === 'session' && (
                    <td className="px-4 py-3 text-center text-sm">
                      {participant.session?.challengeText ? 
                        `${participant.currentPosition}/${participant.session.challengeText.length}` : 
                        "0/0"
                      }
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    {participant.isFinished ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ مكتمل
                      </span>
                    ) : type === 'session' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⏳ يكتب
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        📊 أفضل نتيجة
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {type === 'global' && leaderboard.length > 0 && (
        <div className="bg-gray-50 px-4 py-3 text-center text-sm text-gray-600">
          يتم عرض أفضل 50 لاعب فقط
        </div>
      )}
    </div>
  );
}
