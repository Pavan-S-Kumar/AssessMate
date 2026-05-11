"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface TestHistory {
  test_id: number;
  subject: string;
  chapter: string;
  date: string;
  score: number;
}

export default function TestHistory() {
  const [history, setHistory] = useState<TestHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      let parsedUser = { username: "Student", email: "student@example.com" };

      const userStr = localStorage.getItem("assessmate_user");
      if (userStr) {
        parsedUser = JSON.parse(userStr);
      }

      try {
        const response = await fetch(`http://127.0.0.1:8000/tests/performance/${parsedUser.email}`);
        if (response.ok) {
          const result = await response.json();
          // We only need tests with an actual ID.
          setHistory(result.filter((r: any) => r.test_id));
        }
      } catch (err) {
        console.error("Error fetching history", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden text-slate-900 p-8">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-100/60 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10 animate-fade-in">
        <header className="flex items-center gap-4 border-b border-slate-200/60 pb-6 animate-slide-up">
          <Link href="/dashboard" className="p-2 bg-white/50 backdrop-blur-md rounded-full shadow-sm text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-all duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              Test History
            </span>
          </h1>
        </header>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-3xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="text-slate-500 mb-6 text-lg">You haven't taken any tests yet.</p>
            <Link
              href="/test-builder"
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200"
            >
              Take a Test
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {history.map((item, idx) => {
              const score = Math.round(item.score);
              let scoreColor = "text-emerald-600";
              let scoreBg = "bg-emerald-100";
              if (score < 50) {
                scoreColor = "text-red-600";
                scoreBg = "bg-red-100";
              } else if (score < 80) {
                scoreColor = "text-amber-600";
                scoreBg = "bg-amber-100";
              }

              return (
                <Link
                  key={idx}
                  href={`/results/${item.test_id}`}
                  className="glass-card p-6 rounded-2xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-l-4"
                  style={{ borderLeftColor: score < 50 ? '#EF4444' : score < 80 ? '#F59E0B' : '#10B981' }}
                >
                  <div>
                    <h3 className="font-extrabold text-xl text-slate-800 group-hover:text-indigo-600 transition-colors duration-200">
                      {item.subject} <span className="text-slate-400 font-normal mx-2">|</span> {item.chapter}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-sm text-slate-500 font-medium">{item.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Score</div>
                      <div className={`text-3xl font-black ${scoreColor}`}>
                        {score}%
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scoreBg} ${scoreColor} group-hover:scale-110 transition-transform`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
