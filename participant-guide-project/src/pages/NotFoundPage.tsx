import React, { useEffect } from 'react';
import { NotFound } from '../components/NotFound';

export const NotFoundPage: React.FC = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = '404 — Page Not Found | VidaCare';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return <NotFound />;
};
