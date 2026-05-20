import React, { useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import { BookOpen, FolderSearch, Trophy, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './App.module.scss';

// Views
import StudyView from './views/StudyView';
import BrowseView from './views/BrowseView';
import QuizView from './views/QuizView';

const App = () => {
  const { currentView, setCurrentView, loading, subjects, activeSubject, setActiveSubject } = useApp();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('matanaliz-theme');
    if (saved === 'light' || saved === 'dark') return saved;

    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('matanaliz-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>Prep Platform</h1>
          <select
            value={activeSubject}
            onChange={(e) => setActiveSubject(e.target.value)}
            className={styles.subjectSelect}
          >
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>
        <button onClick={toggleTheme} className={styles.themeToggle}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loader}>
            <div className={styles.spinner}></div>
            <p>Загрузка базы знаний...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'study' && <StudyView />}
              {currentView === 'browse' && <BrowseView />}
              {currentView === 'quiz' && <QuizView />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <nav className={styles.bottomNav}>
        <button 
          type="button"
          className={currentView === 'study' ? styles.active : ''} 
          onClick={() => setCurrentView('study')}
        >
          <BookOpen size={24} />
          <span>Учебник</span>
        </button>
        <button 
          type="button"
          className={currentView === 'browse' ? styles.active : ''} 
          onClick={() => setCurrentView('browse')}
        >
          <FolderSearch size={24} />
          <span>Каталог</span>
        </button>
        <button 
          type="button"
          className={currentView === 'quiz' ? styles.active : ''} 
          onClick={() => setCurrentView('quiz')}
        >
          <Trophy size={24} />
          <span>Тесты</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
