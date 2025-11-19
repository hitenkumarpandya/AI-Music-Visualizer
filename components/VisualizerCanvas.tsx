
import React, { useRef, useEffect } from 'react';

interface VisualizerCanvasProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  colors: string[];
  videoTitle: string;
  image: HTMLImageElement | null;
}

function drawTitle(ctx: CanvasRenderingContext2D, text: string, width: number, height: number) {
  if (!text.trim()) return;

  const fontSize = Math.max(24, Math.min(width * 0.05, 80));
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  
  const x = width / 2;
  // Position at bottom with padding
  const y = height - (fontSize * 2);

  ctx.fillText(text, x, y);
}


export default function VisualizerCanvas({ analyserNode, isPlaying, colors, videoTitle, image }: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const barLengthsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    
    const draw = () => {
      analyserNode.getByteFrequencyData(dataArray);

      const parent = canvas.parentElement;
      if(parent){
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
      
      const { width, height } = canvas;
      const [backgroundColor, ...barColors] = colors;

      ctx.fillStyle = backgroundColor || '#000000';
      ctx.fillRect(0, 0, width, height);
      
      if(barColors.length === 0) barColors.push('#8A2BE2', '#FFFFFF');

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.2;
      const maxBarLength = Math.min(width, height) * 0.35;

      // Draw Image in the center
      if (image) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        
        // Maintain aspect ratio
        const imgAspectRatio = image.width / image.height;
        const circleDiameter = radius * 2;
        let drawWidth = circleDiameter;
        let drawHeight = circleDiameter;
        
        if (imgAspectRatio > 1) { // Landscape image
            drawHeight = circleDiameter / imgAspectRatio;
        } else { // Portrait or square image
            drawWidth = circleDiameter * imgAspectRatio;
        }
        
        const drawX = cx - drawWidth / 2;
        const drawY = cy - drawHeight / 2;
        
        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
      }

      // Draw circular visualizer bars
      const NUM_BARS = 128;
      const colorCount = barColors.length;

      const newBarLengths: number[] = [];
      for (let i = 0; i < NUM_BARS; i++) {
        // Sample bass/mid frequencies for a better visual effect
        const dataIndex = Math.floor((i / NUM_BARS) * (analyserNode.frequencyBinCount * 0.5));
        const targetLength = (dataArray[dataIndex] / 255) * maxBarLength;
        const oldLength = barLengthsRef.current[i] || 0;
        
        // Rise quickly, fall slowly
        const newLength = targetLength >= oldLength 
          ? targetLength 
          : Math.max(targetLength, oldLength - (maxBarLength * 0.025)); // Slower decay
        newBarLengths[i] = newLength;

        // Rotate by -90 degrees to start from the top
        const angle = (i / NUM_BARS) * 2 * Math.PI - (Math.PI / 2);
        
        const startX = cx + radius * Math.cos(angle);
        const startY = cy + radius * Math.sin(angle);
        const endX = cx + (radius + newLength) * Math.cos(angle);
        const endY = cy + (radius + newLength) * Math.sin(angle);
        
        ctx.strokeStyle = barColors[i % colorCount];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      barLengthsRef.current = newBarLengths;
      
      drawTitle(ctx, videoTitle, width, height);
      
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    };

    // Draw one static frame when paused or initially loaded
    draw(); 

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(draw);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, analyserNode, colors, videoTitle, image]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
