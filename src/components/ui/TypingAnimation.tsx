'use client';

import { useState, useEffect } from 'react';

interface TypingAnimationProps {
  text: string;
  speed?: number;
  pauseDuration?: number;
  onComplete?: () => void;
  className?: string;
}

export default function TypingAnimation({
  text,
  speed = 50,
  pauseDuration = 800,
  onComplete,
  className = ''
}: TypingAnimationProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isComplete) return;
    
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, [isComplete]);

  useEffect(() => {
    if (currentIndex >= text.length) {
      setIsComplete(true);
      setShowCursor(false);
      onComplete?.();
      return;
    }

    if (isPaused) {
      const pauseTimeout = setTimeout(() => {
        setIsPaused(false);
      }, pauseDuration);

      return () => clearTimeout(pauseTimeout);
    }

    const timeout = setTimeout(() => {
      const char = text[currentIndex];
      setDisplayText(prev => prev + char);
      setCurrentIndex(prev => prev + 1);

      if (char === '.' || char === '?' || char === ',') {
        setIsPaused(true);
      }
    }, speed + Math.random() * speed * 0.5); // Add 0-50% random variation to speed

    return () => clearTimeout(timeout);
  }, [currentIndex, text, speed, pauseDuration, isPaused, onComplete]);

  // Convert \n to <br> tags
  const formattedText = text.replace(/\n/g, '<br>');
  const formattedDisplayText = displayText.replace(/\n/g, '<br>');

  return (
    <span className={className}>
      <span className="invisible" dangerouslySetInnerHTML={{ __html: formattedText }}></span>
      <span className="absolute inset-0">
        <span dangerouslySetInnerHTML={{ __html: formattedDisplayText }}></span>
        <span className={`inline-block w-[8px] h-[1em] bg-current ml-[2px] align-text-bottom ${!isComplete && showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}></span>
      </span>
    </span>
  );
}