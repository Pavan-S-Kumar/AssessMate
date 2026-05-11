"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import TestMateButton from "../../../components/TestMateButton";

interface Question {
  id: string;
  type: string;
  content: string;
  options?: string[];
  hint?: string;
}

export default function TestInterface({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [imageAnswers, setImageAnswers] = useState<Record<string, string[]>>({});
  const [timeTaken, setTimeTaken] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [testData, setTestData] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/tests/${unwrappedParams.id}`);
        if (!response.ok) throw new Error("Failed to load test");
        const data = await response.json();
        setTestData(data);
        setQuestions(data.assessment.questions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [unwrappedParams.id]);

  useEffect(() => {
    // Timer for the current question
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQuestionIndex]);

  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers({...answers, [qId]: value});
    // Update time taken for this question when they answer
    setTimeTaken({...timeTaken, [qId]: timer});
  };

  const handleNext = () => {
    // Ensure we save the final time spent on this question before moving
    const qId = questions[currentQuestionIndex].id;
    if (!timeTaken[qId]) {
      setTimeTaken({...timeTaken, [qId]: timer});
    }
    setTimer(0);
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentImages = imageAnswers[qId] || [];
    if (currentImages.length + files.length > 5) {
      alert("You can only upload up to 5 images per question.");
      return;
    }

    const allowedFiles = files.slice(0, 5 - currentImages.length);
    
    try {
      const compressedImages = await Promise.all(allowedFiles.map(compressImage));
      
      setImageAnswers(prev => ({ 
        ...prev, 
        [qId]: [...(prev[qId] || []), ...compressedImages] 
      }));
      
      if (!answers[qId]) {
        setAnswers(prev => ({ ...prev, [qId]: "[Handwritten Answer Attached]" }));
      }
    } catch (err) {
      console.error("Error compressing image:", err);
      alert("Error processing images. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save final time for the last question if not saved
    const qId = questions[currentQuestionIndex]?.id;
    const finalTimeTaken = { ...timeTaken };
    if (qId && !finalTimeTaken[qId]) {
      finalTimeTaken[qId] = timer;
    }

    setSubmitting(true);
    
    const formattedAnswers = Object.keys(answers).map(key => ({
      question_id: key,
      answer: answers[key],
      time_taken_seconds: finalTimeTaken[key] || timer,
      image_data: imageAnswers[key] || null
    }));

    try {
      const response = await fetch("http://127.0.0.1:8000/tests/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_id: parseInt(unwrappedParams.id),
          answers: formattedAnswers
        })
      });
      
      if (!response.ok) throw new Error("Failed to evaluate");
      
      router.push(`/results/${unwrappedParams.id}`);
    } catch (err) {
      console.error(err);
      alert("Error submitting test.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary font-bold">Loading Test...</div>;
  if (!questions.length) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Test not found or no questions.</div>;

  const q = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-4 shadow-sm border-b flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-bold text-primary">{testData?.subject} Test - {testData?.chapter}</h2>
        <div className="text-secondary font-mono font-bold bg-indigo-50 px-4 py-2 rounded-lg">
          Question Timer: {timer}s
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-8">
        <div className="mb-4 text-sm text-gray-500 font-semibold">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[300px]">
            <div className="font-semibold text-lg text-gray-800 mb-6 flex gap-2">
              <span className="text-primary whitespace-nowrap">Q{currentQuestionIndex + 1}.</span> 
              <MarkdownRenderer content={q.content} />
            </div>
            
            {q.type === "mcq" ? (
              <div className="space-y-3">
                {q.options?.map((opt, i) => (
                  <label key={i} className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 has-[:checked]:bg-indigo-50 has-[:checked]:border-secondary transition-colors">
                    <input 
                      type="radio" 
                      name={q.id} 
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="mr-3 text-secondary focus:ring-secondary w-4 h-4 flex-shrink-0 mt-1"
                    />
                    <MarkdownRenderer content={opt} />
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <textarea 
                    rows={6}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all"
                    placeholder="Type your answer here..."
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  ></textarea>
                </div>
                <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handleImageUpload(q.id, e)}
                  />
                  {imageAnswers[q.id]?.length > 0 ? (
                    <div className="text-center pointer-events-none">
                      <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p className="text-sm font-medium text-green-600">{imageAnswers[q.id].length} Image(s) Attached</p>
                      <p className="text-xs text-gray-500 mt-1">Click to add more (Max 5)</p>
                    </div>
                  ) : (
                    <div className="text-center pointer-events-none">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      <span className="text-sm font-medium text-gray-700 block">Attach your Handwritten Answer</span>
                      <span className="text-xs text-gray-400 mt-1 block">Up to 5 images</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            {!isLastQuestion ? (
              <button 
                type="button"
                onClick={handleNext}
                disabled={!answers[q.id]}
                className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold text-lg hover:bg-gray-900 transition-all disabled:opacity-50"
              >
                Next Question
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={submitting || !answers[q.id]}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-blue-900 transition-all shadow-md disabled:opacity-50"
              >
                {submitting ? "AI is evaluating your answers..." : "Submit Assessment"}
              </button>
            )}
          </div>
        </form>
      </main>
      
      <TestMateButton currentHint={q.hint} />
    </div>
  );
}

