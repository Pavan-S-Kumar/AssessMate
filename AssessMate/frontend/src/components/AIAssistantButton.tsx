"use client";

import { useState, useEffect } from "react";
import MateChatOverlay from "./MateChatOverlay";

const lowPresets = [
  "Don't worry, friend! Every mistake is a step to success. Let's practice!",
  "Mate is here to help you study! Let's hit the books!",
  "Keep pushing! Small steps make big differences!",
  "Scores are just numbers. Knowledge is power! Let's learn!"
];

const mediumPresets = [
  "Good work, friend! We have a solid foundation to build on!",
  "Nice trend! Let's do some more tests and break your records!",
  "You're doing well! Let's push a little harder today!",
  "Steady progress! Keep that momentum going! Amaze!"
];

const highPresets = [
  "Amaze! Your scores are flying! Keep it up!",
  "So many correct answers! Fist bump for you!",
  "You're crushing it! Let's aim for 100%!",
  "Brilliant work! Mate is very proud!"
];

const newPresets = [
  "Welcome to Dashboard! Let's take your first test. Amaze!",
  "A fresh start! What should we learn today?",
  "Ready to test your knowledge? Let's go!"
];

const phrases = [
  "Amaze! You have question?",
  "Got doubts, question?",
  "I can answer, yes!",
  "Want clarifications? Good. Good.",
  "Happy, happy, happy to help!",
  "Fist my bump! Then ask.",
  "Question? I listen.",
  "You confuse? Mate explain.",
  "Much learn to do! Ask!",
  "Brain need food? Ask Mate!",
  "Mate is here. Amaze!",
  "You ask, I answer. Good?",
  "Not understand? I help!",
  "Ask Mate? Yes, yes, yes!",
  "Science! Ask question!",
  "You have problem? I solve.",
  "Let's learn! Amaze!",
  "Got doubts?? Mate ready.",
  "I am Mate. You are friend. Ask.",
  "Want knowledge? I have it!"
];

export default function AIAssistantButton({ isDashboard = false }: { isDashboard?: boolean }) {
  const [currentText, setCurrentText] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    if (isDashboard) {
      const fetchPerformance = async () => {
        try {
          const userStr = localStorage.getItem("assessmate_user");
          if (!userStr) return;
          const user = JSON.parse(userStr);
          
          const response = await fetch(`http://127.0.0.1:8000/tests/performance/${user.email}`);
          if (response.ok) {
            const data = await response.json();
            
            let message = "";
            if (data.length === 0) {
              message = newPresets[Math.floor(Math.random() * newPresets.length)];
            } else {
              const sum = data.reduce((acc: number, curr: any) => acc + curr.score, 0);
              const avgScore = sum / data.length;
              
              if (avgScore < 40) {
                message = lowPresets[Math.floor(Math.random() * lowPresets.length)];
              } else if (avgScore < 75) {
                message = mediumPresets[Math.floor(Math.random() * mediumPresets.length)];
              } else {
                message = highPresets[Math.floor(Math.random() * highPresets.length)];
              }
            }
            
            setCurrentText(message);
            setShowGreeting(true);
            
            setTimeout(() => {
              setShowGreeting(false);
            }, 10000);
          }
        } catch (err) {
          console.error("Error fetching performance for Mate greeting", err);
        }
      };
      
      fetchPerformance();
    }
  }, [isDashboard]);

  const handleMouseEnter = () => {
    if (isOverlayOpen) return;
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    setCurrentText(randomPhrase);
    setShowGreeting(false);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <>
      <div
        className="fixed bottom-8 right-8 z-50 flex items-center gap-3"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isHovered && !isOverlayOpen && !showGreeting && (
          <div className="glass-card text-indigo-800 font-extrabold px-5 py-3 rounded-2xl shadow-xl animate-bounce transition-all relative z-50 whitespace-nowrap">
            <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 bg-white/80 backdrop-blur-md border-t border-r border-white/60 rotate-45"></div>
            {currentText}
          </div>
        )}
        {showGreeting && !isHovered && !isOverlayOpen && (
          <div className="glass-card text-indigo-800 font-extrabold px-5 py-3 rounded-2xl shadow-xl animate-fade-in transition-all relative z-50 max-w-xs text-sm">
            <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 bg-white/80 backdrop-blur-md border-t border-r border-white/60 rotate-45"></div>
            {currentText}
          </div>
        )}
        {!isOverlayOpen && (
          <div className="animate-float">
            <button
              onClick={() => setIsOverlayOpen(true)}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-slate-50 transition-all duration-300 hover:scale-110 border-4 border-indigo-100 overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.7)] z-50 group"
              title="Mate - AI Teaching Assistant"
            >
              <img src="/mate_logo.png" alt="Mate" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </button>
          </div>
        )}
      </div>

      {isOverlayOpen && (
        <MateChatOverlay onClose={() => setIsOverlayOpen(false)} />
      )}
    </>
  );
}
