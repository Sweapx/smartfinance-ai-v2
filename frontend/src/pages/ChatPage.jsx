import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, RefreshCw } from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const STARTER_PROMPTS = [
  "Bagaimana Financial Health Score saya?",
  "Kategori mana yang melebihi alokasi ideal?",
  "Berikan tips agar tabungan saya capai 20%",
  "Prediksi pengeluaran bulan depan seperti apa?",
];

function Message({ msg }) {
  const isBot = msg.role === "assistant";
  return (
    <div className={`flex gap-3 ${isBot ? "" : "flex-row-reverse"} animate-fade-in`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isBot ? "bg-[#01696f]" : "bg-[#dcd9d5]"}`}>
        {isBot ? <Bot size={16} color="white" /> : <User size={16} className="text-[#7a7974]" />}
      </div>
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isBot ? "bg-white border border-[#dcd9d5] text-[#28251d] rounded-tl-sm shadow-sm" : "bg-[#01696f] text-white rounded-tr-sm"}`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Halo ${user?.name?.split(" ")[0] || ""}! Saya SmartFinance Advisor.\n\nSaya bisa membantu menjelaskan Financial Health Score, alokasi 50/30/20, dan hasil prediksi pengeluaran Anda dalam bahasa yang mudah dipahami.\n\nAda yang bisa saya bantu?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/chat", { message: msg, session_id: sessionId });
      setSessionId(data.session_id);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Maaf, terjadi kesalahan saat menghubungi server. Pastikan backend berjalan dan GROQ_API_KEY sudah dikonfigurasi." }]);
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setSessionId(null);
    setMessages([{ role: "assistant", content: `Sesi baru dimulai! Ada yang bisa saya bantu terkait keuangan Anda?` }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
      <div className="bg-white border border-[#dcd9d5] rounded-xl rounded-b-none p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#01696f] rounded-xl flex items-center justify-center"><Bot size={20} color="white" /></div>
          <div>
            <h3 className="font-semibold text-[#28251d] text-sm">SmartFinance Advisor</h3>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-xs text-[#7a7974]">Online - LLM Chatbot Service (Groq)</span></div>
          </div>
        </div>
        <button onClick={handleReset} className="p-2 rounded-lg hover:bg-[#f3f0ec] text-[#7a7974]" title="Reset chat"><RefreshCw size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f9f8f5] border-x border-[#dcd9d5] p-4 space-y-4">
        {messages.map((msg, i) => (<Message key={i} msg={msg} />))}
        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-[#01696f] flex items-center justify-center flex-shrink-0"><Bot size={16} color="white" /></div>
            <div className="bg-white border border-[#dcd9d5] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((i) => (<span key={i} className="w-2 h-2 rounded-full bg-[#01696f]/40 typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="bg-[#f9f8f5] border-x border-[#dcd9d5] px-4 pb-3">
          <p className="text-xs text-[#7a7974] mb-2 flex items-center gap-1"><Sparkles size={11} /> Coba tanya:</p>
          <div className="flex gap-2 flex-wrap">
            {STARTER_PROMPTS.map((p) => (
              <button key={p} onClick={() => sendMessage(p)} className="text-xs px-3 py-1.5 bg-white border border-[#dcd9d5] rounded-full text-[#7a7974] hover:border-[#01696f] hover:text-[#01696f] transition-colors">{p}</button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-[#dcd9d5] rounded-xl rounded-t-none p-3">
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Tanyakan sesuatu tentang keuangan Anda..." disabled={loading}
            className="flex-1 px-4 py-2.5 bg-[#f7f6f2] border border-[#dcd9d5] rounded-xl text-sm focus:outline-none focus:border-[#01696f] disabled:opacity-50" />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="w-10 h-10 bg-[#01696f] hover:bg-[#0c4e54] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors"><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
