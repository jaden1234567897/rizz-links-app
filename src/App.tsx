/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [tmpl, setTmpl] = useState<string | null>(null);
  const [params, setParams] = useState<any>({});
  const [dashboardData, setDashboardData] = useState({
    type: 'run',
    to: '',
    from: '',
    plan: '',
    prize: '',
    time: '',
    img: '',
    crushImg: '',
    location: '',
    day: '',
    bio: '',
    songUrl: '',
    wordleWord: 'DATE?',
    tarotFood: 'Sushi',
    quizFood: 'Tacos',
    quizQ1: 'What is the superior weekend activity?',
    quizQ2: 'How would you describe your ideal date?',
    quizQ3: 'What is your biggest red flag?',
    customMsg: 'Will you go out with me?',
    customBtn: 'Yes!',
    customNoBtn: 'No!',
    customBg: '#ffffff',
    customText: '#000000'
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSetupKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };
  const [success, setSuccess] = useState<{ title: string; msg: string; type?: string } | null>(null);

  // Template 1: Running Button State
  const [runStep, setRunStep] = useState(0); // 0: Intro, 1: Question, 2: Success
  const [noPos, setNoPos] = useState<{ x: number; y: number } | null>(null);

  // Template 2: Scratch State
  const scratchCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);

  // Template 3: Package State
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [isDelivered, setIsDelivered] = useState(false);

  // Template 4: CAPTCHA State
  const [captchaSelected, setCaptchaSelected] = useState<number[]>([]);
  const [captchaGrid, setCaptchaGrid] = useState<{ type: 'img' | 'emoji'; content: string }[]>([]);

  // Template 5: Spotify State
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  const [spotifyProgress, setSpotifyProgress] = useState(0);
  const [generatedCoupleImg, setGeneratedCoupleImg] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  // Template 8: Tarot State
  const [tarotStep, setTarotStep] = useState<'zodiac' | 'spinning' | 'reading'>('zodiac');
  const [tarotZodiac, setTarotZodiac] = useState('');

  // Template 9: Quiz State
  const [quizStep, setQuizStep] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);

  useEffect(() => {
    const generateCoupleImage = async () => {
      if (tmpl === 'spotify' && params.img && params.crushImg && !generatedCoupleImg && !isGeneratingImg) {
        setIsGeneratingImg(true);
        try {
          const { GoogleGenAI } = await import("@google/genai");
          const apiKey = hasApiKey ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : process.env.GEMINI_API_KEY;
          const ai = new GoogleGenAI({ apiKey });
          
          const prompt = `Create a single, high-quality album cover image that features BOTH people from the two provided images. 
          SCENE: The two people are in the iconic Titanic "I'm flying" pose on the deck of a ship. 
          The person from IMAGE 1 should be Jack (standing behind, holding the other person). 
          The person from IMAGE 2 should be Rose (standing in front with arms outstretched). 
          Both faces MUST be clearly visible and recognizable as the people in the photos. 
          Style: Professional Spotify album art, cinematic lighting, beautiful sunset background. 
          IMPORTANT: Do not generate just one person. Both people MUST be present. 
          Do not include any text on the image.`;
          
          const img1Part = {
            inlineData: {
              data: params.img.split(',')[1],
              mimeType: "image/png",
            },
          };
          const img2Part = {
            inlineData: {
              data: params.crushImg.split(',')[1],
              mimeType: "image/png",
            },
          };

          const response = await ai.models.generateContent({
            model: hasApiKey ? "gemini-3.1-flash-image-preview" : "gemini-2.5-flash-image",
            contents: { parts: [img1Part, img2Part, { text: prompt }] },
            config: hasApiKey ? {
              imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K"
              }
            } : undefined
          });

          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              setGeneratedCoupleImg(`data:image/png;base64,${part.inlineData.data}`);
              break;
            }
          }
        } catch (error) {
          console.error("Failed to generate couple image:", error);
          setGeneratedCoupleImg(params.img);
        } finally {
          setIsGeneratingImg(false);
        }
      }
    };
    generateCoupleImage();
  }, [tmpl, params.img, params.crushImg]);

  useEffect(() => {
    let interval: any;
    if (tmpl === 'spotify' && spotifyPlaying && spotifyProgress < 100) {
      interval = setInterval(() => {
        setSpotifyProgress(prev => Math.min(prev + 0.5, 100));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [tmpl, spotifyPlaying, spotifyProgress]);

  // Template 6: Wordle State
  const [wordleGuesses, setWordleGuesses] = useState<string[]>(['', '', '', '', '', '']);
  const [wordleCurrentRow, setWordleCurrentRow] = useState(0);
  const [wordleStatus, setWordleStatus] = useState<'playing' | 'won'>('playing');
  const [showWordleWin, setShowWordleWin] = useState(false);
  const [showWordleContinue, setShowWordleContinue] = useState(false);
  const TARGET_WORD = (params.wordleWord || "DATE?").toUpperCase();

  const handleWordleInput = (key: string) => {
    if (tmpl !== 'wordle' || wordleStatus === 'won') return;

    if (key === 'ENTER') {
      if (wordleGuesses[wordleCurrentRow].length === TARGET_WORD.length) {
        if (wordleCurrentRow === 0) {
          setWordleStatus('won');
          setTimeout(() => {
            confetti();
            setShowWordleContinue(true);
          }, 1000);
        } else {
          setWordleCurrentRow(prev => prev + 1);
        }
      }
    } else if (key === 'BACKSPACE') {
      const newGuesses = [...wordleGuesses];
      newGuesses[wordleCurrentRow] = newGuesses[wordleCurrentRow].slice(0, -1);
      setWordleGuesses(newGuesses);
    } else if (/^[A-Z?]$/.test(key)) {
      const newGuesses = [...wordleGuesses];
      if (newGuesses[wordleCurrentRow].length < TARGET_WORD.length) {
        // RIGGED: Overwrite with TARGET_WORD letters
        const nextChar = TARGET_WORD[newGuesses[wordleCurrentRow].length];
        newGuesses[wordleCurrentRow] += nextChar;
        setWordleGuesses(newGuesses);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleWordleInput('ENTER');
      else if (e.key === 'Backspace') handleWordleInput('BACKSPACE');
      else handleWordleInput(e.key.toUpperCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tmpl, wordleGuesses, wordleCurrentRow, wordleStatus, params.from, params.day]);

  // Template 7: Tinder State
  const [tinderStatus, setTinderStatus] = useState<'swiping' | 'match'>('swiping');
  const [noPosTinder, setNoPosTinder] = useState<{ x: number; y: number } | null>(null);

  const moveNoTinder = () => {
    const x = Math.random() * (window.innerWidth - 100);
    const y = Math.random() * (window.innerHeight - 50);
    setNoPosTinder({ x, y });
  };

  useEffect(() => {
    if (tmpl === 'captcha') {
      const items: { type: 'img' | 'emoji'; content: string }[] = [
        { type: 'img', content: params.img },
        { type: 'img', content: params.img },
        { type: 'img', content: params.img },
        { type: 'img', content: params.img },
        { type: 'emoji', content: '🤡' },
        { type: 'emoji', content: '🚩' },
        { type: 'emoji', content: '🗑️' },
        { type: 'emoji', content: '🐸' },
        { type: 'emoji', content: '🗿' },
      ];
      // Shuffle
      setCaptchaGrid(items.sort(() => Math.random() - 0.5));
    }
  }, [tmpl, params.img]);

  const toggleCaptcha = (index: number) => {
    if (captchaSelected.includes(index)) {
      setCaptchaSelected(captchaSelected.filter(i => i !== index));
    } else {
      setCaptchaSelected([...captchaSelected, index]);
    }
  };

  const verifyCaptcha = () => {
    const selectedItems = captchaSelected.map(i => captchaGrid[i]);
    const hasEmoji = selectedItems.some(item => item.type === 'emoji');
    const imageIndices = captchaGrid.map((item, i) => item.type === 'img' ? i : -1).filter(i => i !== -1);
    const allImagesSelected = imageIndices.every(i => captchaSelected.includes(i)) && captchaSelected.length === imageIndices.length;

    if (hasEmoji) {
      alert(`Error: You selected your ex or a red flag. Please select ${params.from} only.`);
    } else if (!allImagesSelected) {
      alert(`Error: Stop playing hard to get. Select all 4 of ${params.from}'s photos.`);
    } else {
      confetti();
      setSuccess({ title: "Humanity Verified 🤖❤️", msg: `Date confirmed for ${params.time}.` });
    }
  };

  useEffect(() => {
    const init = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const s = urlParams.get('s');
      const t = urlParams.get('tmpl');
      
      if (s) {
        try {
          const response = await fetch(`/api/rizz/${s}`);
          if (response.ok) {
            const data = await response.json();
            setTmpl(data.tmpl);
            setParams(data);
          }
        } catch (error) {
          console.error('Failed to fetch rizz config');
        }
      } else if (t) {
        setTmpl(t);
        setParams({
          to: urlParams.get('to') || 'Someone Special',
          from: urlParams.get('from') || 'Your Secret Admirer',
          plan: urlParams.get('plan') || 'a surprise',
          prize: urlParams.get('prize') || 'a fun night',
          time: urlParams.get('time') || 'Tonight',
          img: urlParams.get('img') || 'https://picsum.photos/400'
        });
      }
    };
    init();
  }, []);

  // --- Dashboard Actions ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'img' | 'crushImg' = 'img') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDashboardData({ ...dashboardData, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateLink = async () => {
    const { type, to, from, plan, prize, time, img, crushImg, location, day, bio, songUrl, wordleWord, tarotFood, quizFood, quizQ1, quizQ2, quizQ3, customMsg, customBtn, customNoBtn, customBg, customText } = dashboardData;
    try {
      const response = await fetch('/api/rizz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmpl: type, to, from, plan, prize, time, img, crushImg, location, day, bio, songUrl, wordleWord, tarotFood, quizFood, quizQ1, quizQ2, quizQ3, customMsg, customBtn, customNoBtn, customBg, customText })
      });
      const data = await response.json();
      const url = `${window.location.origin}/?s=${data.id}`;
      setGeneratedLink(url);
      setShowLinkPopup(true);
    } catch (error) {
      alert('Failed to generate link. Please try again.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
  };

  // --- Running Button Logic ---
  const moveNo = () => {
    const x = Math.random() * (window.innerWidth - 100);
    const y = Math.random() * (window.innerHeight - 50);
    setNoPos({ x, y });
  };

  const handleYes = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    if (tmpl === 'run') {
      setRunStep(2);
    } else {
      setSuccess({ title: "It's a Date!", msg: "Can't wait to see you." });
    }
  };

  // --- Scratch Logic ---
  useEffect(() => {
    if (tmpl === 'scratch' && scratchCanvasRef.current) {
      const canvas = scratchCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      ctx.fillStyle = '#C0C0C0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#8e8e8e';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2 + 7);
    }
  }, [tmpl]);

  const handleScratch = (e: any) => {
    if (!isScratching || !scratchCanvasRef.current) return;
    const canvas = scratchCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Add fun particles
    if (Math.random() > 0.8) {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: clientX / window.innerWidth, y: clientY / window.innerHeight },
        colors: ['#ec4899', '#f472b6', '#ffffff']
      });
    }

    // Check percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) transparent++;
    }
    if ((transparent / (pixels.length / 4)) > 0.5) {
      canvas.style.opacity = '0';
      confetti();
    }
  };

  // --- Package Logic ---
  useEffect(() => {
    if (tmpl === 'package' && sigCanvasRef.current) {
      const canvas = sigCanvasRef.current;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 150;
    }
  }, [tmpl]);

  const handleSign = (e: any) => {
    if (!isSigning || !sigCanvasRef.current) return;
    const canvas = sigCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const startSigning = (e: any) => {
    setIsSigning(true);
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const acceptDelivery = () => {
    if (!hasSigned) {
      alert('Please sign first!');
      return;
    }
    setIsDelivered(true);
    setTimeout(() => {
      confetti();
      setSuccess({ title: "Delivered!", msg: "See you then! 🚚💨" });
    }, 1000);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-[#FFF0F5] flex flex-col items-center justify-center text-center p-8 z-50">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-sm w-full border border-pink-100 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center gap-2 mb-4">
            <span className="text-yellow-400 text-2xl">✨</span>
            <span className="text-[#FF1493] text-4xl">❤️</span>
            <span className="text-yellow-400 text-2xl">✨</span>
          </div>
          <h2 className="text-4xl font-black text-[#FF1493] italic mb-4">{success.title}</h2>
          <p className="text-slate-600 font-medium mb-8">{success.msg}</p>
          <div className="bg-pink-50 p-4 rounded-2xl text-[#FF1493] text-sm font-bold">
            Screenshot this and send it to them! 📸
          </div>
        </div>
      </div>
    );
  }

  if (!tmpl) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-4 flex flex-col items-center font-sans">
        <div className="max-w-md w-full mt-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              RizzLinks
            </h1>
            <p className="text-slate-500 text-lg font-medium">Create a date proposal they literally can't say no to.</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50">
            <div className="flex items-center justify-between mb-6">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Select Template</label>
              {!hasApiKey && (
                <button 
                  onClick={handleSetupKey}
                  className="text-[10px] font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full hover:bg-amber-200 transition-colors flex items-center gap-1"
                >
                  <span>✨</span> Setup Advanced AI
                </button>
              )}
            </div>
            <div className="mb-6 relative">
              <div className="relative">
                <select 
                  className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none pr-10"
                  value={dashboardData.type}
                  onChange={(e) => setDashboardData({ ...dashboardData, type: e.target.value })}
                >
                  <option value="run">1. The Running Button</option>
                  <option value="scratch">2. The Scratch-Off</option>
                  <option value="package">3. Fake Package Delivery</option>
                  <option value="captcha">4. The CAPTCHA Robot Test</option>
                  <option value="spotify">5. The Fake Spotify Drop</option>
                  <option value="wordle">6. The "Wordle" Cheat Code</option>
                  <option value="tinder">7. The Tinder Swipe Hack</option>
                  <option value="tarot">8. Tarot Card / Astrology Reading</option>
                  <option value="quiz">9. 100% Match Compatibility Quiz</option>
                  <option value="custom">10. Custom Template (Build Your Own)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Crush's Name</label>
                <input 
                  type="text" 
                  className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Sarah"
                  value={dashboardData.to}
                  onChange={(e) => setDashboardData({ ...dashboardData, to: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Your Name</label>
                <input 
                  type="text" 
                  className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Alex"
                  value={dashboardData.from}
                  onChange={(e) => setDashboardData({ ...dashboardData, from: e.target.value })}
                />
              </div>

              {dashboardData.type === 'run' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">The Plan</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Sushi & Sunset"
                    value={dashboardData.plan}
                    onChange={(e) => setDashboardData({ ...dashboardData, plan: e.target.value })}
                  />
                </div>
              )}

              {dashboardData.type === 'scratch' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">The Prize</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Dinner at Nobu"
                    value={dashboardData.prize}
                    onChange={(e) => setDashboardData({ ...dashboardData, prize: e.target.value })}
                  />
                </div>
              )}

              {dashboardData.type === 'package' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Delivery Time</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Tonight at 8 PM"
                    value={dashboardData.time}
                    onChange={(e) => setDashboardData({ ...dashboardData, time: e.target.value })}
                  />
                </div>
              )}

              {dashboardData.type === 'captcha' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">The Date Plan</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Tacos"
                      value={dashboardData.plan}
                      onChange={(e) => setDashboardData({ ...dashboardData, plan: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Date Time</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Friday @ 8"
                      value={dashboardData.time}
                      onChange={(e) => setDashboardData({ ...dashboardData, time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Your Photo</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label 
                        htmlFor="photo-upload"
                        className="w-full bg-[#F5F5F7] border-2 border-dashed border-slate-300 rounded-2xl p-6 text-slate-500 font-semibold flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        {dashboardData.img ? (
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white shadow-sm">
                              <img src={dashboardData.img} className="w-full h-full object-cover" alt="preview" />
                            </div>
                            <span>Image Selected</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-2xl mb-1">📸</span>
                            <span>Upload Photo</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {dashboardData.type === 'spotify' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Song URL (MP3)</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. https://example.com/song.mp3"
                      value={dashboardData.songUrl}
                      onChange={(e) => setDashboardData({ ...dashboardData, songUrl: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Date Location</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Starbucks"
                      value={dashboardData.location}
                      onChange={(e) => setDashboardData({ ...dashboardData, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Date Time</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Friday @ 8"
                      value={dashboardData.time}
                      onChange={(e) => setDashboardData({ ...dashboardData, time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Your Photo</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'img')}
                        className="hidden"
                        id="spotify-upload"
                      />
                      <label 
                        htmlFor="spotify-upload"
                        className="w-full bg-[#F5F5F7] border-2 border-dashed border-slate-300 rounded-2xl p-6 text-slate-500 font-semibold flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        {dashboardData.img ? (
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white shadow-sm">
                              <img src={dashboardData.img} className="w-full h-full object-cover" alt="preview" />
                            </div>
                            <span>Your Photo Selected</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-2xl mb-1">📸</span>
                            <span>Upload Your Photo</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Crush's Photo (For AI Couple Image)</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'crushImg')}
                        className="hidden"
                        id="crush-upload"
                      />
                      <label 
                        htmlFor="crush-upload"
                        className="w-full bg-[#F5F5F7] border-2 border-dashed border-slate-300 rounded-2xl p-6 text-slate-500 font-semibold flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        {dashboardData.crushImg ? (
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white shadow-sm">
                              <img src={dashboardData.crushImg} className="w-full h-full object-cover" alt="preview" />
                            </div>
                            <span>Crush's Photo Selected</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-2xl mb-1">📸</span>
                            <span>Upload Crush's Photo</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {dashboardData.type === 'wordle' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Day of the Week</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Saturday"
                      value={dashboardData.day}
                      onChange={(e) => setDashboardData({ ...dashboardData, day: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Target Word (Rigged)</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. DINNER"
                      value={dashboardData.wordleWord}
                      onChange={(e) => setDashboardData({ ...dashboardData, wordleWord: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              )}

              {dashboardData.type === 'tinder' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Your Bio Text</label>
                    <textarea 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                      placeholder="e.g. Just a guy who knows the best taco spot in town..."
                      value={dashboardData.bio}
                      onChange={(e) => setDashboardData({ ...dashboardData, bio: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Your Photo</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'img')}
                        className="hidden"
                        id="tinder-upload"
                      />
                      <label 
                        htmlFor="tinder-upload"
                        className="w-full bg-[#F5F5F7] border-2 border-dashed border-slate-300 rounded-2xl p-6 text-slate-500 font-semibold flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        {dashboardData.img ? (
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white shadow-sm">
                              <img src={dashboardData.img} className="w-full h-full object-cover" alt="preview" />
                            </div>
                            <span>Image Selected</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-2xl mb-1">📸</span>
                            <span>Upload Your Photo</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Crush's Photo</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'crushImg')}
                        className="hidden"
                        id="tinder-crush-upload"
                      />
                      <label 
                        htmlFor="tinder-crush-upload"
                        className="w-full bg-[#F5F5F7] border-2 border-dashed border-slate-300 rounded-2xl p-6 text-slate-500 font-semibold flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        {dashboardData.crushImg ? (
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white shadow-sm">
                              <img src={dashboardData.crushImg} className="w-full h-full object-cover" alt="preview" />
                            </div>
                            <span>Crush's Photo Selected</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-2xl mb-1">📸</span>
                            <span>Upload Crush's Photo</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {dashboardData.type === 'tarot' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Food Type</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Sushi"
                      value={dashboardData.tarotFood}
                      onChange={(e) => setDashboardData({ ...dashboardData, tarotFood: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Day</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Saturday"
                      value={dashboardData.day}
                      onChange={(e) => setDashboardData({ ...dashboardData, day: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {dashboardData.type === 'quiz' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Her Favorite Restaurant/Activity</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Nobu"
                      value={dashboardData.quizFood}
                      onChange={(e) => setDashboardData({ ...dashboardData, quizFood: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Custom Question 1</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. What is the superior weekend activity?"
                      value={dashboardData.quizQ1}
                      onChange={(e) => setDashboardData({ ...dashboardData, quizQ1: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Custom Question 2</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. How would you describe your ideal date?"
                      value={dashboardData.quizQ2}
                      onChange={(e) => setDashboardData({ ...dashboardData, quizQ2: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Custom Question 3</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. What is your biggest red flag?"
                      value={dashboardData.quizQ3}
                      onChange={(e) => setDashboardData({ ...dashboardData, quizQ3: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {dashboardData.type === 'custom' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Your Message</label>
                    <textarea 
                      className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                      placeholder="e.g. Will you be my Valentine?"
                      value={dashboardData.customMsg}
                      onChange={(e) => setDashboardData({ ...dashboardData, customMsg: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Yes Button Text</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Yes!"
                        value={dashboardData.customBtn}
                        onChange={(e) => setDashboardData({ ...dashboardData, customBtn: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">No Button Text</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#F5F5F7] border-none rounded-2xl p-4 text-[#1D1D1F] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. No!"
                        value={dashboardData.customNoBtn}
                        onChange={(e) => setDashboardData({ ...dashboardData, customNoBtn: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">BG Color</label>
                      <input 
                        type="color" 
                        className="w-full h-12 bg-[#F5F5F7] border-none rounded-2xl outline-none cursor-pointer"
                        value={dashboardData.customBg}
                        onChange={(e) => setDashboardData({ ...dashboardData, customBg: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Text Color</label>
                      <input 
                        type="color" 
                        className="w-full h-12 bg-[#F5F5F7] border-none rounded-2xl outline-none cursor-pointer"
                        value={dashboardData.customText}
                        onChange={(e) => setDashboardData({ ...dashboardData, customText: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={generateLink}
              className="w-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold py-5 rounded-2xl mt-8 transition-all active:scale-95 shadow-lg shadow-blue-200"
            >
              Generate Custom Link
            </button>
          </div>
        </div>

        {/* Link Ready Popup */}
        {showLinkPopup && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
            <div className="bg-[#1C1C1E] text-white p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl">✓</span>
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-3">Your Secret is Ready!</h2>
                <p className="text-slate-400 font-medium mb-8">
                  "Hey, I'm testing a new app I built, can you check if this works on your phone?"
                </p>
                
                <div className="w-full bg-[#2C2C2E] p-4 rounded-2xl flex items-center gap-3 mb-6 group">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[#64D2FF] font-mono text-xs truncate">{generatedLink}</p>
                  </div>
                  <button 
                    onClick={() => {
                      copyToClipboard();
                      const btn = document.getElementById('copy-indicator');
                      if (btn) btn.innerText = 'Copied!';
                      setTimeout(() => { if (btn) btn.innerText = ''; }, 2000);
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <span className="text-xl">📋</span>
                  </button>
                </div>
                <div id="copy-indicator" className="text-emerald-400 text-xs font-bold h-4 mb-4"></div>

                <button 
                  onClick={() => setShowLinkPopup(false)}
                  className="text-slate-500 hover:text-white font-semibold transition-colors"
                >
                  Create another one
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tmpl === 'run') {
    if (runStep === 0) {
      return (
        <div className="h-screen w-screen bg-[#FFF0F5] flex flex-col items-center justify-center p-8 font-sans">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-sm w-full text-center border border-pink-100 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-center mb-6">
              <span className="text-[#FF1493] text-6xl">❤️</span>
            </div>
            <h2 className="text-4xl font-black text-[#FF1493] mb-4">
              Hey {params.to} ...
            </h2>
            <p className="text-slate-600 text-lg font-medium mb-10">
              I have something special to ask you.
            </p>
            <button 
              onClick={() => setRunStep(1)}
              className="w-full bg-[#FF1493] hover:bg-[#FF69B4] text-white font-bold py-5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-pink-200"
            >
              Next
            </button>
          </div>
        </div>
      );
    }

    if (runStep === 1) {
      return (
        <div className="h-screen w-screen bg-[#FFF0F5] flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-sm w-full text-center z-10 border border-pink-100 animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-10 leading-tight">
              Will you go on a date with <span className="text-[#FF1493] font-black">{params.from}</span> for <span className="text-[#FF1493] font-black">{params.plan}</span>?
            </h2>
            <div className="flex gap-4 justify-center relative h-16">
              <button 
                onClick={handleYes}
                className="bg-[#00C853] text-white px-10 py-4 rounded-2xl font-black text-lg shadow-lg shadow-emerald-100 active:scale-90 transition-transform"
              >
                YES!
              </button>
              <button 
                onMouseEnter={moveNo}
                onTouchStart={(e) => { e.preventDefault(); moveNo(); }}
                style={noPos ? { position: 'fixed', left: noPos.x, top: noPos.y, zIndex: 100 } : {}}
                className="bg-[#FF3B30] text-white px-10 py-4 rounded-2xl font-black text-lg shadow-lg shadow-red-100 transition-all duration-100"
              >
                NO
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (runStep === 2) {
      return (
        <div className="h-screen w-screen bg-[#FFF0F5] flex flex-col items-center justify-center p-8 font-sans">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-sm w-full text-center border border-pink-100 animate-in zoom-in duration-500">
            <div className="flex justify-center gap-2 mb-4">
              <span className="text-yellow-400 text-2xl">✨</span>
              <span className="text-[#FF1493] text-4xl">❤️</span>
              <span className="text-yellow-400 text-2xl">✨</span>
            </div>
            <h2 className="text-4xl font-black text-[#FF1493] italic mb-4">Checkmate!</h2>
            <p className="text-slate-600 font-medium mb-8">Let <span className="text-[#FF1493] font-bold">{params.from}</span> know you said yes!</p>
            <div className="bg-pink-50 p-4 rounded-2xl text-[#FF1493] text-sm font-bold">
              Screenshot this and send it to them! 📸
            </div>
          </div>
        </div>
      );
    }
  }

  if (tmpl === 'spotify') {
    const Player = ReactPlayer as any;
    return (
      <div className="h-screen w-screen bg-[#121212] text-white flex flex-col font-sans overflow-hidden">
        <div className="hidden">
          <Player 
            url={params.songUrl || "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
            playing={spotifyPlaying}
            loop
            volume={0.8}
            onProgress={(state: any) => {
              if (spotifyPlaying) setSpotifyProgress(state.played * 100);
            }}
          />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-[320px] aspect-square bg-[#282828] rounded-lg shadow-2xl mb-8 overflow-hidden animate-in fade-in zoom-in duration-700 relative">
            {isGeneratingImg ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">AI Generating Album Art...</p>
              </div>
            ) : null}
            <img src={generatedCoupleImg || params.img} className="w-full h-full object-cover" alt="Album Art" />
          </div>
          <div className="w-full max-w-[320px]">
            <h2 className="text-2xl font-bold mb-1 truncate">Date Night?</h2>
            <p className="text-slate-400 font-medium mb-8 truncate">Featuring {params.from} & {params.to}</p>
            
            <div className="w-full h-1 bg-white/10 rounded-full mb-2 relative overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-white transition-all duration-100" 
                style={{ width: `${spotifyProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-8">
              <span>0:{Math.floor(spotifyProgress * 1.8).toString().padStart(2, '0')}</span>
              <span>3:00</span>
            </div>
            
            <div className="flex items-center justify-center gap-8">
              <button className="text-slate-400 hover:text-white transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 4.82L17 14.67V9.33l-6.34 3.84c-.44.27-.44.91 0 1.18z"/></svg>
              </button>
              <button 
                onClick={() => {
                  const nextPlaying = !spotifyPlaying;
                  setSpotifyPlaying(nextPlaying);
                  if (spotifyProgress >= 99) {
                    confetti();
                    setSuccess({ title: "Added to Playlist!", msg: `Added to your calendar: ${params.time} @ ${params.location}` });
                  }
                }}
                className="w-16 h-16 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#1DB954]/20"
              >
                {spotifyPlaying && spotifyProgress < 99 ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="black"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button className="text-slate-400 hover:text-white transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82zM16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tmpl === 'wordle') {
    return (
      <div className="h-screen w-screen bg-white flex flex-col items-center font-sans">
        <header className="w-full border-b border-slate-200 p-4 flex items-center justify-between mb-12">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          <h1 className="text-3xl font-black tracking-tighter">Wordle</h1>
          <div className="flex gap-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
          </div>
        </header>
        
        <div className="grid grid-rows-6 gap-2 mb-8">
          {wordleGuesses.map((guess, i) => (
            <div key={i} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${TARGET_WORD.length}, minmax(0, 1fr))` }}>
              {Array.from({ length: TARGET_WORD.length }).map((_, j) => {
                const char = guess[j] || '';
                const isSubmitted = i < wordleCurrentRow || wordleStatus === 'won';
                const cellSize = TARGET_WORD.length > 7 ? 'w-10 h-10 text-xl' : TARGET_WORD.length > 5 ? 'w-12 h-12 text-2xl' : 'w-14 h-14 text-3xl';
                return (
                  <div 
                    key={j} 
                    className={`${cellSize} border-2 flex items-center justify-center font-bold uppercase transition-all duration-500 ${
                      isSubmitted 
                        ? 'bg-[#6aaa64] border-[#6aaa64] text-white animate-flip' 
                        : char ? 'border-slate-400 text-black scale-105' : 'border-slate-200 text-black'
                    }`}
                    style={{ transitionDelay: `${j * 100}ms` }}
                  >
                    {char}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="max-w-md w-full px-4 text-center text-slate-500 font-medium mb-8">
          {wordleStatus === 'playing' ? `Type anything to guess the ${TARGET_WORD.length}-letter word...` : "Splendid!"}
        </div>

        <div className="max-w-md w-full px-2">
          {[
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
          ].map((row, i) => (
            <div key={i} className="flex justify-center gap-1 mb-2">
              {row.map(key => (
                <button
                  key={key}
                  onClick={() => handleWordleInput(key)}
                  className={`h-14 rounded font-bold text-xs flex items-center justify-center transition-colors ${
                    key.length > 1 ? 'px-4 bg-slate-200' : 'w-10 bg-slate-200'
                  } active:bg-slate-300`}
                >
                  {key === 'BACKSPACE' ? '⌫' : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {showWordleContinue && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-in zoom-in duration-300">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-3xl font-black mb-2 italic">Amazing!</h2>
              <p className="text-slate-600 font-medium mb-8">
                You've solved the puzzle!
              </p>
              <button 
                onClick={() => {
                  setShowWordleContinue(false);
                  setShowWordleWin(true);
                }}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                PRESS CONTINUE
              </button>
            </div>
          </div>
        )}

        {showWordleWin && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-in zoom-in duration-300">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-black mb-2 italic">Splendid!</h2>
              <p className="text-slate-600 font-medium mb-8">
                You guessed it! The word was <span className="font-bold text-emerald-600">DATE?</span>
                <br /><br />
                How about a date on <span className="font-bold text-emerald-600">{params.day}</span>?
              </p>
              <button 
                onClick={() => setSuccess({ title: "It's a Date!", msg: `Date with me on ${params.day}!` })}
                className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all animate-bounce"
              >
                CLICK TO CONFIRM
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tmpl === 'custom') {
    return (
      <div 
        className="h-screen w-screen flex flex-col items-center justify-center p-8 text-center font-sans relative overflow-hidden"
        style={{ backgroundColor: params.customBg, color: params.customText }}
      >
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl font-black mb-12 leading-tight">{params.customMsg}</h1>
          <div className="flex flex-wrap justify-center gap-6">
            <button 
              onClick={() => {
                confetti();
                setSuccess({ title: "Confirmed!", msg: "Can't wait! ❤️" });
              }}
              className="px-12 py-4 rounded-full font-black text-xl shadow-2xl hover:scale-110 active:scale-95 transition-all"
              style={{ backgroundColor: params.customText, color: params.customBg }}
            >
              {params.customBtn}
            </button>
            <button 
              onMouseEnter={moveNo}
              onTouchStart={(e) => { e.preventDefault(); moveNo(); }}
              className="px-12 py-4 rounded-full font-black text-xl shadow-2xl transition-all border-2"
              style={{ 
                ...(noPos ? { position: 'fixed', left: noPos.x, top: noPos.y, zIndex: 100 } : {}),
                borderColor: params.customText, 
                color: params.customText 
              }}
            >
              {params.customNoBtn || 'No!'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tmpl === 'tinder') {
    return (
      <div className="h-screen w-screen bg-[#f5f7fa] flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
        <div className="w-full max-w-[380px] h-[600px] relative">
          {tinderStatus === 'swiping' ? (
            <div className="w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 relative">
              <img src={params.img} className="w-full h-3/4 object-cover" alt="Profile" />
              <div className="p-6 bg-gradient-to-t from-white via-white to-transparent">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-slate-900">{params.from}</h2>
                  <span className="text-xl text-blue-500">✓</span>
                </div>
                <p className="text-slate-500 text-sm font-medium mb-4">📍 1 mile away</p>
                <p className="text-slate-600 text-sm leading-relaxed">{params.bio}</p>
              </div>
              
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-6 z-30">
                <button 
                  onMouseEnter={moveNoTinder}
                  onTouchStart={(e) => { e.preventDefault(); moveNoTinder(); }}
                  style={noPosTinder ? { position: 'fixed', left: noPosTinder.x, top: noPosTinder.y, zIndex: 100 } : {}}
                  className="w-14 h-14 rounded-full border-4 border-red-100 flex items-center justify-center bg-white text-red-500 hover:scale-110 transition-all shadow-lg"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
                <button 
                  onClick={() => {
                    confetti();
                    setTinderStatus('match');
                  }}
                  className="w-14 h-14 rounded-full border-4 border-emerald-100 flex items-center justify-center bg-white text-emerald-500 hover:scale-110 transition-transform shadow-lg"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
              </div>
              
              {/* The actual draggable card overlay */}
              <div 
                id="tinder-card"
                className="absolute inset-0 z-20 transition-transform duration-300 cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const onMouseMove = (moveE: MouseEvent) => {
                    const diff = moveE.clientX - startX;
                    const card = document.getElementById('tinder-card');
                    if (card) {
                      if (diff < 0) {
                        // Resistance for left swipe
                        card.style.transform = `translateX(${diff * 0.2}px) rotate(${diff * 0.05}deg)`;
                      } else {
                        card.style.transform = `translateX(${diff}px) rotate(${diff * 0.05}deg)`;
                        if (diff > 150) {
                          setTinderStatus('match');
                          confetti();
                          document.removeEventListener('mousemove', onMouseMove);
                        }
                      }
                    }
                  };
                  const onMouseUp = () => {
                    const card = document.getElementById('tinder-card');
                    if (card && tinderStatus === 'swiping') {
                      card.style.transform = 'translateX(0) rotate(0)';
                    }
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
                onTouchStart={(e) => {
                  const startX = e.touches[0].clientX;
                  const onTouchMove = (moveE: TouchEvent) => {
                    const diff = moveE.touches[0].clientX - startX;
                    const card = document.getElementById('tinder-card');
                    if (card) {
                      if (diff < 0) {
                        card.style.transform = `translateX(${diff * 0.2}px) rotate(${diff * 0.05}deg)`;
                      } else {
                        card.style.transform = `translateX(${diff}px) rotate(${diff * 0.05}deg)`;
                        if (diff > 150) {
                          setTinderStatus('match');
                          confetti();
                          document.removeEventListener('touchmove', onTouchMove);
                        }
                      }
                    }
                  };
                  const onTouchEnd = () => {
                    const card = document.getElementById('tinder-card');
                    if (card && tinderStatus === 'swiping') {
                      card.style.transform = 'translateX(0) rotate(0)';
                    }
                    document.removeEventListener('touchmove', onTouchMove);
                    document.removeEventListener('touchend', onTouchEnd);
                  };
                  document.addEventListener('touchmove', onTouchMove);
                  document.addEventListener('touchend', onTouchEnd);
                }}
              ></div>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-500 to-orange-400 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 text-white text-center animate-in zoom-in duration-500">
              <h1 className="text-5xl font-black italic mb-8 drop-shadow-lg">It's a Match!</h1>
              <div className="flex gap-4 mb-12">
                <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden shadow-xl rotate-[-10deg]">
                  <img src={params.img} className="w-full h-full object-cover" alt="You" />
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden shadow-xl rotate-[10deg]">
                  {params.crushImg ? (
                    <img src={params.crushImg} className="w-full h-full object-cover" alt="Crush" />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 text-3xl font-bold">
                      {params.to[0]}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xl font-bold mb-8 leading-relaxed">
                You and {params.from} liked each other. <br/>
                <span className="opacity-80 font-medium text-base">Go on a date?</span>
              </p>
              <button 
                onClick={() => setSuccess({ title: "It's a Date!", msg: `Match confirmed with ${params.from}!` })}
                className="w-full bg-white text-pink-500 font-black py-4 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tmpl === 'package') {
    return (
      <div className="h-screen w-screen bg-slate-100 flex flex-col text-slate-900">
        <div className="bg-[#003399] text-white p-4 flex items-center justify-between shadow-lg">
          <div className="font-bold text-xl tracking-tight italic">FedEx Express</div>
          <div className="text-xs opacity-75 font-mono">ID: #8821934421</div>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-slate-200">
            <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold mb-4 ${isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isDelivered ? 'DELIVERED' : 'OUT FOR DELIVERY'}
            </div>
            <h2 className="text-lg font-bold mb-4">Scheduled Delivery</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Recipient</div>
                <div className="font-semibold">{params.to}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Driver</div>
                <div className="font-semibold">{params.from}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Item</div>
                <div className="font-semibold">One Special Date</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Est. Time</div>
                <div className="font-semibold">{params.time}</div>
              </div>
            </div>
          </div>

          {!isDelivered && (
            <>
              <div className="text-sm text-slate-500 mb-2">A signature is required to release this package.</div>
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl relative overflow-hidden">
                <canvas 
                  ref={sigCanvasRef}
                  onMouseDown={startSigning}
                  onMouseUp={() => setIsSigning(false)}
                  onMouseMove={handleSign}
                  onTouchStart={(e) => { e.preventDefault(); startSigning(e); }}
                  onTouchEnd={() => setIsSigning(false)}
                  onTouchMove={handleSign}
                  className="w-full h-[150px] touch-none"
                />
                <div className="absolute bottom-2 right-3 text-[10px] text-slate-300 pointer-events-none">Sign here</div>
              </div>
              <button 
                onClick={acceptDelivery}
                className="w-full bg-[#ff6600] hover:bg-[#e65c00] text-white font-bold py-4 rounded-xl mt-6 shadow-lg active:scale-95 transition-all"
              >
                Accept Delivery
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (tmpl === 'tarot') {
    return (
      <div className="h-screen w-screen bg-[#050510] text-white flex flex-col items-center justify-center p-8 font-serif relative overflow-hidden">
        {/* Starry Background */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: Math.random() }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2 + Math.random() * 3, repeat: Infinity }}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tarotStep === 'zodiac' && (
            <motion.div
              key="zodiac"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="z-10 text-center max-w-sm"
            >
              <h2 className="text-3xl font-light mb-8 tracking-widest uppercase">Select Your Sign</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { sign: '♈', name: 'Aries' },
                  { sign: '♉', name: 'Taurus' },
                  { sign: '♊', name: 'Gemini' },
                  { sign: '♋', name: 'Cancer' },
                  { sign: '♌', name: 'Leo' },
                  { sign: '♍', name: 'Virgo' },
                  { sign: '♎', name: 'Libra' },
                  { sign: '♏', name: 'Scorpio' },
                  { sign: '♐', name: 'Sagittarius' },
                  { sign: '♑', name: 'Capricorn' },
                  { sign: '♒', name: 'Aquarius' },
                  { sign: '♓', name: 'Pisces' }
                ].map(item => (
                  <button
                    key={item.name}
                    onClick={() => {
                      setTarotZodiac(item.sign);
                      setTarotStep('spinning');
                      setTimeout(() => setTarotStep('reading'), 3000);
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-white/20 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-2xl mb-1">{item.sign}</span>
                    <span className="text-[10px] uppercase tracking-tighter opacity-60">{item.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {tarotStep === 'spinning' && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="z-10 flex flex-col items-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 border-t-2 border-b-2 border-purple-500 rounded-full mb-8"
              />
              <p className="text-xl tracking-widest uppercase animate-pulse">Consulting the Stars...</p>
            </motion.div>
          )}

          {tarotStep === 'reading' && (
            <motion.div
              key="reading"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="z-10 flex flex-col items-center text-center max-w-sm"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-48 h-80 bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl border-2 border-pink-500/50 shadow-[0_0_50px_rgba(236,72,153,0.3)] flex flex-col items-center justify-center p-6 mb-8"
              >
                <div className="text-6xl mb-4">🔮</div>
                <h3 className="text-xl font-bold text-pink-500 mb-2 uppercase tracking-tighter">The Lovers</h3>
                <div className="w-full h-px bg-pink-500/30 mb-4" />
                <p className="text-sm italic text-slate-300">"A connection written in the constellations."</p>
              </motion.div>
              
              <p className="text-lg leading-relaxed mb-8">
                The cosmos have spoken. Venus is entering your house of romance. 
                If you do not get <span className="text-pink-500 font-bold">{params.tarotFood}</span> with <span className="text-pink-500 font-bold">{params.from}</span> on <span className="text-pink-500 font-bold">{params.day}</span>, you will have 7 years of bad hair days.
              </p>

              <button
                onClick={() => setSuccess({ title: "Destiny Awaits!", msg: `The stars have aligned for ${params.day}!` })}
                className="px-8 py-3 bg-pink-500 text-white font-bold rounded-full hover:scale-105 transition-transform shadow-lg shadow-pink-500/20"
              >
                ACCEPT YOUR FATE
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (tmpl === 'quiz') {
    const questions = [
      {
        q: params.quizQ1 || "What is the superior weekend activity?",
        options: [
          `Going to ${params.quizFood || 'your favorite spot'}`,
          "Staring at a wall"
        ]
      },
      {
        q: params.quizQ2 || "How would you describe your ideal date?",
        options: [
          `Anything with ${params.from}`,
          "Doing taxes"
        ]
      },
      {
        q: params.quizQ3 || "What is your biggest red flag?",
        options: [
          "Not saying yes to this date",
          "Being too perfect"
        ]
      }
    ];

    return (
      <div className="h-screen w-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-pink-500 p-6 text-white text-center">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Compatibility Quiz</h2>
            <p className="text-sm font-bold opacity-80">Are you a match with {params.from}?</p>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {quizLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-12"
                >
                  <div className="w-full h-4 bg-slate-100 rounded-full mb-4 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3 }}
                      className="h-full bg-pink-500"
                    />
                  </div>
                  <p className="text-slate-500 font-bold animate-pulse">ANALYZING RESULTS...</p>
                </motion.div>
              ) : quizStep < questions.length ? (
                <motion.div
                  key={quizStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-xs font-bold text-pink-500 mb-2 uppercase tracking-widest">Question {quizStep + 1} of 3</div>
                  <h3 className="text-xl font-bold text-slate-800 mb-8 leading-tight">{questions[quizStep].q}</h3>
                  <div className="space-y-4">
                    {questions[quizStep].options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (quizStep < questions.length - 1) {
                            setQuizStep(prev => prev + 1);
                          } else {
                            setQuizLoading(true);
                            setTimeout(() => {
                              setQuizLoading(false);
                              setQuizStep(3);
                            }, 3000);
                          }
                        }}
                        className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-pink-500 hover:bg-pink-50 text-left font-bold text-slate-700 transition-all"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="text-5xl mb-4">🚨</div>
                  <h3 className="text-2xl font-black text-red-500 mb-4 uppercase italic">SYSTEM ERROR</h3>
                  <p className="text-slate-600 font-medium mb-8 leading-relaxed">
                    You are a <span className="text-pink-500 font-black">100% match</span> with <span className="font-bold">{params.from}</span>. 
                    System requires an immediate date to resolve this.
                  </p>
                  <button
                    onClick={() => setSuccess({ title: "Match Found!", msg: `Compatibility confirmed with ${params.from}!` })}
                    className="w-full bg-pink-500 text-white font-black py-4 rounded-xl shadow-lg hover:scale-105 transition-transform"
                  >
                    RESOLVE ERROR
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  if (tmpl === 'captcha') {
    return (
      <div className="min-h-screen w-screen bg-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-[400px] border border-slate-200 shadow-lg">
          {/* Header Box */}
          <div className="bg-[#4a90e2] p-6 text-white">
            <div className="text-sm opacity-90 mb-1">Select all squares with</div>
            <div className="text-2xl font-black leading-tight mb-2">
              A 10/10 taking you to {params.plan}
            </div>
            <div className="text-[10px] opacity-80">
              If there are none, click skip (just kidding, you can't skip).
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200">
            {captchaGrid.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => toggleCaptcha(idx)}
                className={`relative aspect-square cursor-pointer transition-transform duration-100 overflow-hidden ${captchaSelected.includes(idx) ? 'scale-90' : 'scale-100'}`}
              >
                {item.type === 'img' ? (
                  <img src={item.content} className="w-full h-full object-cover" alt="captcha" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-4xl">
                    {item.content}
                  </div>
                )}
                {captchaSelected.includes(idx) && (
                  <div className="absolute inset-0 border-4 border-[#4a90e2] flex items-start justify-start p-1">
                    <div className="bg-[#4a90e2] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                      ✓
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 flex justify-between items-center border-t border-slate-100">
            <div className="flex gap-4 opacity-40">
              <div className="w-5 h-5 border-2 border-slate-400 rounded-sm" />
              <div className="w-5 h-5 border-2 border-slate-400 rounded-full" />
            </div>
            <button 
              onClick={verifyCaptcha}
              className="bg-[#4a90e2] hover:bg-[#357abd] text-white font-bold py-2 px-6 rounded-sm text-sm transition-colors"
            >
              VERIFY
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
