import { useState } from "react";
import { Toaster } from "sonner";
import { HomePage } from "./components/HomePage";
import { SessionPage } from "./components/SessionPage";
import { TypingChallenge } from "./components/TypingChallenge";
import { Id } from "../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'session' | 'typing'>('home');
  const [userId, setUserId] = useState<Id<"typingUsers"> | null>(null);
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">تحدي الكتابة</h2>
        <div className="flex items-center gap-4">
          {currentPage !== 'home' && (
            <button
              onClick={() => {
                setCurrentPage('home');
                setUserId(null);
                setSessionId(null);
              }}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              العودة للرئيسية
            </button>
          )}
          {userId && (
            <button
              onClick={() => {
                setCurrentPage('home');
                setUserId(null);
                setSessionId(null);
              }}
              className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              تسجيل الخروج
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl mx-auto">
          <Content 
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            userId={userId}
            setUserId={setUserId}
            sessionId={sessionId}
            setSessionId={setSessionId}
          />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content({ 
  currentPage, 
  setCurrentPage, 
  userId, 
  setUserId, 
  sessionId, 
  setSessionId 
}: {
  currentPage: 'home' | 'session' | 'typing';
  setCurrentPage: (page: 'home' | 'session' | 'typing') => void;
  userId: Id<"typingUsers"> | null;
  setUserId: (id: Id<"typingUsers"> | null) => void;
  sessionId: Id<"sessions"> | null;
  setSessionId: (id: Id<"sessions"> | null) => void;
}) {
  const session = useQuery(api.sessions.getSession, sessionId ? { sessionId } : "skip");



  return (
    <div className="flex flex-col gap-section">
      {!userId && currentPage === 'home' && (
        <HomePage 
          onNext={(id) => {
            setUserId(id);
            setCurrentPage('session');
          }}
        />
      )}
      
      {userId && (
        <>

        
        {currentPage === 'session' && userId && (
          <SessionPage 
            userId={userId}
            onJoinSession={(id) => {
              setSessionId(id);
              setCurrentPage('typing');
            }}
          />
        )}
        
        {currentPage === 'typing' && userId && sessionId && session && (
          <TypingChallenge 
            userId={userId}
            sessionId={sessionId}
            session={session}
          />
        )}
        </>
      )}
    </div>
  );
}
