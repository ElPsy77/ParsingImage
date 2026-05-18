import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [catalog, setCatalog] = useState({ questions: [], topics: [], total: 0 });
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('matanaliz-progress');
    return saved ? JSON.parse(saved) : { viewed: [], starred: [], known: [], lastIndex: 0 };
  });
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('study');

  useEffect(() => {
    fetch('/data/questions.json')
      .then(res => res.json())
      .then(data => {
        setCatalog(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load catalog", err);
        // Fallback for non-standard environments
        fetch('data/questions.json')
          .then(res => res.json())
          .then(setCatalog)
          .finally(() => setLoading(false));
      });
  }, []);

  useEffect(() => {
    localStorage.setItem('matanaliz-progress', JSON.stringify(progress));
  }, [progress]);

  const toggleStar = (id) => {
    setProgress(prev => ({
      ...prev,
      starred: prev.starred.includes(id) 
        ? prev.starred.filter(i => i !== id) 
        : [...prev.starred, id]
    }));
  };

  const toggleKnown = (id) => {
    setProgress(prev => ({
      ...prev,
      known: prev.known.includes(id) 
        ? prev.known.filter(i => i !== id) 
        : [...prev.known, id]
    }));
  };

  const markViewed = (id) => {
    if (!progress.viewed.includes(id)) {
      setProgress(prev => ({ ...prev, viewed: [...prev.viewed, id] }));
    }
  };

  const setLastIndex = (id) => {
    setProgress(prev => ({ ...prev, lastIndex: id }));
  };

  return (
    <AppContext.Provider value={{
      catalog, progress, loading, currentView, 
      setCurrentView, toggleStar, toggleKnown, markViewed, setLastIndex
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
