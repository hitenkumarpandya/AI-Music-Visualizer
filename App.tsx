
import React, { useState, useRef, useCallback } from 'react';
import { generateColorPalette, generateTitle } from './services/geminiService';
import FileUpload from './components/FileUpload';
import VisualizerCanvas from './components/VisualizerCanvas';
import ControlsPanel from './components/ControlsPanel';
import type { AspectRatio } from './types';

const RESOLUTIONS: Record<AspectRatio, { width: number, height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
};

function drawTitle(ctx: CanvasRenderingContext2D, text: string, width: number, height: number) {
  if (!text.trim()) return;

  const fontSize = Math.max(24, Math.min(width * 0.05, 80));
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  
  const x = width / 2;
  // Position at bottom with padding relative to font size
  const y = height - (fontSize * 2);

  ctx.fillText(text, x, y);
}


export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [colors, setColors] = useState<string[]>(['#000000', '#8A2BE2', '#FFFFFF']);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [videoTitle, setVideoTitle] = useState('');
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  const setupAudioContext = useCallback(() => {
    if (!audioRef.current) return;
    if (!audioContextRef.current) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const source = audioContext.createMediaElementSource(audioRef.current);
      
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    if (isPlaying) {
      handlePlayPause();
    }
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setFileUrl(url);
    setError(null);
  };

  const handleImageSelect = (imageFile: File) => {
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      URL.revokeObjectURL(url); // Clean up object URL after loading
    };
    img.onerror = () => {
      setError("Failed to load image file.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handlePlayPause = () => {
    if (!audioContextRef.current) {
        setupAudioContext();
    }
    
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleGeneratePalette = async (prompt: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const palette = await generateColorPalette(prompt);
      if(palette.length < 2) {
        throw new Error("AI did not return a valid palette. Please try a different prompt.")
      }
      setColors(palette);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate palette.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTitle = async (prompt: string) => {
    setIsGeneratingTitle(true);
    setError(null);
    try {
      const title = await generateTitle(prompt);
      setVideoTitle(title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate title.');
      console.error(err);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleDownload = () => {
    if (isDownloading || !file || !analyserRef.current || !audioContextRef.current || !sourceRef.current || !audioRef.current) return;
    
    setIsDownloading(true);
    setError(null);
    
    const { width, height } = RESOLUTIONS[aspectRatio];

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) {
        setIsDownloading(false);
        return;
    };

    let offscreenBarLengths: number[] = [];

    const audioCtx = audioContextRef.current;
    const source = sourceRef.current;
    const analyser = analyserRef.current;
    const audioEl = audioRef.current;

    // Create a destination node for the media recorder
    const audioDestination = audioCtx.createMediaStreamDestination();
    source.connect(audioDestination);
    
    const canvasStream = offscreenCanvas.captureStream(30);
    const audioStream = audioDestination.stream;
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);

    // Prefer VP9 for better quality, fallback if necessary
    let options = { mimeType: 'video/webm; codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
    }

    mediaRecorderRef.current = new MediaRecorder(combinedStream, options);
    recordingChunksRef.current = [];
    
    const recorder = mediaRecorderRef.current;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordingChunksRef.current.push(event.data);
      }
    };

    const stopRecording = () => {
        if (recorder && recorder.state === 'recording') {
            recorder.stop();
        }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.split('.')[0]}_visualizer.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Cleanup
      source.disconnect(audioDestination);
      
      // Reconnect to speakers if needed (we disconnect below to prevent double audio)
      try {
        analyser.connect(audioCtx.destination);
      } catch(e) {
         // Already connected or error, ignore
      }

      audioEl.removeEventListener('ended', stopRecording);
      setIsDownloading(false);
      setIsPlaying(false);
    };

    recorder.onerror = () => {
        setError("An error occurred during video creation.");
        stopRecording();
    };

    audioEl.addEventListener('ended', stopRecording, { once: true });

    const drawOffscreen = () => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        return;
      }
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      const [backgroundColor, ...barColors] = colors;
      offscreenCtx.fillStyle = backgroundColor;
      offscreenCtx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.2;
      const maxBarLength = Math.min(width, height) * 0.35;

      if (image) {
        offscreenCtx.save();
        offscreenCtx.beginPath();
        offscreenCtx.arc(cx, cy, radius, 0, Math.PI * 2);
        offscreenCtx.clip();
        const imgAspectRatio = image.width / image.height;
        const circleDiameter = radius * 2;
        let drawWidth = circleDiameter;
        let drawHeight = circleDiameter;
        if (imgAspectRatio > 1) drawHeight = circleDiameter / imgAspectRatio;
        else drawWidth = circleDiameter * imgAspectRatio;
        offscreenCtx.drawImage(image, cx - drawWidth / 2, cy - drawHeight / 2, drawWidth, drawHeight);
        offscreenCtx.restore();
      }

      const NUM_BARS = 128;
      const colorCount = barColors.length;

      const newBarLengths: number[] = [];
      for (let i = 0; i < NUM_BARS; i++) {
        const dataIndex = Math.floor((i / NUM_BARS) * (analyser.frequencyBinCount * 0.5));
        const targetLength = (dataArray[dataIndex] / 255) * maxBarLength;
        const oldLength = offscreenBarLengths[i] || 0;

        const newLength = targetLength >= oldLength
          ? targetLength
          : Math.max(targetLength, oldLength - maxBarLength * 0.025);
        newBarLengths[i] = newLength;

        const angle = (i / NUM_BARS) * 2 * Math.PI - Math.PI / 2;
        
        const startX = cx + radius * Math.cos(angle);
        const startY = cy + radius * Math.sin(angle);
        const endX = cx + (radius + newLength) * Math.cos(angle);
        const endY = cy + (radius + newLength) * Math.sin(angle);
        
        offscreenCtx.strokeStyle = barColors[i % colorCount];
        offscreenCtx.lineWidth = 4;
        offscreenCtx.beginPath();
        offscreenCtx.moveTo(startX, startY);
        offscreenCtx.lineTo(endX, endY);
        offscreenCtx.stroke();
      }
      offscreenBarLengths = newBarLengths;
      
      drawTitle(offscreenCtx, videoTitle, width, height);

      requestAnimationFrame(drawOffscreen);
    };
    
    // Disconnect analyser from speakers for the recording duration 
    // to prevent loud audio/feedback, but keep source flowing to analyser and recorder.
    try {
        analyser.disconnect(audioCtx.destination);
    } catch (e) {
        // Ignore if not connected
    }

    // Record at normal speed (1x) for correct audio/video sync
    audioEl.muted = false; 
    audioEl.playbackRate = 1.0;
    audioEl.currentTime = 0;
    
    audioEl.play().then(() => {
      recorder.start();
      drawOffscreen();
      setIsPlaying(true);
    }).catch(err => {
      console.error("Error starting playback for download:", err);
      setError("Could not start playback for recording.");
      setIsDownloading(false);
      // Attempt cleanup
      try { analyser.connect(audioCtx.destination); } catch(e){}
    });
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-fuchsia-500 mb-2">
            AI Music Visualizer
          </h1>
          <p className="text-slate-400">Upload your audio, generate a unique vibe, and download the result.</p>
        </header>
        
        <main className="bg-slate-800/50 rounded-2xl shadow-2xl shadow-black/20 p-4 md:p-6 border border-slate-700">
          {!file ? (
            <FileUpload onFileSelect={handleFileSelect} />
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 flex flex-col gap-4">
                 <div 
                    className="w-full bg-black rounded-lg overflow-hidden transition-all duration-300"
                    style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                  >
                    <VisualizerCanvas 
                      analyserNode={analyserRef.current} 
                      isPlaying={isPlaying} 
                      colors={colors}
                      videoTitle={videoTitle}
                      image={image}
                    />
                  </div>
                  {file && <p className="text-center text-slate-400 truncate">Now playing: {file.name}</p>}
              </div>

              <ControlsPanel
                isPlaying={isPlaying}
                isDownloading={isDownloading}
                isGenerating={isGenerating}
                isGeneratingTitle={isGeneratingTitle}
                aspectRatio={aspectRatio}
                videoTitle={videoTitle}
                onPlayPause={handlePlayPause}
                onGeneratePalette={handleGeneratePalette}
                onGenerateTitle={handleGenerateTitle}
                onAspectRatioChange={setAspectRatio}
                onDownload={handleDownload}
                onVideoTitleChange={setVideoTitle}
                onImageSelect={handleImageSelect}
                onNewFile={() => {
                  setFile(null);
                  setFileUrl(null);
                  setIsPlaying(false);
                  setImage(null);
                }}
              />
            </div>
          )}
          {error && <div className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</div>}
        </main>
      </div>
      {fileUrl && <audio ref={audioRef} src={fileUrl} onEnded={() => setIsPlaying(false)} crossOrigin="anonymous" />}
    </div>
  );
}
