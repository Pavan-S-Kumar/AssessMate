"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React from "react";
import MarkdownRenderer from "../../../../components/MarkdownRenderer";

interface Submission {
  history_id: number;
  student_username: string;
  student_email: string;
  timestamp: string;
  total_score: number;
  results_data: any;
}

interface TestInfo {
  test_code: string;
  subject: string;
  chapter: string;
  test_data: any;
}

export default function TeacherTestResults({ params }: { params: Promise<{ code: string }> }) {
  const unwrappedParams = React.use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testInfo, setTestInfo] = useState<TestInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedSub, setExpandedSub] = useState<number | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const userStr = localStorage.getItem("assessmate_user");
        const email = userStr ? JSON.parse(userStr).email : "";
        if (!email) {
          router.push("/login");
          return;
        }

        const response = await fetch(`http://127.0.0.1:8000/tests/teacher/test/${unwrappedParams.code}/results?email=${email}`);
        if (!response.ok) throw new Error("Failed to load results");

        const data = await response.json();
        setTestInfo(data.test_info);
        setSubmissions(data.submissions);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [unwrappedParams.code, router]);

  const toggleExpand = (id: number) => {
    setExpandedSub(expandedSub === id ? null : id);
  };

  const calculateMaxScore = (questions: any[]) => {
    return questions.reduce((acc, q) => {
      if (q.type === 'long') return acc + 5;
      if (q.type === 'short') return acc + 2;
      return acc + 1;
    }, 0);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary font-bold">Loading Results...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;
  if (!testInfo) return null;

  const maxPossibleScore = calculateMaxScore(testInfo.test_data.questions || []);

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header Section */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link href="/dashboard" className="text-indigo-500 text-sm font-bold hover:underline mb-2 inline-flex items-center gap-1">
              &larr; Back to Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-800">{testInfo.subject}</h1>
            <p className="text-lg text-slate-600 mt-1">{testInfo.chapter}</p>
          </div>
          <div className="bg-indigo-50 px-6 py-4 rounded-2xl border border-indigo-100 text-center">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Test Code</p>
            <p className="text-4xl font-mono font-black text-indigo-700">{testInfo.test_code}</p>
          </div>
        </div>

        {/* Submissions Section */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Student Submissions ({submissions.length})
          </h2>

          {submissions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-500 text-lg">No students have taken this test yet.</p>
              <p className="text-slate-400 text-sm mt-2">Share the code <span className="font-mono font-bold text-indigo-500">{testInfo.test_code}</span> with your class.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => {
                const isExpanded = expandedSub === sub.history_id;
                const percentage = Math.round((sub.total_score / maxPossibleScore) * 100);
                let scoreColor = "text-amber-600";
                let scoreBg = "bg-amber-100";
                if (percentage >= 80) { scoreColor = "text-emerald-600"; scoreBg = "bg-emerald-100"; }
                else if (percentage >= 60) { scoreColor = "text-indigo-600"; scoreBg = "bg-indigo-100"; }

                return (
                  <div key={sub.history_id} className="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md">
                    {/* Submission Header (Clickable) */}
                    <div 
                      className={`p-5 flex justify-between items-center cursor-pointer select-none transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50'}`}
                      onClick={() => toggleExpand(sub.history_id)}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-lg text-slate-800">{sub.student_username}</span>
                        <span className="text-xs text-slate-500">{sub.student_email} &bull; {sub.timestamp.split(' ')[0]}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className={`px-4 py-1.5 rounded-full font-bold text-sm border ${scoreBg} ${scoreColor} border-white/50 shadow-sm`}>
                          {sub.total_score} / {maxPossibleScore} ({percentage}%)
                        </div>
                        <div className="text-slate-400">
                          <svg className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>

                    {/* Submission Details (Expanded) */}
                    {isExpanded && (
                      <div className="p-6 border-t border-slate-200 bg-slate-50/50 space-y-8">
                        {sub.results_data?.evaluations?.map((ev: any, i: number) => {
                          const question = testInfo.test_data.questions.find((q: any) => q.id === ev.question_id);
                          if (!question) return null;
                          
                          const qMaxScore = question.type === 'long' ? 5 : (question.type === 'short' ? 2 : 1);
                          const isCorrect = ev.score >= (qMaxScore / 2);

                          return (
                            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 pr-4 font-semibold text-slate-800">
                                  <span className="text-indigo-600 mr-2">Q{i + 1}.</span>
                                  <MarkdownRenderer content={question.content} />
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    Score: {ev.score} / {qMaxScore}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Student Answer</p>
                                  <div className="text-sm text-slate-800">
                                    {ev.user_answer ? <MarkdownRenderer content={ev.user_answer} /> : <span className="italic text-slate-400">No answer provided</span>}
                                  </div>
                                </div>
                                <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100/50">
                                  <p className="text-xs font-bold text-indigo-500 uppercase mb-2">Teacher Ideal Answer</p>
                                  <div className="text-sm text-indigo-900">
                                    <MarkdownRenderer content={question.ideal_answer} />
                                  </div>
                                </div>
                              </div>

                              {ev.feedback && (
                                <div className={`p-4 rounded-lg border ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                  <p className={`text-xs font-bold uppercase mb-1 ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>AI Evaluation Feedback</p>
                                  <div className={`text-sm ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                                    <MarkdownRenderer content={ev.feedback} />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Support Footer */}
        <footer className="mt-12 pb-6 text-center text-slate-500 text-sm animate-fade-in">
          <p>
            Found a bug or need help? Contact support at{" "}
            <a href="mailto:support@assessmate.com" className="text-indigo-600 font-medium hover:underline">
              support@assessmate.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
