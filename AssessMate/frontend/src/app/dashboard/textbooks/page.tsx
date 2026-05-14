"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Textbook {
  id: string;
  name: string;
  url: string;
  subject: string;
}

export default function TextbooksPage() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const userStr = localStorage.getItem("assessmate_user");
    if (!userStr) return;
    const parsedUser = JSON.parse(userStr);
    setUser(parsedUser);

    const fetchTextbooks = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/textbooks/${parsedUser.email}`);
        if (response.ok) {
          const data = await response.json();
          setTextbooks(data);
        }
      } catch (err) {
        console.error("Error fetching textbooks", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTextbooks();
  }, []);

  const subjects = ["All", ...Array.from(new Set(textbooks.map(t => t.subject)))];

  const filteredTextbooks = filter === "All" 
    ? textbooks 
    : textbooks.filter(t => t.subject === filter);

  const getSubjectIcon = (subject: string) => {
    switch (subject) {
      case "Mathematics": return "📐";
      case "Physics": return "⚛️";
      case "Chemistry": return "🧪";
      case "Biology": return "🧬";
      case "Science": return "🔬";
      case "Computer Science": return "💻";
      case "Accountancy": return "💰";
      case "Business Studies": return "💼";
      case "Economics": return "📈";
      case "English": return "📝";
      case "Hindi": return "📙";
      case "Social Science": return "🌍";
      default: return "📚";
    }
  };

  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case "Mathematics": return "from-blue-500 to-indigo-600";
      case "Physics": return "from-purple-500 to-violet-600";
      case "Chemistry": return "from-emerald-500 to-teal-600";
      case "Biology": return "from-rose-500 to-pink-600";
      case "Science": return "from-sky-500 to-blue-600";
      case "Computer Science": return "from-slate-700 to-slate-900";
      case "Accountancy": return "from-amber-500 to-orange-600";
      case "Business Studies": return "from-cyan-500 to-blue-600";
      case "Economics": return "from-indigo-500 to-violet-600";
      case "English": return "from-pink-500 to-rose-600";
      case "Hindi": return "from-orange-500 to-amber-600";
      case "Social Science": return "from-emerald-600 to-teal-700";
      default: return "from-slate-400 to-slate-600";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden text-slate-900 p-8">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-100/60 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-fade-in">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 border-b border-slate-200/60 pb-6 animate-slide-up">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 bg-white/50 backdrop-blur-md rounded-full shadow-sm text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-all duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                  Digital Library
                </span>
              </h1>
              <p className="text-slate-500 font-medium">Access your curriculum textbooks anytime, anywhere.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => setFilter(sub)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  filter === sub 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105" 
                  : "bg-white/50 text-slate-600 hover:bg-white border border-slate-200"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-white rounded-3xl p-6 h-64 animate-pulse border border-slate-100 shadow-sm" />
            ))}
          </div>
        ) : filteredTextbooks.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-3xl border border-slate-100 shadow-sm animate-slide-up">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">📚</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No Textbooks Found</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-4">
              We couldn't find any textbooks for your current profile ({user?.board || 'No Board'}, {(user?.class_level || user?.class) === '10' || (user?.class_level || user?.class) === 'X' ? 'Class X' : 'Class XII'}, {user?.stream || 'No Stream'}).
            </p>
            <p className="text-sm text-indigo-500 font-semibold bg-indigo-50 py-2 px-4 rounded-xl inline-block">
              💡 Tip: Try signing out and signing back in to refresh your profile settings!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up">
            {filteredTextbooks.map((book, idx) => (
              <a
                key={book.id}
                href={book.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-3xl p-1 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 border border-slate-100"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className={`h-40 rounded-2xl bg-gradient-to-br ${getSubjectColor(book.subject)} flex items-center justify-center text-6xl shadow-inner relative overflow-hidden`}>
                  <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                  <span className="relative z-10 group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">{getSubjectIcon(book.subject)}</span>
                </div>
                <div className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md uppercase tracking-wider">
                      {book.subject}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors duration-200">
                    {book.name}
                  </h3>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400 font-medium">PDF Document</span>
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <footer className="mt-12 pb-6 text-center text-slate-500 text-sm animate-fade-in">
          <p>
            Looking for something else? Contact support at{" "}
            <a href="mailto:support@assessmate.com" className="text-indigo-600 font-medium hover:underline">
              support@assessmate.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
