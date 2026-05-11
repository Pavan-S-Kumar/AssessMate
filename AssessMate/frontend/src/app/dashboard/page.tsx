"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceData {
  test_id: number;
  subject: string;
  chapter: string;
  test: string;
  date: string;
  score: number;
  critical_thinking: number;
  efficiency: number;
  acceptance_rate: number;
  difficulty: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ username: string, email: string } | null>(null);

  const handleSignOut = () => {
    localStorage.removeItem("assessmate_user");
    router.push("/");
  };

  useEffect(() => {
    const fetchData = async () => {
      let parsedUser = { username: "Student", email: "student@example.com" };

      const userStr = localStorage.getItem("assessmate_user");
      if (userStr) {
        parsedUser = JSON.parse(userStr);
      }

      setUser(parsedUser);

      try {
        const response = await fetch(`http://127.0.0.1:8000/tests/performance/${parsedUser.email}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (err) {
        console.error("Error fetching performance data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const avgMetric = (key: keyof PerformanceData) => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, curr) => acc + (curr[key] as number), 0);
    return Math.round(sum / data.length);
  };

  const avgScore = avgMetric("score");
  const avgCT = avgMetric("critical_thinking");
  const avgEff = avgMetric("efficiency");
  const avgAcc = avgMetric("acceptance_rate");

  const subjectPerformance = useMemo(() => {
    const subs: Record<string, { totalScore: number, count: number }> = {};
    data.forEach(d => {
      if (!subs[d.subject]) subs[d.subject] = { totalScore: 0, count: 0 };
      subs[d.subject].totalScore += d.score;
      subs[d.subject].count += 1;
    });
    return Object.entries(subs).map(([subject, stats]) => ({
      subject,
      avgScore: Math.round(stats.totalScore / stats.count),
      testsTaken: stats.count
    })).sort((a, b) => b.testsTaken - a.testsTaken);
  }, [data]);

  const getProgressStatus = () => {
    if (data.length === 0) return { label: "No Data", color: "bg-slate-100 text-slate-600 border-slate-200" };
    const recentAvg = data.slice(0, 3).reduce((acc, curr) => acc + curr.score, 0) / Math.min(data.length, 3);
    if (recentAvg >= 80) return { label: "Excellent Progress", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    if (recentAvg >= 60) return { label: "On Track", color: "bg-indigo-100 text-indigo-700 border-indigo-200" };
    return { label: "Needs Attention", color: "bg-amber-100 text-amber-700 border-amber-200" };
  };
  
  const getMetricStatus = (value: number) => {
    if (value >= 80) return { label: "Excellent", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    if (value >= 60) return { label: "On Track", color: "bg-indigo-100 text-indigo-700 border-indigo-200" };
    return { label: "Needs Attention", color: "bg-amber-100 text-amber-700 border-amber-200" };
  };

  const status = getProgressStatus();

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden text-slate-900 p-8">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-100/60 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-10 relative z-10 animate-fade-in">
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 animate-slide-up">
          <div className="flex items-center gap-5">
            <img src="/logo.png" alt="AssessMate Logo" className="w-16 h-16 rounded-xl shadow-lg shadow-indigo-500/10 hidden sm:block" />
            <div className="flex items-start gap-3">
              <span className="text-3xl lg:text-4xl shrink-0 mt-0.5">👋</span>
              <div className="flex flex-col items-start gap-0.5">
                <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
                  Welcome back,{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                    {user ? user.username : "Student"}!
                  </span>
                </h1>
                <p className="text-slate-500 text-sm font-medium">Here is your academic performance overview.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center justify-end gap-3 w-full lg:w-auto mt-2 lg:mt-0">
            <button
              onClick={handleSignOut}
              className="px-5 py-2.5 bg-white/50 backdrop-blur-md border border-red-200 text-red-600 rounded-xl font-semibold shadow-sm hover:bg-red-50 hover:border-red-300 transition-all duration-200 whitespace-nowrap"
            >
              Sign Out
            </button>
            <Link
              href="/dashboard/history"
              className="px-5 py-2.5 bg-white/50 backdrop-blur-md border border-indigo-200 text-indigo-700 rounded-xl font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 whitespace-nowrap"
            >
              Test History
            </Link>
            <Link
              href="/test-builder"
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
            >
              Start Practice
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">Loading performance data...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h4 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Tests Taken</h4>
                </div>
                <p className="text-3xl font-extrabold text-slate-800">{data.length}</p>
              </div>

              <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <h4 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Avg. Score</h4>
                </div>
                <div className="flex items-end justify-between mt-1">
                  <p className="text-3xl font-extrabold text-indigo-600">{avgScore}%</p>
                  {data.length > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold shadow-sm ${getMetricStatus(avgScore).color}`}>
                      {getMetricStatus(avgScore).label}
                    </span>
                  )}
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <h4 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Accuracy</h4>
                </div>
                <div className="flex items-end justify-between mt-1">
                  <p className="text-3xl font-extrabold text-violet-600">{avgCT}%</p>
                  {data.length > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold shadow-sm ${getMetricStatus(avgCT).color}`}>
                      {getMetricStatus(avgCT).label}
                    </span>
                  )}
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h4 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Efficiency</h4>
                </div>
                <div className="flex items-end justify-between mt-1">
                  <p className="text-3xl font-extrabold text-amber-500">{avgEff}%</p>
                  {data.length > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold shadow-sm ${getMetricStatus(avgEff).color}`}>
                      {getMetricStatus(avgEff).label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {/* Score & Difficulty Graph */}
              <section className="glass-card p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">Score & Difficulty</h3>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">Avg Score: {avgScore}%</span>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="test" stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Line name="Score" type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      <Line name="Test Difficulty" type="monotone" dataKey="difficulty" stroke="#EF4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Accuracy Graph */}
              <section className="glass-card p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">Accuracy</h3>
                  <span className="text-xs font-bold bg-violet-100 text-violet-700 px-3 py-1 rounded-full">Avg CT: {avgCT}%</span>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="test" stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Line name="Accuracy" type="monotone" dataKey="critical_thinking" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Efficiency Graph */}
              <section className="glass-card p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">Efficiency</h3>
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">Avg Eff: {avgEff}%</span>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="test" stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Line name="Efficiency" type="monotone" dataKey="efficiency" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Acceptance Graph */}
              <section className="glass-card p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">Acceptance</h3>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">Avg Acc: {avgAcc}%</span>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="test" stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Line name="Acceptance" type="monotone" dataKey="acceptance_rate" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Professional Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              
              {/* Subject Breakdown */}
              <section className="glass-card p-6 rounded-3xl lg:col-span-1 flex flex-col h-[400px]">
                <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                   <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                   Subject Proficiency
                </h3>
                <div className="flex-1 flex flex-col gap-5 overflow-y-auto custom-scrollbar pr-2">
                  {subjectPerformance.length > 0 ? subjectPerformance.map((sub, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold text-slate-700">{sub.subject || "General"}</span>
                        <span className="font-bold text-indigo-600">{sub.avgScore}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full ${sub.avgScore >= 80 ? 'bg-emerald-500' : sub.avgScore >= 60 ? 'bg-indigo-500' : 'bg-amber-500'}`} 
                          style={{ width: `${sub.avgScore}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{sub.testsTaken} test(s) taken</p>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500 text-center py-4">No subject data available.</p>
                  )}
                </div>
              </section>

              {/* Recent Tests Table */}
              <section className="glass-card p-6 rounded-3xl lg:col-span-2 flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Recent Assessments
                  </h3>
                  <Link href="/dashboard/history" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All &rarr;</Link>
                </div>
                <div className="overflow-auto custom-scrollbar flex-1 -mx-2 px-2">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-white/90 backdrop-blur-md z-10">Date</th>
                        <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-white/90 backdrop-blur-md z-10">Subject & Chapter</th>
                        <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-white/90 backdrop-blur-md z-10">Score</th>
                        <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-white/90 backdrop-blur-md z-10">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 5).map((test, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 text-sm text-slate-600 whitespace-nowrap">{test.date.split(' ')[0]}</td>
                          <td className="py-4">
                            <p className="text-sm font-semibold text-slate-800">{test.subject || "General"}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]" title={test.chapter}>{test.chapter || "Mixed"}</p>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              test.score >= 80 ? 'bg-emerald-100 text-emerald-700' : 
                              test.score >= 60 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {test.score}%
                            </span>
                          </td>
                          <td className="py-4">
                            <Link href={`/results/${test.test_id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline">
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {data.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-sm text-slate-500">No tests taken yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
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
          </>
        )}
      </div>
    </div>
  );
}
