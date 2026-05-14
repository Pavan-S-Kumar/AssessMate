"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import MarkdownRenderer from "../../../components/MarkdownRenderer";

export default function Results({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/tests/${unwrappedParams.id}`);
        if (!response.ok) throw new Error("Failed to fetch results");
        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [unwrappedParams.id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
      <div className="font-bold text-indigo-600 text-lg animate-pulse">Analyzing Results...</div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Test Not Found</h2>
      <p className="text-slate-500 max-w-md">We couldn't find the test record you're looking for. It might have been deleted or moved.</p>
      <Link href="/dashboard/history" className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Return to History</Link>
    </div>
  );

  if (!data.results_data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-500">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Evaluation Pending</h2>
      <p className="text-slate-500 max-w-md">This test hasn't been evaluated yet, or the evaluation process is still in progress. Please try again in a moment.</p>
      <Link href="/dashboard/history" className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Return to History</Link>
    </div>
  );

  const score = data.total_score || 0;
  
  // Calculate max possible score
  let maxScore = 0;
  const questions = data.assessment?.questions || [];
  questions.forEach((q: any) => {
    maxScore += q.max_score || (q.type === "mcq" ? 1 : (q.type === "long" ? 5 : 2));
  });

  const evaluations = data.results_data.evaluations || [];

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col items-center p-8">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-100/60 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full glass-card p-10 rounded-3xl mt-8 relative z-10 animate-fade-in">
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              Assessment Complete!
            </span>
          </h1>
          <p className="text-slate-500 text-lg font-medium">Here is your AI-evaluated concept feedback for <span className="text-indigo-600 font-bold">{data.subject}</span> - {data.chapter}.</p>
          
          <div className="mt-10 inline-flex items-center justify-center w-40 h-40 rounded-full border-[10px] border-indigo-100 bg-white shadow-xl shadow-indigo-200/50 relative">
            <div className="absolute inset-0 rounded-full border-[10px] border-indigo-500/20" />
            <div className="text-5xl font-black text-indigo-700">
              {score}<span className="text-2xl text-slate-400">/{maxScore}</span>
            </div>
          </div>
        </div>

        <div className="space-y-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-2xl font-extrabold text-slate-800 border-b-2 border-slate-200/60 pb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            Concept-Level Feedback
          </h3>
          
          {evaluations.map((evalItem: any, idx: number) => {
            const question = questions.find((q: any) => q.id === evalItem.question_id);
            if (!question) return null;
            
            let maxQScore = question.max_score || (question.type === "mcq" ? 1 : (question.type === "long" ? 5 : 2));
            
            const isFullMarks = evalItem.score >= (maxQScore * 0.8);
            const isZero = evalItem.score === 0;
            
            const bgColor = isFullMarks ? "bg-emerald-50/50" : (isZero ? "bg-red-50/50" : "bg-amber-50/50");
            const borderColor = isFullMarks ? "border-emerald-200" : (isZero ? "border-red-200" : "border-amber-200");
            const titleColor = isFullMarks ? "text-emerald-800" : (isZero ? "text-red-800" : "text-amber-800");
            const textColor = isFullMarks ? "text-emerald-600" : (isZero ? "text-red-600" : "text-amber-600");
            
            return (
              <div key={idx} className={`glass-card ${bgColor} border ${borderColor} p-6 rounded-2xl hover:shadow-lg transition-shadow duration-300`}>
                <div className={`font-bold ${titleColor} text-lg flex gap-2 items-start`}>
                  <span className="mt-0.5 bg-white/60 px-2 py-0.5 rounded text-sm shadow-sm border border-black/5">Q{idx + 1}</span>
                  <div className="flex-1">
                    <MarkdownRenderer content={`${question.content} <span class="text-xs font-normal text-slate-500 bg-slate-100/80 px-2 py-1 rounded ml-2">${question.type === "mcq" ? "MCQ" : "Subjective"}</span>`} />
                  </div>
                </div>
                
                <div className="mt-4 flex items-center gap-2 bg-white/60 w-fit px-3 py-1.5 rounded-lg border border-black/5 shadow-sm">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Score</span>
                  <span className={`font-black ${textColor} text-lg`}>{evalItem.score}/{maxQScore}</span>
                </div>
                
                {(evalItem.user_answer || (evalItem.image_data && evalItem.image_data.length > 0)) && (
                  <div className={`mt-6 p-4 bg-white/80 rounded-xl border ${borderColor} shadow-inner`}>
                    <strong className="text-slate-500 text-xs uppercase tracking-wider block mb-2 font-bold">Your Answer</strong>
                    {evalItem.user_answer && (
                      <div className="text-slate-800">
                        <MarkdownRenderer content={evalItem.user_answer} />
                      </div>
                    )}
                    {evalItem.image_data && evalItem.image_data.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {evalItem.image_data.map((img: string, i: number) => (
                          <img key={i} src={img} alt={`Attached answer ${i+1}`} className="max-w-full sm:max-w-xs h-auto rounded-lg border border-slate-200 shadow-sm hover:scale-105 transition-transform duration-200 cursor-zoom-in" />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {evalItem.feedback && (
                  <div className="mt-6 p-5 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-violet-500" />
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      <strong className="text-indigo-900 font-bold tracking-wide">AI Feedback</strong> 
                    </div>
                    <div className="text-slate-700 leading-relaxed text-sm pl-7">
                      <MarkdownRenderer content={evalItem.feedback} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200/60 flex flex-wrap gap-4 justify-center animate-slide-up no-print" style={{ animationDelay: '0.2s' }}>
          <Link href="/dashboard" className="px-8 py-3 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-700 rounded-xl font-bold shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200">
            Back to Dashboard
          </Link>
          <button 
            onClick={() => window.print()}
            className="px-8 py-3 bg-white/80 backdrop-blur-md border border-slate-200 text-indigo-600 rounded-xl font-bold shadow-sm hover:bg-indigo-50 hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF of Results
          </button>
          <Link href="/test-builder" className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200">
            Take Another Test
          </Link>
        </div>
      </div>
    </div>
  );
}
