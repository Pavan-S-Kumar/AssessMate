"use client";

import { useState, useEffect } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

const hintPhrases = [
  "Want hints? Click on Mate!",
  "Mate has clue!",
  "Need help? Click!",
  "Brain stuck? Mate has hint!",
  "Amaze! I have a hint for you!",
  "Want to know a secret? Click me!",
  "Mate knows the way. Ask for hint!"
];

interface TestMateButtonProps {
  currentHint?: string;
}

export default function TestMateButton({ currentHint }: TestMateButtonProps) {
  const [currentText, setCurrentText] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Close hint if the question changes
  useEffect(() => {
    setShowHint(false);
  }, [currentHint]);

  const handleMouseEnter = () => {
    if (showHint) return;
    const randomPhrase = hintPhrases[Math.floor(Math.random() * hintPhrases.length)];
    setCurrentText(randomPhrase);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const toggleHint = () => {
    setShowHint(!showHint);
    setIsHovered(false);
  };

  const displayHint = currentHint || "Amaze! I couldn't find a specific hint for this question, but I believe in you! Keep going!";

  return (
    <div 
      className="fixed bottom-8 right-8 z-50 flex items-end gap-3"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered && !showHint && (
        <div className="bg-white text-secondary font-bold px-4 py-2 rounded-xl shadow-lg border-2 border-indigo-100 animate-bounce transition-all relative mb-2">
          <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 bg-white border-t-2 border-r-2 border-indigo-100 rotate-45"></div>
          {currentText}
        </div>
      )}
      
      {showHint && (
        <div className="bg-white text-gray-800 p-5 rounded-xl shadow-2xl border-2 border-primary w-80 max-h-96 overflow-y-auto mb-2 transition-all relative animate-in fade-in zoom-in duration-200">
          <div className="absolute bottom-6 -right-2 transform w-4 h-4 bg-white border-t-2 border-r-2 border-primary rotate-45"></div>
          <div className="font-bold text-primary mb-2 flex justify-between items-center border-b pb-2">
            <span>💡 Mate's Hint</span>
            <button onClick={() => setShowHint(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl leading-none">&times;</button>
          </div>
          <div className="text-sm prose prose-sm">
             <MarkdownRenderer content={displayHint} />
          </div>
        </div>
      )}

      <div className="animate-float shrink-0">
        <button 
          onClick={toggleHint}
          className="w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-50 transition-transform hover:scale-105 border-2 border-primary overflow-hidden relative"
          title="Get a hint from Mate"
        >
          <img src="/mate_logo.png" alt="Mate" className="w-full h-full object-cover" />
        </button>
      </div>
    </div>
  );
}
