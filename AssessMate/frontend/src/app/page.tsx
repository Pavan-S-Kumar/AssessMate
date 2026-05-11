"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [showTerms, setShowTerms] = useState(true);
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/50 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-200/50 blur-[120px] pointer-events-none" />

      <main className="max-w-5xl space-y-10 z-10 animate-fade-in flex-1 flex flex-col justify-center py-10 mt-10">
        <div className="space-y-6 animate-slide-up">
          <h1 className="text-7xl font-extrabold tracking-tight flex items-center justify-center gap-5">
            <img src="/logo.png" alt="AssessMate Logo" className="w-20 h-20 rounded-2xl shadow-xl shadow-indigo-500/20" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-500">
              AssessMate
            </span>
          </h1>
          <p className="text-2xl text-slate-600 max-w-2xl mx-auto font-light">
            The AI-powered assessment generator and evaluator designed for <span className="font-semibold text-indigo-500">academic excellence</span>.
          </p>
        </div>

        <div className="flex justify-center mt-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Link
            href="/login"
            className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 text-left animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass-card p-8 rounded-2xl hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group cursor-default">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-3">Dynamic Content</h3>
            <p className="text-slate-500 leading-relaxed">Automatically loaded syllabus material dynamically generating endless fresh and relevant questions.</p>
          </div>

          <div className="glass-card p-8 rounded-2xl hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group cursor-default">
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-3">Custom Mode</h3>
            <p className="text-slate-500 leading-relaxed">Tailor your tests. Choose exact numbers of MCQs and subjective questions across multiple difficulty levels.</p>
          </div>

          <div className="relative group">
            {/* The peeking logo from behind */}
            <div className="absolute top-1/2 -right-16 -translate-y-1/2 w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl -z-10 transition-all duration-500 ease-out opacity-0 -translate-x-8 group-hover:translate-x-0 group-hover:opacity-100">
              <img src="/mate_logo.png" alt="Mate AI" className="w-full h-full object-cover" />
            </div>

            <div className="glass-card p-8 rounded-2xl group-hover:-translate-y-2 group-hover:shadow-2xl transition-all duration-300 cursor-default relative z-10 bg-white/90 backdrop-blur-xl h-full border border-white/60">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-3">AI Teaching Assistant</h3>
              <p className="text-slate-500 leading-relaxed">Get context-aware explanations on your mistakes and detailed, concept-level evaluation feedback.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-slate-500 text-sm z-10 mt-auto">
        <button 
          onClick={() => setShowTerms(true)}
          className="hover:text-indigo-600 transition-colors underline decoration-slate-300 hover:decoration-indigo-600 underline-offset-4"
        >
          Terms and Conditions
        </button>
      </footer>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Terms and Conditions</h2>
              <button onClick={() => setShowTerms(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto text-sm text-slate-600 space-y-4 custom-scrollbar text-left">
              <p><strong>1. Use of the Platform:</strong> For lawful educational purposes only. Users must provide accurate info and keep credentials safe.</p>
              <p><strong>2. User Accounts:</strong> Do not share accounts, impersonate others, or create multiple accounts for misuse.</p>
              <p><strong>3. Content and Resources:</strong> Generated content is strictly for learning. Do not commercially exploit it. Accuracy is not guaranteed.</p>
              <p><strong>4. AI-Based Evaluation:</strong> Scores are indicative and do not replace formal grading. Minor inaccuracies may occur.</p>
              <p><strong>5. User Conduct:</strong> No cheating, reverse-engineering, or uploading harmful content.</p>
              <p><strong>6. Data and Privacy:</strong> We collect performance data to improve user experience, not for selling to third parties.</p>
              <p><strong>7. Limitation of Liability:</strong> Provided 'as-is'. We are not liable for academic outcomes or technical issues.</p>
              <p><strong>8. Intellectual Property:</strong> All platform designs and algorithms belong to AssessMate.</p>
              <p className="pt-4 border-t border-slate-100 text-center font-medium italic">By using AssessMate, you agree to these Terms.</p>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
              <button 
                onClick={() => setShowTerms(false)}
                className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors shadow-sm"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
