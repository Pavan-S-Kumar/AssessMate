"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart } from "recharts";

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-200">
        <p className="font-extrabold text-slate-800 mb-2">{data.top_student || label}</p>
        <p className="text-sm font-medium text-slate-500 mb-1">
          <span className="text-rose-400 font-bold">Difficulty Rating:</span> {data.difficulty}
        </p>
        <p className="text-sm font-medium text-slate-500">
          <span className="text-indigo-500 font-bold">Highest Score:</span> {data.highest_score}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ username: string, email: string, role?: string } | null>(null);
  const [teacherTests, setTeacherTests] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [analyticsData, setAnalyticsData] = useState<{ test_stats: any[], leaderboards: any[] }>({ test_stats: [], leaderboards: [] });
  const [expandedLeaderboards, setExpandedLeaderboards] = useState<Record<string, boolean>>({});

  const handleSignOut = () => {
    localStorage.removeItem("assessmate_user");
    router.push("/");
  };

  useEffect(() => {
    const fetchData = async () => {
      let parsedUser = { username: "Student", email: "student@example.com", role: "student" };

      const userStr = localStorage.getItem("assessmate_user");
      if (userStr) {
        parsedUser = JSON.parse(userStr);
      }

      setUser(parsedUser);

      try {
        if (parsedUser.role === 'teacher') {
          const response = await fetch(`http://127.0.0.1:8000/tests/teacher/tests/${parsedUser.email}`);
          if (response.ok) {
            const result = await response.json();
            setTeacherTests(result);

            // Fetch analytics
            const analyticsResponse = await fetch(`http://127.0.0.1:8000/tests/teacher/analytics/${parsedUser.email}`);
            if (analyticsResponse.ok) {
              const analyticsResult = await analyticsResponse.json();
              setAnalyticsData(analyticsResult);
            }
          }
        } else {
          const response = await fetch(`http://127.0.0.1:8000/tests/performance/${parsedUser.email}`);
          if (response.ok) {
            const result = await response.json();
            setData(result);
          }
        }
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  const handleToggleActive = async (testCode: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/tests/teacher/test/${testCode}/toggle-active?email=${user?.email}`, {
        method: 'PATCH'
      });
      if (response.ok) {
        const data = await response.json();
        setTeacherTests(prev => prev.map(t => 
          t.test_code === testCode ? { ...t, is_active: data.is_active, due_date: data.due_date } : t
        ));
      }
    } catch (err) {
      console.error("Error toggling test status", err);
    }
  };

  const handleDeleteTest = async (testCode: string) => {
    if (!confirm("Are you sure you want to disable this test? It will be removed from your dashboard, but student results will be preserved.")) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/tests/teacher/test/${testCode}?email=${user?.email}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setTeacherTests(prev => prev.filter(t => t.test_code !== testCode));
        // Refresh analytics as well
        const analyticsResponse = await fetch(`http://127.0.0.1:8000/tests/teacher/analytics/${user?.email}`);
        if (analyticsResponse.ok) {
          const analyticsResult = await analyticsResponse.json();
          setAnalyticsData(analyticsResult);
        }
      }
    } catch (err) {
      console.error("Error deleting test", err);
    }
  };

  const handleJoinTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    if (!joinCode.trim()) return;

    try {
      const email = user?.email || "student@example.com";
      const response = await fetch(`http://127.0.0.1:8000/tests/join?email=${email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_code: joinCode.trim() })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to join test");
      
      router.push(`/test/${data.test_id}`);
    } catch (err: any) {
      setJoinError(err.message);
    }
  };

  const avgMetric = (key: keyof PerformanceData) => {
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, curr) => {
      const val = curr && curr[key] !== undefined ? (curr[key] as number) : 0;
      return acc + (val || 0);
    }, 0);
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
    if (!data || data.length === 0) return { label: "No Data", color: "bg-slate-100 text-slate-600 border-slate-200" };
    const recentData = data.slice(0, 3);
    const recentAvg = recentData.reduce((acc, curr) => acc + (curr.score || 0), 0) / Math.max(recentData.length, 1);
    if (isNaN(recentAvg)) return { label: "No Data", color: "bg-slate-100 text-slate-600 border-slate-200" };
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
              href="/dashboard/textbooks"
              className="px-5 py-2.5 bg-white/50 backdrop-blur-md border border-indigo-200 text-indigo-700 rounded-xl font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 whitespace-nowrap"
            >
              View Textbooks
            </Link>
            <Link
              href="/dashboard/history"
              className="px-5 py-2.5 bg-white/50 backdrop-blur-md border border-indigo-200 text-indigo-700 rounded-xl font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 whitespace-nowrap"
            >
              Test History
            </Link>
            <Link
              href={user?.role === 'teacher' ? "/test-builder?teacher=true" : "/test-builder"}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
            >
              {user?.role === 'teacher' ? "Create Test" : "Start Practice"}
            </Link>
          </div>
        </header>

        {user?.role === 'student' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 animate-slide-up flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Join a Class Test</h3>
              <p className="text-slate-500 text-sm">Enter the test code provided by your teacher.</p>
            </div>
            <form onSubmit={handleJoinTest} className="flex w-full sm:w-auto gap-2">
              <input 
                type="text" 
                placeholder="Enter Code (e.g. A1B2C3)" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                maxLength={6}
              />
              <button type="submit" disabled={!joinCode.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                Join
              </button>
            </form>
            {joinError && <p className="text-red-500 text-sm absolute mt-16">{joinError}</p>}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">Loading data...</div>
        ) : user?.role === 'teacher' ? (
          <div className="grid grid-cols-1 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="glass-card p-8 rounded-3xl">
              <h3 className="font-bold text-2xl text-slate-800 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                My Created Tests
              </h3>
              
              {!teacherTests || teacherTests.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500">You haven't created any tests yet.</p>
                  <Link href="/test-builder?teacher=true" className="text-indigo-600 font-bold hover:underline mt-2 inline-block">Create your first test</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teacherTests.map(test => (
                    <div key={test.id} className="relative group">
                      <Link href={`/teacher/test/${test.test_code}`} className={`bg-white border ${test.is_active ? 'border-slate-200' : 'border-amber-200 bg-amber-50/30'} rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all block h-full`}>
                        <div className="flex justify-between items-start mb-4 gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-bold text-indigo-500 uppercase">{test.subject}</p>
                              {!test.is_active ? (
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase">Inactive</span>
                              ) : (test.due_date && new Date(test.due_date) < new Date()) ? (
                                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-200 uppercase">Expired</span>
                              ) : null}
                            </div>
                            <h4 className="font-bold text-slate-800 text-lg line-clamp-2" title={test.chapter}>{test.chapter}</h4>
                          </div>
                          <span className={`font-mono font-bold px-3 py-1 rounded-lg text-lg border shrink-0 ${test.is_active ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {test.test_code}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest ${test.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                            {test.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest ${test.allow_reattempts ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                            {test.allow_reattempts ? 'Unlimited Attempts' : 'Single Attempt'}
                          </span>
                        </div>

                        <p className="text-slate-500 text-sm mb-4">{test.question_count} Questions</p>
                        <div className="flex flex-col gap-1 mt-auto">
                          <p className="text-xs text-slate-400">
                            Created: {test?.created_at ? new Date(test.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                          </p>
                          {test.due_date && (
                            <p className={`text-[10px] font-bold ${test.due_date && new Date(test.due_date) < new Date() ? 'text-rose-500' : 'text-slate-400'}`}>
                              {test.due_date && new Date(test.due_date) < new Date() ? 'EXPIRED' : `DUE: ${new Date(test.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`}
                            </p>
                          )}
                        </div>
                      </Link>
                      
                      {/* Options Button */}
                      <div className="absolute bottom-6 right-6 flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleActive(test.test_code);
                          }}
                          title={test.is_active ? "Invalidate Test" : "Re-activate Test"}
                          className={`p-2 rounded-lg border transition-colors ${test.is_active ? 'bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50' : 'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200'}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {test.is_active ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                          </svg>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteTest(test.test_code);
                          }}
                          title="Disable & Remove"
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teacher Analytics Section */}
            {analyticsData?.test_stats && analyticsData.test_stats.length > 0 && (
              <div className="glass-card p-8 rounded-3xl mt-8">
                <h3 className="font-bold text-2xl text-slate-800 mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Test Performance Analytics
                </h3>
                
                <div className="h-[400px] w-full mb-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyticsData.test_stats} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#a855f7" stopOpacity={0.7}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="test_code" 
                        angle={-45} 
                        textAnchor="end" 
                        interval={0} 
                        height={60} 
                        stroke="#94a3b8" 
                        tick={{fontSize: 12, fontWeight: 700, fill: '#475569'}} 
                      />
                      <YAxis yAxisId="left" stroke="#4F46E5" tick={{fontSize: 12}} label={{ value: 'Highest Score', angle: -90, position: 'insideLeft', offset: 10, style: {fill: '#4F46E5', fontWeight: 'bold'} }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#fca5a5" tick={{fontSize: 12}} label={{ value: 'Difficulty (%)', angle: 90, position: 'insideRight', offset: 10, style: {fill: '#fca5a5', fontWeight: 'bold'} }} />
                      <Tooltip 
                        content={<CustomTooltip />}
                        cursor={{fill: 'rgba(79, 70, 229, 0.05)'}}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar yAxisId="left" name="Highest Score" dataKey="highest_score" fill="url(#barGradient)" radius={[10, 10, 0, 0]} barSize={35} />
                      <Line yAxisId="right" name="Difficulty Rating" type="monotone" dataKey="difficulty" stroke="#fca5a5" strokeWidth={2} strokeDasharray="8 8" dot={{ r: 4, fill: '#fca5a5', strokeWidth: 1, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-12">
                  <h3 className="font-bold text-2xl text-slate-800 mb-8 flex items-center gap-2">
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
                    Subject Leaderboards
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {analyticsData?.leaderboards?.map((lb: any, idx: number) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="font-extrabold text-xl text-slate-800">{lb.subject}</h4>
                          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Top Scorers</span>
                        </div>
                        
                        <div className="space-y-4">
                          {lb.top_scorers.slice(0, expandedLeaderboards[lb.subject] ? lb.top_scorers.length : 3).map((student: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 group hover:bg-indigo-50/50 hover:border-indigo-100 transition-all">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                  sIdx === 0 ? 'bg-amber-100 text-amber-600' : 
                                  sIdx === 1 ? 'bg-slate-200 text-slate-600' : 
                                  sIdx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400'
                                }`}>
                                  {sIdx + 1}
                                </div>
                                <span className="font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">{student.username}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black text-indigo-600">{student.avg_score}%</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Avg Score</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {lb.top_scorers.length > 3 && (
                          <button 
                            onClick={() => setExpandedLeaderboards(prev => ({...prev, [lb.subject]: !prev[lb.subject]}))}
                            className="w-full mt-6 py-3 text-indigo-600 font-bold text-sm hover:bg-indigo-50 rounded-xl transition-colors border border-transparent hover:border-indigo-100"
                          >
                            {expandedLeaderboards[lb.subject] ? "Show Less" : "See More Rankings"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
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
            
          </>
        )}
        
        {/* Support Footer - Now visible for both students and teachers */}
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
