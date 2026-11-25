import React, { useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#0F1E3D] via-[#091328] to-[#050A14] p-6 text-center ${className}`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-teal-400/25 bg-teal-400/10 text-teal-300">
          <HeartHandshake className="h-6 w-6" aria-hidden="true" />
        </div>
        {fallbackTitle && (
          <p className="max-w-[220px] text-xs font-medium text-slate-300">
            {fallbackTitle}
          </p>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
