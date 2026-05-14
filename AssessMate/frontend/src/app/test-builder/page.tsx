"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { curriculumData } from "./curriculumData";
import MarkdownRenderer from "../../components/MarkdownRenderer";


export default function TestBuilder() {
  const router = useRouter();
  const [board, setBoard] = useState("CBSE");
  const [classLevel, setClassLevel] = useState("X");
  const [stream, setStream] = useState("Default");
  const [subjectData, setSubjectData] = useState<Record<string, string[]>>({});
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mode, setMode] = useState("Balanced");
  const [loading, setLoading] = useState(false);
  const [customMcqCount, setCustomMcqCount] = useState<number | string>(10);
  const [customShortCount, setCustomShortCount] = useState<number | string>(5);
  const [customLongCount, setCustomLongCount] = useState<number | string>(2);
  const [customDifficulty, setCustomDifficulty] = useState("Mixed");

  const [isTeacher, setIsTeacher] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [testCode, setTestCode] = useState<string | null>(null);
  const [savingTest, setSavingTest] = useState(false);
  const [allowReattempts, setAllowReattempts] = useState(false);
  const [durationHours, setDurationHours] = useState<number | string>(""); // Default unlimited

  useEffect(() => {
    const userStr = localStorage.getItem("assessmate_user");
    let uBoard = "CBSE";
    let uClass = "X";
    let uStream = "Default";

    if (userStr) {
      const user = JSON.parse(userStr);
      uBoard = user.board || "CBSE";
      uClass = user.class || "X";
      uStream = user.stream || (uClass === "XII" ? "PCM&B" : "Default");
      if (user.role === 'teacher') setIsTeacher(true);
    }

    setBoard(uBoard);
    setClassLevel(uClass);
    setStream(uStream);

    const availableSubjects = curriculumData[uBoard]?.[uClass]?.[uStream] || {};
    setSubjectData(availableSubjects);

    const firstSubject = Object.keys(availableSubjects)[0] || "";
    setSubject(firstSubject);
    setChapters(availableSubjects[firstSubject] || []);
  }, []);

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSub = e.target.value;
    setSubject(newSub);
    setChapters(subjectData[newSub] || []); // Select all chapters on subject change
    setIsDropdownOpen(false);
  };

  const handleMcqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      setCustomMcqCount("");
      return;
    }
    let val = parseInt(e.target.value);
    if (isNaN(val)) return;
    let mcq = Math.max(1, Math.min(val, 230));

    let available = 230 - mcq;
    let long = Number(customLongCount) || 0;
    if (long * 15 > available) {
      long = Math.floor(available / 15);
    }
    available -= long * 15;

    let short = Number(customShortCount) || 0;
    if (short * 9 > available) {
      short = Math.floor(available / 9);
    }

    setCustomMcqCount(mcq);
    setCustomShortCount(short);
    setCustomLongCount(long);
  };

  const handleShortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      setCustomShortCount("");
      return;
    }
    let val = parseInt(e.target.value);
    if (isNaN(val)) return;
    let short = Math.max(0, Math.min(val, 25));

    let available = 230 - short * 9;
    let long = Number(customLongCount) || 0;
    if (long * 15 > available - 1) { // reserve 1 for MCQ
      long = Math.floor((available - 1) / 15);
    }
    available -= long * 15;

    let mcq = Number(customMcqCount) || 1;
    if (mcq > available) {
      mcq = available;
    }
    mcq = Math.max(1, mcq);

    setCustomMcqCount(mcq);
    setCustomShortCount(short);
    setCustomLongCount(long);
  };

  const handleLongChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      setCustomLongCount("");
      return;
    }
    let val = parseInt(e.target.value);
    if (isNaN(val)) return;
    let long = Math.max(0, Math.min(val, 15));

    let available = 230 - long * 15;
    let short = Number(customShortCount) || 0;
    if (short * 9 > available - 1) {
      short = Math.floor((available - 1) / 9);
    }
    available -= short * 9;

    let mcq = Number(customMcqCount) || 1;
    if (mcq > available) {
      mcq = available;
    }
    mcq = Math.max(1, mcq);

    setCustomMcqCount(mcq);
    setCustomShortCount(short);
    setCustomLongCount(long);
  };

  const currentTokenLoad = (Number(customMcqCount) || 1) * 1 + (Number(customShortCount) || 0) * 9 + (Number(customLongCount) || 0) * 15;
  const loadPercentage = Math.min(100, Math.round((currentTokenLoad / 230) * 100));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (chapters.length === 0) {
        alert("Please select at least one chapter.");
        setLoading(false);
        return;
      }

      const userStr = localStorage.getItem("assessmate_user");
      const email = userStr ? JSON.parse(userStr).email : "student@example.com";

      const payload = {
        subject: subject,
        chapter: chapters.join(", "),
        subtopics: [],
        mode: mode,
        mcq_count: mode === "Custom" ? (Number(customMcqCount) || 1) : (mode === "MCQ Only" ? 20 : 5),
        short_count: mode === "Custom" ? (Number(customShortCount) || 0) : (mode === "MCQ Only" ? 0 : 3),
        long_count: mode === "Custom" ? (Number(customLongCount) || 0) : (mode === "MCQ Only" ? 0 : 1),
        difficulty: mode === "Custom" ? customDifficulty : "Medium",
        include_critical_thinking: true,
        preview_only: isTeacher
      };

      const response = await fetch(`http://127.0.0.1:8000/tests/generate?email=${email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to generate test");

      const data = await response.json();
      
      if (isTeacher) {
        setPreviewData(data.assessment);
        // Pre-select all
        const qIds = data.assessment.questions.map((q: any) => q.id);
        setSelectedQuestions(new Set(qIds));
      } else {
        router.push(`/test/${data.test_id}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error generating test. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleQuestion = (id: string) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedQuestions(newSet);
  };

  const handleSaveTeacherTest = async () => {
    if (selectedQuestions.size === 0) {
      alert("Please select at least one question.");
      return;
    }

    setSavingTest(true);
    const userStr = localStorage.getItem("assessmate_user");
    const email = userStr ? JSON.parse(userStr).email : "teacher@example.com";

    const filteredQuestions = previewData.questions.filter((q: any) => selectedQuestions.has(q.id));
    const finalData = { ...previewData, questions: filteredQuestions };

    try {
      const response = await fetch(`http://127.0.0.1:8000/tests/teacher/save?email=${email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject,
          chapter: chapters.join(", "),
          board: board,
          class_level: classLevel,
          stream: stream,
          test_data: finalData,
          allow_reattempts: allowReattempts,
          duration_hours: durationHours === "" ? null : Number(durationHours)
        })
      });

      if (!response.ok) throw new Error("Failed to save test");
      const resData = await response.json();
      setTestCode(resData.test_code);
    } catch (err) {
      console.error(err);
      alert("Failed to create test.");
    } finally {
      setSavingTest(false);
    }
  };

  if (testCode) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center text-gray-900">
        <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-md border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Test Created!</h2>
          <p className="text-gray-500 mb-6">Share this code with your students so they can take the test.</p>
          <div className="bg-gray-100 p-4 rounded-xl mb-8">
            <span className="text-4xl font-mono font-extrabold text-indigo-600 tracking-wider">{testCode}</span>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 bg-secondary text-white rounded-lg font-bold shadow-md hover:bg-indigo-600 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (previewData) {
    return (
      <div className="min-h-screen bg-background p-8 text-gray-900">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">Review Generated Questions</h1>
              <p className="text-gray-500 text-sm mt-1">Select the questions you want to include in the final test.</p>
            </div>
            <div className="text-right">
              <span className="bg-indigo-100 text-indigo-800 text-sm font-bold px-3 py-1 rounded-full">
                {selectedQuestions.size} / {previewData.questions.length} Selected
              </span>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-indigo-900">Allow Re-attempts</h4>
                <p className="text-indigo-600/70 text-xs">If enabled, students can take this test multiple times to improve their score.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={allowReattempts} onChange={(e) => setAllowReattempts(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="space-y-6 mb-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
            {previewData.questions.map((q: any, i: number) => (
              <div key={q.id} className={`p-4 rounded-xl border ${selectedQuestions.has(q.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'} transition-colors cursor-pointer flex gap-4`} onClick={() => handleToggleQuestion(q.id)}>
                <div className="pt-1">
                  <input type="checkbox" checked={selectedQuestions.has(q.id)} readOnly className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-gray-700">Q{i + 1}. <span className="uppercase text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600 ml-2">{q.type}</span></span>
                  </div>
                  <div className="text-gray-800 font-medium mb-4">
                    <MarkdownRenderer content={q.content} />
                  </div>
                  
                  {q.type === 'mcq' && q.options && (
                    <ul className="space-y-1 mb-4 text-sm text-gray-600 ml-4">
                      {q.options.map((opt: string, j: number) => (
                        <li key={j} className="flex gap-2">
                          <span className="text-indigo-500 font-bold">•</span>
                          <MarkdownRenderer content={opt} />
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <p className="text-xs font-bold text-green-800 mb-1">Ideal Answer:</p>
                    <div className="text-sm text-green-700">
                      <MarkdownRenderer content={q.ideal_answer} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setPreviewData(null)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-all"
            >
              Discard & Re-generate
            </button>
            <button 
              onClick={handleSaveTeacherTest}
              disabled={savingTest || selectedQuestions.size === 0}
              className="flex-1 py-3 bg-secondary text-white rounded-lg font-bold shadow-md hover:bg-indigo-600 transition-all disabled:opacity-50"
            >
              {savingTest ? "Creating Test..." : "Create Shareable Code"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8 text-gray-900">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <h1 className="text-3xl font-bold text-primary mb-6">Build a Test</h1>

        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={subject}
                onChange={handleSubjectChange}
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-secondary focus:border-secondary text-gray-900 bg-white"
              >
                {Object.keys(subjectData).map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chapters</label>
              <div className="relative">
                <div
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-secondary focus:border-secondary text-gray-900 bg-white cursor-pointer flex justify-between items-center"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className="truncate pr-4">
                    {chapters.length === 0
                      ? "Select Chapters"
                      : chapters.length === subjectData[subject]?.length
                        ? "All Chapters Selected"
                        : `${chapters.length} chapter(s) selected`}
                  </span>
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b flex items-center hover:bg-gray-50 cursor-pointer" onClick={() => {
                      if (chapters.length === subjectData[subject]?.length) {
                        setChapters([]);
                      } else {
                        setChapters(subjectData[subject] || []);
                      }
                    }}>
                      <input
                        type="checkbox"
                        className="mr-2 cursor-pointer w-4 h-4 text-secondary focus:ring-secondary border-gray-300 rounded"
                        checked={chapters.length > 0 && chapters.length === subjectData[subject]?.length}
                        onChange={() => { }}
                      />
                      <label className="text-sm font-medium cursor-pointer text-gray-900">Select All</label>
                    </div>
                    {subjectData[subject]?.map(ch => (
                      <div key={ch} className="p-2 hover:bg-gray-50 flex items-center cursor-pointer" onClick={() => {
                        if (chapters.includes(ch)) {
                          setChapters(chapters.filter(c => c !== ch));
                        } else {
                          setChapters([...chapters, ch]);
                        }
                      }}>
                        <input
                          type="checkbox"
                          className="mr-2 cursor-pointer w-4 h-4 text-secondary focus:ring-secondary border-gray-300 rounded"
                          checked={chapters.includes(ch)}
                          onChange={() => { }}
                        />
                        <label className="text-sm cursor-pointer text-gray-800">{ch}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-secondary focus:border-secondary text-gray-900 bg-white"
            >
              <option value="Main Exam">Main Exam Mode (80 Marks)</option>
              <option value="MCQ Only">MCQ Only Mode</option>
              <option value="Balanced">Balanced Mode (50 Marks)</option>
              <option value="Custom">Custom Mode (User Defined)</option>
            </select>
          </div>

          {isTeacher && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date (Validity)</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-secondary focus:border-secondary text-gray-900 bg-white"
              >
                <option value="">No Expiry (Unlimited)</option>
                <option value="1">1 Hour</option>
                <option value="24">1 Day</option>
                <option value="72">3 Days</option>
                <option value="120">5 Days</option>
                <option value="240">10 Days</option>
                <option value="720">1 Month</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 italic">The test code will be invalidated after this period.</p>
            </div>
          )}

          {mode === "Custom" && (
            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-primary">Custom Configuration</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${loadPercentage >= 95 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  Selected: {loadPercentage}%
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${loadPercentage >= 95 ? 'bg-red-500' : 'bg-secondary'}`}
                  style={{ width: `${loadPercentage}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Number of MCQs</label>
                  <input type="number" min="1" max="230" value={customMcqCount} onChange={handleMcqChange} className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white focus:ring-secondary focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Short Answer</label>
                  <input type="number" min="0" max="25" value={customShortCount} onChange={handleShortChange} className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white focus:ring-secondary focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Long Answer</label>
                  <input type="number" min="0" max="15" value={customLongCount} onChange={handleLongChange} className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white focus:ring-secondary focus:border-secondary" />
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
                <select value={customDifficulty} onChange={(e) => setCustomDifficulty(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white focus:ring-secondary focus:border-secondary">
                  <option value="Mixed">Mixed</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-secondary text-white rounded-lg font-bold shadow-md hover:bg-indigo-600 hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? "Generating Assessment with AI..." : "Generate Test"}
          </button>
        </form>

        {/* Support Footer */}
        <footer className="mt-12 text-center text-slate-500 text-sm animate-fade-in">
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
