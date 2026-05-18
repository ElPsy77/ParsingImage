import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { BookOpen, FolderSearch, Trophy, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './App.module.scss';

// Views
import StudyView from './views/StudyView';
import BrowseView from './views/BrowseView';
import QuizView from './views/QuizView';

const App = () => {
  const { currentView, setCurrentView, loading } = useApp();
  const [theme, setTheme] = useState(() => localStorage.getItem('matanaliz-theme') || 'light');

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('matanaliz-theme', next);
  };

  if (loading) {
    return (
      <div className={styles.loader}>
        <div className={styles.spinner}></div>
        <p>Загрузка базы знаний...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>Матан — база</h1>
        </div>
        <button onClick={toggleTheme} className={styles.themeToggle}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      <main className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentView === 'study' && <StudyView />}
            {currentView === 'browse' && <BrowseView />}
            {currentView === 'quiz' && <QuizView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className={styles.bottomNav}>
        <button 
          className={currentView === 'study' ? styles.active : ''} 
          onClick={() => setCurrentView('study')}
        >
          <BookOpen size={24} />
          <span>Учебник</span>
        </button>
        <button 
          className={currentView === 'browse' ? styles.active : ''} 
          onClick={() => setCurrentView('browse')}
        >
          <FolderSearch size={24} />
          <span>Каталог</span>
        </button>
        <button 
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
