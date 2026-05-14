"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "student",
    class_level: "X",
    board: "CBSE",
    stream: "Default"
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const url = isLogin ? "http://127.0.0.1:8000/auth/login" : "http://127.0.0.1:8000/auth/register";
    
    // For login, only send email and password
    const payload = isLogin 
      ? { email: formData.email, password: formData.password }
      : { ...formData, stream: formData.class_level === "XII" ? (formData.stream === "Default" ? "PCM&B" : formData.stream) : "Default" };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      if (isLogin) {
        localStorage.setItem("assessmate_token", data.access_token);
        localStorage.setItem("assessmate_user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else {
        // Successful registration, switch to login
        setIsLogin(true);
        setErrorMsg("Registration successful! Please sign in.");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 text-gray-900">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-100">
          <Link href="/" className="flex items-center justify-center gap-3 text-3xl font-bold text-primary hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="AssessMate Logo" className="w-10 h-10 rounded-lg shadow-sm" />
            <span>AssessMate</span>
          </Link>
          <p className="text-gray-600 mt-2">{isLogin ? "Welcome back! Sign in to continue." : "Create your account to get started."}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {errorMsg && (
            <div className={`p-3 rounded-lg text-sm ${errorMsg.includes('successful') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {errorMsg}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input type="text" name="username" value={formData.username} onChange={handleInputChange} required={!isLogin} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all text-gray-900 bg-white" placeholder="johndoe" />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all text-gray-900 bg-white" placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all text-gray-900 bg-white" placeholder="••••••••" />
          </div>

          {!isLogin && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="role" value="student" checked={formData.role === "student"} onChange={handleInputChange} className="text-secondary focus:ring-secondary" />
                    Student
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="role" value="teacher" checked={formData.role === "teacher"} onChange={handleInputChange} className="text-secondary focus:ring-secondary" />
                    Teacher
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Board</label>
                <select name="board" value={formData.board} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary outline-none bg-white text-gray-900">
                  <option value="CBSE">CBSE</option>
                  <option value="State Syllabus">State Syllabus</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class Level</label>
                <select name="class_level" value={formData.class_level} onChange={(e) => {
                  handleInputChange(e);
                  if (e.target.value === "XII" && formData.stream === "Default") {
                    setFormData(prev => ({ ...prev, class_level: "XII", stream: "PCM&B" }));
                  } else if (e.target.value === "X") {
                    setFormData(prev => ({ ...prev, class_level: "X", stream: "Default" }));
                  }
                }} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary outline-none bg-white text-gray-900">
                  <option value="X">Class X</option>
                  <option value="XII">Class XII</option>
                </select>
              </div>

              {formData.class_level === "XII" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stream</label>
                  <select name="stream" value={formData.stream} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary outline-none bg-white text-gray-900">
                    <option value="PCM&B">PCM&B</option>
                    <option value="Commerce and Economics">Commerce and Economics</option>
                    <option value="Humanities">Humanities</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-lg font-bold shadow hover:bg-blue-800 disabled:opacity-50 transition-all"
          >
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <div className="p-6 text-center border-t border-gray-100 bg-gray-50 text-sm">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
              }} 
              className="text-secondary font-semibold hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
