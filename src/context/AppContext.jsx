import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();
const STORAGE_KEY = 'prep-platform-progress-v1';
const SUBJECT_KEY = 'prep-platform-active-subject';
const LEGACY_PROGRESS_KEY = 'matanaliz-progress';

const SUBJECTS = [
  { id: 'matanaliz', name: 'Матанализ', file: 'questions.json' },
  { id: 'probstat', name: 'Теория вероятности и матстатистика', file: 'probstat.json' }
];

const defaultProgress = { viewed: [], starred: [], known: [], lastIndex: 0 };

export const AppProvider = ({ children }) => {
  const [catalog, setCatalog] = useState({ questions: [], topics: [], total: 0 });
  const [activeSubject, setActiveSubject] = useState(() => {
    const savedSubject = localStorage.getItem(SUBJECT_KEY);
    if (savedSubject === 'probability' || savedSubject === 'statistics') {
      return 'probstat';
    }
    return SUBJECTS.some(s => s.id === savedSubject) ? savedSubject : SUBJECTS[0].id;
  });
  const [progressBySubject, setProgressBySubject] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }

    // Backward compatibility with old single-subject progress
    const legacy = localStorage.getItem(LEGACY_PROGRESS_KEY);
    if (legacy) {
      try {
        return { matanaliz: { ...defaultProgress, ...JSON.parse(legacy) } };
      } catch (e) {
        return {};
      }
    }

    return {};
  });
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('study');
  const progress = { ...defaultProgress, ...(progressBySubject[activeSubject] || {}) };

  useEffect(() => {
    const currentSubject = SUBJECTS.find(s => s.id === activeSubject) || SUBJECTS[0];
    setLoading(true);
    fetch(`/data/${currentSubject.file}`)
      .then(res => res.json())
      .then(data => {
        setCatalog(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load catalog", err);
        // Fallback for non-standard environments
        fetch(`data/${currentSubject.file}`)
          .then(res => res.json())
          .then(setCatalog)
          .finally(() => setLoading(false));
      });
  }, [activeSubject]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progressBySubject));
  }, [progressBySubject]);

  useEffect(() => {
    localStorage.setItem(SUBJECT_KEY, activeSubject);
  }, [activeSubject]);

  const updateCurrentProgress = (updater) => {
    setProgressBySubject(prev => {
      const current = { ...defaultProgress, ...(prev[activeSubject] || {}) };
      return {
        ...prev,
        [activeSubject]: updater(current)
      };
    });
  };

  const toggleStar = (id) => {
    updateCurrentProgress(prev => ({
      ...prev,
      starred: prev.starred.includes(id)
        ? prev.starred.filter(i => i !== id)
        : [...prev.starred, id]
    }));
  };

  const toggleKnown = (id) => {
    updateCurrentProgress(prev => ({
      ...prev,
      known: prev.known.includes(id)
        ? prev.known.filter(i => i !== id)
        : [...prev.known, id]
    }));
  };

  const markViewed = (id) => {
    if (!progress.viewed.includes(id)) {
      updateCurrentProgress(prev => ({ ...prev, viewed: [...prev.viewed, id] }));
    }
  };

  const setLastIndex = (id) => {
    updateCurrentProgress(prev => ({ ...prev, lastIndex: id }));
  };

  return (
    <AppContext.Provider value={{
      catalog,
      progress,
      loading,
      currentView,
      setCurrentView,
      toggleStar,
      toggleKnown,
      markViewed,
      setLastIndex,
      subjects: SUBJECTS,
      activeSubject,
      setActiveSubject
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
