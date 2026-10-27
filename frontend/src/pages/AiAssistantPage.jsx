import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { queryGemma } from '../services/api';

export default function AiAssistantPage() {
  const { lang } = useLanguage();

  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text:
        lang === 'hi'
          ? 'नमस्ते किसान भाई! मैं मंडी दर्पण AI सहायक हूँ। आप मुझसे अपनी भाषा (हिंदी या English) में किसी भी मंडी के भाव, मूल्य रुझान या तुलना के बारे में पूछ सकते हैं।'
          : 'Hello Farmer Friend! I am your MandiDarpan AI Assistant. Ask me about mandi prices, price trends, or market comparisons in simple Hindi or English.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (questionText = null) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuestion('');
    setLoading(true);

    const res = await queryGemma({ question: q });
    setLoading(false);

    let answerText = '';
    let isError = false;

    if (res.success && res.answer) {
      answerText = res.answer;
    } else {
      isError = true;
      answerText =
        res.answer ||
        res.message ||
        (lang === 'hi'
          ? 'माफ़ कीजिए, अभी AI सहायक से उत्तर प्राप्त नहीं हो सका। कृपया बैकएंड कनेक्शन जांचें।'
          : 'Sorry, could not retrieve AI answer. Please verify backend connection.');
    }

    const aiResponse = {
      id: Date.now() + 1,
      sender: 'ai',
      text: answerText,
      isError,
      intent: res?.intent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiResponse]);
  };

  const handleExampleClick = (exampleQuery) => {
    setInputQuestion(exampleQuery);
    handleSend(exampleQuery);
  };

  const exampleQuestions = [
    { hi: 'लखनऊ में आज गेहूं का भाव क्या है?', en: 'Aaj gehun ka bhav kya hai?' },
    { hi: 'लखनऊ में गेहूं का भाव पिछले 7 दिन में बढ़ा या घटा?', en: 'Pichhle 7 din mein bhav badha ya ghata?' },
    { hi: 'लुधियाना में टमाटर की विभिन्न मंडियों के भाव की तुलना करें।', en: 'Mandi ke bhav compare karo.' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 flex flex-col h-[calc(100vh-140px)] min-h-[550px]">
      <PageHeader
        title={lang === 'hi' ? 'AI कृषि मित्र (Gemma 4)' : 'AI Farming Assistant'}
        subtitle={
          lang === 'hi'
            ? 'सरल बोलचाल की भाषा में मंडी भाव व रुझान पूछें। केवल सत्यापित सरकारी डेटा पर आधारित।'
            : 'Ask mandi rates and trends in conversational language, powered by Gemma 4.'
        }
        badge="Gemma 4 Verified"
      />

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col flex-1 overflow-hidden">
        {/* Chat Header Note */}
        <div className="bg-[#0f3d24] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#166534] flex items-center justify-center text-[#22c55e]">
              <Bot size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm">MandiDarpan AI</h4>
              <p className="text-[11px] text-emerald-200">Gemma 4 • Zero-Hallucination Policy</p>
            </div>
          </div>
          <span className="text-xs bg-[#166534] px-2.5 py-1 rounded-full text-emerald-100 font-semibold border border-emerald-500/40">
            {lang === 'hi' ? 'सक्रिय' : 'Active'}
          </span>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-[#f8faf7]/50">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isUser ? 'bg-[#166534] text-white' : 'bg-[#0f3d24] text-[#22c55e]'
                  }`}
                >
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div>
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#166534] text-white rounded-tr-none shadow-sm'
                        : msg.isError
                        ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-tl-none'
                        : 'bg-white text-gray-800 border border-gray-200/90 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span
                    className={`text-[10px] text-gray-400 mt-1 block px-1 ${
                      isUser ? 'text-right' : 'text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator in Chat */}
          {loading && (
            <div className="flex gap-3 max-w-[80%] mr-auto">
              <div className="w-8 h-8 rounded-full bg-[#0f3d24] text-[#22c55e] flex items-center justify-center flex-shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm flex items-center gap-2 text-xs text-gray-600 font-medium">
                <RefreshCw size={15} className="animate-spin text-[#166534]" />
                <span>
                  {lang === 'hi'
                    ? 'Gemma 4 उत्तर तैयार कर रहा है (सत्यापित डेटा विश्लेषण)...'
                    : 'Gemma 4 is generating answer from verified mandi records...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-bold text-gray-500 whitespace-nowrap flex items-center gap-1">
            <HelpCircle size={13} />
            {lang === 'hi' ? 'उदाहरण प्रश्न:' : 'Example Questions:'}
          </span>
          {exampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleExampleClick(lang === 'hi' ? q.hi : q.en)}
              className="px-3 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-gray-200 rounded-full font-medium text-gray-700 whitespace-nowrap transition shadow-2xs"
            >
              {lang === 'hi' ? q.hi : q.en}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 md:p-4 bg-white border-t border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder={
                lang === 'hi'
                  ? 'अपना सवाल लिखें (जैसे: लखनऊ में गेहूं का भाव क्या है?)...'
                  : 'Ask a question (e.g. Lucknow mein gehun ka bhav kya hai?)...'
              }
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-sm font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none transition"
            />
            <button
              type="submit"
              disabled={loading || !inputQuestion.trim()}
              className="p-3 bg-[#166534] hover:bg-[#0f3d24] active:scale-95 text-white rounded-2xl shadow transition disabled:opacity-40 cursor-pointer"
              title="Send question"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
