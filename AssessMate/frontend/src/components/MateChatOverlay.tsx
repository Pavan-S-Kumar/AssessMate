"use client";

import React, { useState, useEffect, useRef } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface ChatMessage {
  role: string;
  content: string;
  image_data?: string[];
}

interface ChatHistoryItem {
  id: number;
  title: string;
  updated_at: string;
}

export default function MateChatOverlay({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const getUserEmail = () => {
    const userStr = localStorage.getItem("assessmate_user");
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      return parsedUser.email;
    }
    return "student@example.com";
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachments.length + files.length > 3) {
      alert("You can only upload up to 3 images per message.");
      return;
    }

    try {
      const compressedImages = await Promise.all(files.map(compressImage));
      setAttachments(prev => [...prev, ...compressedImages]);
    } catch (err) {
      console.error("Error compressing image:", err);
      alert("Error processing images. Please try again.");
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const fetchHistory = async () => {
    try {
      const email = getUserEmail();
      const response = await fetch(`http://127.0.0.1:8000/chat/${email}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch chat history", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const loadChat = async (chatId: number) => {
    setActiveChatId(chatId);
    setMessages([]);
    setIsLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/chat/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load chat", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && attachments.length === 0) return;
    
    const userMsg = inputMessage;
    const currentAttachments = [...attachments];
    
    setInputMessage("");
    setAttachments([]);
    setMessages(prev => [...prev, { role: "user", content: userMsg, image_data: currentAttachments.length > 0 ? currentAttachments : undefined }]);
    setIsLoading(true);

    try {
      if (activeChatId) {
        // Continue existing chat
        const response = await fetch(`http://127.0.0.1:8000/chat/${activeChatId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMsg, image_data: currentAttachments.length > 0 ? currentAttachments : null })
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
        }
      } else {
        // Start new chat
        const email = getUserEmail();
        const response = await fetch(`http://127.0.0.1:8000/chat/${email}/new`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMsg, image_data: currentAttachments.length > 0 ? currentAttachments : null })
        });
        if (response.ok) {
          const data = await response.json();
          setActiveChatId(data.chat_id);
          setMessages(data.messages);
          fetchHistory(); // Refresh sidebar
        }
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-slate-900/40 backdrop-blur-sm font-sans overflow-hidden animate-fade-in p-0 md:p-6 lg:p-12">
      <div className="w-full h-full flex flex-col md:flex-row bg-white/95 backdrop-blur-xl md:rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-slide-up">
        
        {/* Sidebar History */}
        <div className="w-full md:w-1/4 lg:w-1/5 max-w-[300px] bg-slate-50/80 border-r border-slate-200/60 flex flex-col h-full hidden md:flex">
          <div className="p-5 border-b border-slate-200/60">
            <button 
              onClick={handleNewChat}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              New Chat
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-2 mt-2">Past Conversations</h3>
            <div className="space-y-1.5">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadChat(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 text-sm flex flex-col gap-1 border ${activeChatId === item.id ? 'bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-200 shadow-sm text-indigo-900 font-semibold' : 'border-transparent text-slate-600 hover:bg-white hover:shadow-sm hover:border-slate-200'}`}
                >
                  <span className="truncate w-full block">{item.title}</span>
                  <span className={`text-[10px] block ${activeChatId === item.id ? 'text-indigo-400' : 'text-slate-400'}`}>{new Date(item.updated_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-transparent relative">
          <div className="h-16 border-b border-slate-200/60 flex items-center justify-between px-6 glass absolute top-0 w-full z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="/mate_logo.png" alt="Mate" className="w-10 h-10 rounded-full border-2 border-indigo-100 shadow-sm" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <h2 className="font-extrabold text-lg text-slate-800 leading-tight">Mate</h2>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">AI Teaching Assistant</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-24 space-y-8 relative">
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5 pointer-events-none" />
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 relative z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
                  <img src="/mate_logo.png" alt="Mate" className="w-28 h-28 mb-6 rounded-full shadow-2xl border-4 border-white relative animate-float" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Amaze! I am Mate.</h3>
                <p className="max-w-md text-slate-500 leading-relaxed">I can explain complex concepts clearly and guide you step-by-step. Ask me anything about your studies!</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10 animate-slide-up`} style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-3xl px-6 py-4 shadow-sm ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}>
                    <div className="text-[15px] leading-relaxed">
                      {msg.role === 'user' ? (
                        <>
                          <p>{msg.content}</p>
                          {msg.image_data && msg.image_data.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {msg.image_data.map((imgStr, i) => (
                                <img 
                                  key={i} 
                                  src={imgStr} 
                                  alt="Attached" 
                                  className="max-w-[200px] max-h-[200px] rounded-xl border-2 border-white/20 cursor-zoom-in hover:opacity-90 transition-opacity shadow-md" 
                                  onClick={() => setExpandedImage(imgStr)}
                                />
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="prose prose-slate prose-sm max-w-none">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start relative z-10 animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-sm px-6 py-5 shadow-sm flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200/60 z-10 relative">
            {attachments.length > 0 && (
              <div className="max-w-4xl mx-auto mb-4 flex gap-3 overflow-x-auto p-2">
                {attachments.map((imgSrc, idx) => (
                  <div key={idx} className="relative inline-block animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                    <img src={imgSrc} alt="Preview" className="h-20 w-20 object-cover rounded-xl border-2 border-indigo-200 shadow-sm" />
                    <button 
                      onClick={() => removeAttachment(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold hover:bg-red-600 shadow-md transition-transform hover:scale-110"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="max-w-4xl mx-auto relative flex items-end gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-400 transition-all duration-300">
              <label className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer transition text-indigo-600 shadow-sm hover:shadow">
                <input 
                  type="file" 
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isLoading}
                />
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </label>
              <div className="relative flex-1 flex items-end">
                <textarea
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask Mate a question or attach an image..."
                  className="w-full bg-transparent px-3 py-3 max-h-[120px] focus:outline-none text-slate-800 resize-none overflow-y-auto min-h-[48px]"
                  disabled={isLoading}
                  rows={1}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isLoading || (!inputMessage.trim() && attachments.length === 0)}
                  className="mb-1 mr-1 flex-shrink-0 w-10 h-10 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl flex items-center justify-center hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-200 shadow-md shadow-indigo-200"
                >
                  <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m-7 7l7-7 7 7" /></svg>
                </button>
              </div>
            </div>
            <p className="text-center text-xs font-medium text-slate-400 mt-3">Mate focuses on absolute clarity. Once you understand, the fun resumes!</p>
          </div>
        </div>

      </div>

      {expandedImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-80 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 text-white text-3xl font-bold bg-black bg-opacity-50 w-10 h-10 rounded-full flex items-center justify-center hover:bg-opacity-80 transition"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedImage(null);
              }}
            >
              &times;
            </button>
            <img 
              src={expandedImage} 
              alt="Expanded" 
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
