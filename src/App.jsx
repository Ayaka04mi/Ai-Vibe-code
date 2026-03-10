import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Download, Sparkles, ArrowLeft, Home, Loader2, CheckCircle2 } from 'lucide-react';

// --- Configuration & Constants ---
// ⚠️ สำคัญ: ถ้ารันบนเครื่องตัวเอง (Local) ให้ไปขอ API Key ฟรีจาก Google มาใส่ในช่องว่างด้านล่างนี้
// เช่น const apiKey = "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const apiKey = "AIzaSyDFO0SklHKuWLdyPsMGY-_FThkciRVEpd0";
const ANIME_STYLES = [
  { id: 'gachiakuta', name: 'Gachiakuta', color: 'bg-orange-500', desc: 'ลายเส้นดิบเถื่อน เส้นหนา กราฟฟิตี้' },
  { id: 'jujutsu_kaisen', name: 'Jujutsu Kaisen', color: 'bg-blue-600', desc: 'ลายเส้นคม ดาร์กแฟนตาซี' },
  { id: 'demon_slayer', name: 'Demon Slayer', color: 'bg-green-500', desc: 'ลายเส้นพริ้วไหว สีสันฉูดฉาด' },
  { id: 'my_hero_academia', name: 'My Hero Academia', color: 'bg-yellow-400', desc: 'สไตล์คอมมิคซุปเปอร์ฮีโร่' },
  { id: 'studio_ghibli', name: 'Studio Ghibli', color: 'bg-teal-500', desc: 'ละมุน อบอุ่น โทนสีน้ำ' }
];
export default function App() {
  // --- State Management ---
  // view: 'home' | 'create' | 'result'
  const [view, setView] = useState('home');
  // gallery: เก็บภาพที่เคยสร้างไว้ในเซสชันนี้
  const [gallery, setGallery] = useState([]);

  // Create State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(ANIME_STYLES[0].id);
  const [isDragging, setIsDragging] = useState(false);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  // --- Helpers ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    } else {
      setErrorMsg('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้นครับ');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMsg('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64Data(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const resetCreateState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setBase64Data(null);
    setGeneratedImage(null);
    setErrorMsg('');
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `anime-vibe-${selectedStyle}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- AI Generation Logic ---
  const generateAnimeImage = async () => {
    if (!base64Data) return;
    setIsGenerating(true);
    setErrorMsg('');

    try {
      // Extract mime type and base64 data without the prefix
      const mimeType = base64Data.split(';')[0].split(':')[1];
      const base64String = base64Data.split(',')[1];

      const styleName = ANIME_STYLES.find(s => s.id === selectedStyle)?.name;

      // เปลี่ยนคำสั่ง: ให้ Gemini ทำการ "วิเคราะห์ภาพ" และแต่ง Prompt แทนที่จะสั่งให้วาดตรงๆ
      const analyzePrompt = `Analyze this uploaded photo carefully (subject, pose, expression, clothing, and background). Then, write a highly detailed text-to-image prompt in English to recreate this exact subject and scene, but strictly transformed into the ${styleName} anime art style. Emphasize the specific eye shapes, line weight, shading, and colors typical of ${styleName}. Reply ONLY with the English prompt, no other text.`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: analyzePrompt },
              { inlineData: { mimeType: mimeType, data: base64String } }
            ]
          }
        ]
      };

      // ขั้นตอนที่ 1: ให้ Gemini 2.0 Flash วิเคราะห์ภาพและแต่ง Prompt ภาษาอังกฤษ
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("API Error Response:", errText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const generatedPrompt = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedPrompt) {
        throw new Error("AI ไม่สามารถวิเคราะห์รูปภาพได้ กรุณาลองใหม่อีกครั้ง");
      }

      console.log("AI Generated Prompt:", generatedPrompt); // แอบดูคำสั่งที่ AI คิดให้ใน Console ได้ครับ

      // ขั้นตอนที่ 2: นำ Prompt ที่ Gemini คิดให้ ไปสั่งวาดภาพด้วยระบบ Pollinations API (API วาดภาพฟรี)
      const encodedPrompt = encodeURIComponent(generatedPrompt + ", masterpiece, best quality, highly detailed anime illustration");
      const seed = Math.floor(Math.random() * 1000000); // สุ่ม seed เพื่อให้ได้ภาพใหม่ไม่ซ้ำเดิม
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&nologo=true&seed=${seed}`;

      // โหลดภาพมาเก็บไว้ในเครื่องเพื่อแสดงผลและเตรียมดาวน์โหลด
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error("เซิร์ฟเวอร์วาดภาพขัดข้อง กรุณาลองใหม่");
      }

      const imageBlob = await imageResponse.blob();
      const finalImageUrl = URL.createObjectURL(imageBlob);

      setGeneratedImage(finalImageUrl);

      // Save to gallery
      setGallery(prev => [{
        id: Date.now().toString(),
        original: previewUrl,
        generated: finalImageUrl,
        style: styleName
      }, ...prev]);

      setView('result');

    } catch (error) {
      console.error("Generation Error:", error);
      setErrorMsg('เกิดข้อผิดพลาดในการสร้างภาพ: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Views ---
  const renderHome = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10 mt-8">
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 mb-4">
          เปลี่ยนภาพถ่ายให้เป็นอนิเมะ
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto text-lg">
          ใช้พลังของ AI วิเคราะห์และแปลงโฉมรูปภาพของคุณให้อยู่ในลายเส้นเรื่องโปรดได้อย่างง่ายดาย
        </p>

        <button
          onClick={() => { resetCreateState(); setView('create'); }}
          className="mt-8 group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-gradient-to-r from-purple-600 to-pink-500 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
          สร้างภาพอนิเมะใหม่
        </button>
      </div>

      <div className="mt-16">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <ImageIcon className="w-6 h-6 mr-2 text-purple-500" />
          ผลงานล่าสุดของคุณ
        </h3>

        {gallery.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
            <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 text-lg">ยังไม่มีผลงานในตอนนี้ ลองสร้างภาพแรกของคุณดูสิ!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {gallery.map((item) => (
              <div key={item.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="aspect-square overflow-hidden relative">
                  <img src={item.generated} alt="Generated Anime" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <span className="text-white font-medium bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm w-max">
                      {item.style}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <button
        onClick={() => setView('home')}
        className="flex items-center text-gray-600 hover:text-purple-600 transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-5 h-5 mr-1" /> กลับหน้าแรก
      </button>

      <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">เริ่มสร้างสรรค์ผลงาน</h2>

        {/* Upload Area */}
        <div className="mb-10">
          <label className="block text-sm font-semibold text-gray-700 mb-3">1. อัปโหลดรูปภาพของคุณ</label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !previewUrl && fileInputRef.current?.click()}
            className={`relative border-3 border-dashed rounded-3xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden min-h-[300px]
              ${isDragging ? 'border-purple-500 bg-purple-50 scale-[1.02]' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-purple-400'}
              ${previewUrl ? 'cursor-default' : 'cursor-pointer'}
            `}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img src={previewUrl} alt="Preview" className="max-h-[300px] rounded-xl shadow-md object-contain" />
                {!isGenerating && (
                  <button
                    onClick={(e) => { e.stopPropagation(); resetCreateState(); }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white p-2 rounded-full backdrop-blur-md transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                  <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">ลากและวางรูปภาพที่นี่</h3>
                <p className="text-gray-500">หรือคลิกเพื่อเลือกไฟล์ (JPG, PNG)</p>
              </>
            )}
          </div>
        </div>

        {/* Style Selection */}
        <div className="mb-10">
          <label className="block text-sm font-semibold text-gray-700 mb-3">2. เลือกลายเส้นอนิเมะ</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ANIME_STYLES.map((style) => (
              <div
                key={style.id}
                onClick={() => !isGenerating && setSelectedStyle(style.id)}
                className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2
                  ${selectedStyle === style.id
                    ? `border-${style.color.split('-')[1]}-500 bg-${style.color.split('-')[1]}-50 shadow-md transform scale-[1.02]`
                    : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}
                  ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {selectedStyle === style.id && (
                  <div className={`absolute top-3 right-3 text-${style.color.split('-')[1]}-600`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                <div className={`w-10 h-10 rounded-full ${style.color} mb-3 flex items-center justify-center text-white shadow-sm`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-800 text-lg">{style.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{style.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium text-center">
            {errorMsg}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={generateAnimeImage}
          disabled={!previewUrl || isGenerating}
          className={`w-full py-4 rounded-2xl font-bold text-lg text-white flex items-center justify-center transition-all duration-300 shadow-lg
            ${!previewUrl
              ? 'bg-gray-300 cursor-not-allowed shadow-none'
              : isGenerating
                ? 'bg-purple-400 cursor-wait'
                : 'bg-gradient-to-r from-purple-600 to-pink-500 hover:shadow-purple-500/30 hover:scale-[1.01]'}
          `}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              AI กำลังประมวลผลและวาดภาพ... (อาจใช้เวลาสักครู่)
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6 mr-2" />
              สร้างภาพอนิเมะ
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mr-3" />
          สร้างภาพสำเร็จ!
        </h2>
        <button
          onClick={() => setView('home')}
          className="flex items-center text-gray-600 hover:text-purple-600 transition-colors font-medium bg-white px-4 py-2 rounded-full shadow-sm"
        >
          <Home className="w-4 h-4 mr-2" /> กลับหน้าแรก
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8 bg-white p-6 md:p-10 rounded-[2rem] shadow-xl border border-gray-100">
        {/* Original */}
        <div className="space-y-3">
          <div className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
            รูปภาพต้นฉบับ
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center aspect-[4/5] md:aspect-square">
            <img src={previewUrl} alt="Original" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Result */}
        <div className="space-y-3">
          <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium border border-purple-200 flex items-center w-max">
            <Sparkles className="w-3 h-3 mr-1" />
            ลายเส้น: {ANIME_STYLES.find(s => s.id === selectedStyle)?.name}
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl ring-4 ring-purple-50 flex items-center justify-center aspect-[4/5] md:aspect-square relative group">
            <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />

            {/* Overlay for quick download */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
              <button
                onClick={downloadImage}
                className="bg-white text-gray-900 px-6 py-3 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center hover:bg-gray-50"
              >
                <Download className="w-5 h-5 mr-2" /> ดาวน์โหลด
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={downloadImage}
          className="flex items-center justify-center px-8 py-4 bg-gray-900 text-white rounded-full font-bold hover:bg-gray-800 transition-colors shadow-lg"
        >
          <Download className="w-5 h-5 mr-2" />
          บันทึกรูปลงเครื่อง
        </button>
        <button
          onClick={() => { resetCreateState(); setView('create'); }}
          className="flex items-center justify-center px-8 py-4 bg-white text-purple-600 border-2 border-purple-100 rounded-full font-bold hover:bg-purple-50 transition-colors shadow-sm"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          สร้างภาพใหม่อีกครั้ง
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans text-gray-900 selection:bg-purple-200 selection:text-purple-900 pb-20">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div
              className="flex items-center cursor-pointer group"
              onClick={() => setView('home')}
            >
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-8 h-8 rounded-lg flex items-center justify-center mr-3 shadow-md group-hover:rotate-12 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-gray-800">
                Anime<span className="text-purple-600">Vibe</span>
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {view === 'home' && renderHome()}
        {view === 'create' && renderCreate()}
        {view === 'result' && renderResult()}
      </main>
    </div>
  );
}