
import React, { useState, useRef } from 'react';
import type { AspectRatio } from '../types';
import { PlayIcon, PauseIcon, MagicWandIcon, DownloadIcon, UploadIcon, ImageIcon } from './Icons';

interface ControlsPanelProps {
  isPlaying: boolean;
  isDownloading: boolean;
  isGenerating: boolean;
  isGeneratingTitle: boolean;
  aspectRatio: AspectRatio;
  videoTitle: string;
  onPlayPause: () => void;
  onGeneratePalette: (prompt: string) => void;
  onGenerateTitle: (prompt: string) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onDownload: () => void;
  onVideoTitleChange: (title: string) => void;
  onImageSelect: (file: File) => void;
  onNewFile: () => void;
}

export default function ControlsPanel({
  isPlaying,
  isDownloading,
  isGenerating,
  isGeneratingTitle,
  aspectRatio,
  videoTitle,
  onPlayPause,
  onGeneratePalette,
  onGenerateTitle,
  onAspectRatioChange,
  onDownload,
  onVideoTitleChange,
  onImageSelect,
  onNewFile
}: ControlsPanelProps) {
  const [prompt, setPrompt] = useState('Cyberpunk synthwave');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isAnyGenerating = isGenerating || isGeneratingTitle;

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt && !isAnyGenerating) {
      onGeneratePalette(prompt);
    }
  };

  const handleTitleGenClick = () => {
    if (prompt && !isAnyGenerating) {
      onGenerateTitle(prompt);
    }
  };
  
  const handleImageUploadClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    } else if (file) {
      alert('Please select a valid image file (PNG, JPG, etc).');
    }
  };

  return (
    <div className="w-full lg:w-96 bg-slate-900/70 p-6 rounded-xl border border-slate-700 flex flex-col gap-6">
      
      {/* Playback Control */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onPlayPause}
          disabled={isDownloading}
          className="w-20 h-20 rounded-full bg-sky-500 text-white flex items-center justify-center disabled:bg-slate-600 hover:bg-sky-400 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-sky-500/30"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon className="w-10 h-10" /> : <PlayIcon className="w-10 h-10 pl-1" />}
        </button>
      </div>

      {/* AI Palette Generator */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-300">Generate Vibe with AI</h3>
        <form onSubmit={handlePromptSubmit} className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Calm forest morning"
            className="flex-grow bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow"
          />
          <button 
            type="submit" 
            disabled={isAnyGenerating} 
            className="p-2 bg-fuchsia-600 rounded-md hover:bg-fuchsia-500 disabled:bg-slate-600 transition-colors flex items-center justify-center"
            aria-label="Generate Palette"
          >
            {isGenerating ? 
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> :
              <MagicWandIcon className="w-5 h-5" />
            }
          </button>
        </form>
      </div>

      {/* Custom Image */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-300">Custom Image</h3>
        <input type="file" ref={imageInputRef} onChange={handleImageFileChange} className="hidden" accept="image/*" />
        <button
          onClick={handleImageUploadClick}
          disabled={isDownloading}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          <ImageIcon className="w-5 h-5"/>
          Upload Image
        </button>
      </div>

       {/* Title Input */}
       <div className="space-y-3">
        <h3 className="font-semibold text-slate-300">Video Title</h3>
        <div className="flex gap-2">
          <input
              type="text"
              value={videoTitle}
              onChange={(e) => onVideoTitleChange(e.target.value)}
              placeholder="Add title or generate with AI..."
              disabled={isDownloading}
              className="flex-grow bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow disabled:opacity-50"
            />
          <button
            type="button"
            onClick={handleTitleGenClick}
            disabled={isAnyGenerating}
            className="p-2 bg-fuchsia-600 rounded-md hover:bg-fuchsia-500 disabled:bg-slate-600 transition-colors flex items-center justify-center"
            aria-label="Generate Title with AI"
          >
            {isGeneratingTitle ?
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> :
              <MagicWandIcon className="w-5 h-5" />
            }
          </button>
        </div>
      </div>

      {/* Download Settings */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-300">Download Options</h3>
        <div className="grid grid-cols-2 gap-2">
          {(['16:9', '9:16'] as AspectRatio[]).map((ratio) => (
            <button
              key={ratio}
              onClick={() => onAspectRatioChange(ratio)}
              disabled={isDownloading}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                aspectRatio === ratio
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-700">
        <button 
          onClick={onDownload}
          disabled={isDownloading}
          className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
            isDownloading 
              ? 'bg-slate-600 cursor-not-allowed animate-pulse' 
              : 'bg-green-600 hover:bg-green-500 text-white'
          }`}
        >
          <DownloadIcon className="w-5 h-5"/>
          {isDownloading ? 'Downloading Video...' : 'Download Video'}
        </button>

         <button 
          onClick={onNewFile}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          <UploadIcon className="w-5 h-5"/>
          Upload New File
        </button>
      </div>
    </div>
  );
}
