"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { curriculumData } from "./curriculumData";


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
        include_critical_thinking: true
      };

      const response = await fetch(`http://127.0.0.1:8000/tests/generate?email=${email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to generate test");

      const data = await response.json();
      router.push(`/test/${data.test_id}`);
    } catch (error) {
      console.error(error);
      alert("Error generating test. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

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
      </div>
    </div>
  );
}
