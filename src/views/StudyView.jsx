import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Star, CheckCircle, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import styles from './StudyView.module.scss';

const StudyView = () => {
  const { catalog, progress, toggleStar, toggleKnown, markViewed, setLastIndex } = useApp();
  const [topicFilter, setTopicFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTypesetting, setIsTypesetting] = useState(false);

  // Apply filters
  const filteredQuestions = catalog.questions.filter(q => {
    const topicMatch = topicFilter === 'all' || q.topicId === topicFilter;
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'unviewed' && !progress.viewed.includes(q.id)) ||
      (statusFilter === 'starred' && progress.starred.includes(q.id)) ||
      (statusFilter === 'known' && progress.known.includes(q.id));
    return topicMatch && statusMatch;
  });

  const currentQuestion = filteredQuestions[currentIndex];

  useEffect(() => {
    if (currentQuestion) {
      markViewed(currentQuestion.id);
      setLastIndex(currentQuestion.id);
    }
  }, [currentQuestion]);

  const handleNext = () => setCurrentIndex(prev => (prev + 1) % filteredQuestions.length);
  const handlePrev = () => setCurrentIndex(prev => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);

  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    setSelectedOption(null);
    if (window.MathJax) {
      setIsTypesetting(true);
      window.MathJax.typesetPromise()
        .catch(err => console.error(err))
        .finally(() => setIsTypesetting(false));
    }
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (selectedOption !== null && window.MathJax) {
      setIsTypesetting(true);
      window.MathJax.typesetPromise()
        .catch(err => console.error(err))
        .finally(() => setIsTypesetting(false));
    }
  }, [selectedOption]);

  if (!currentQuestion) {
    return <div className={styles.empty}>Вопросы не найдены с текущими фильтрами.</div>;
  }

  const renderMarkdown = (text) => {
    if (!text) return '';
    return { __html: marked.parse(text) };
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.filters}>
          <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className={styles.select}>
            {catalog.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.select}>
            <option value="all">Все</option>
            <option value="unviewed">Новые</option>
            <option value="starred">Избранное</option>
            <option value="known">Знаю</option>
          </select>
        </div>
        <div className={styles.jumpWrapper}>
          <span className={styles.jumpLabel}>Перейти к №:</span>
          <input 
            type="number" 
            className={styles.jump} 
            placeholder="№" 
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const id = parseInt(e.target.value);
                const idx = filteredQuestions.findIndex(q => q.id === id);
                if (idx >= 0) setCurrentIndex(idx);
              }
            }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.article 
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className={styles.card}
        >
          <div className={styles.cardHeader}>
            <span className={styles.badge}>
              <Hash size={14} /> {currentQuestion.id} • {catalog.topics.find(t => t.id === currentQuestion.topicId)?.name}
            </span>
            <div className={styles.actions}>
              <button 
                onClick={() => toggleStar(currentQuestion.id)} 
                className={`${styles.actionBtn} ${progress.starred.includes(currentQuestion.id) ? styles.starred : ''}`}
              >
                <Star size={20} fill={progress.starred.includes(currentQuestion.id) ? "currentColor" : "none"} />
              </button>
              <button 
                onClick={() => toggleKnown(currentQuestion.id)} 
                className={`${styles.actionBtn} ${progress.known.includes(currentQuestion.id) ? styles.known : ''}`}
              >
                <CheckCircle size={20} />
              </button>
            </div>
          </div>

          <div className={styles.imageWrap}>
            <img src={currentQuestion.image} alt="Вопрос" />
          </div>

          <div className={`${styles.content} ${isTypesetting ? styles.typesetting : ''}`}>
            {currentQuestion.questionText && (
              <div className={styles.questionText} dangerouslySetInnerHTML={renderMarkdown(currentQuestion.questionText)} />
            )}
            
            <div className={styles.options}>
              {currentQuestion.options.map((opt, idx) => {
                const isCorrect = idx === currentQuestion.correctOptionIndex;
                const isSelected = selectedOption === idx;
                let btnClass = styles.option;
                if (selectedOption !== null) {
                  if (isCorrect) btnClass += ` ${styles.correct}`;
                  else if (isSelected) btnClass += ` ${styles.wrong}`;
                }

                return (
                  <button 
                    key={idx} 
                    className={btnClass}
                    disabled={selectedOption !== null}
                    onClick={() => setSelectedOption(idx)}
                    dangerouslySetInnerHTML={{ __html: opt }}
                  />
                );
              })}
            </div>

            {selectedOption !== null && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.explanation}
              >
                <h3>💡 Разбор решения</h3>
                <div className={styles.markdownBody} dangerouslySetInnerHTML={renderMarkdown(currentQuestion.explanation)} />
              </motion.div>
            )}
          </div>

          <div className={styles.cardNav}>
            <button onClick={handlePrev} className={styles.cardNavBtn}>
              <ChevronLeft size={18} /> <span>Предыдущий</span>
            </button>
            <span className={styles.cardNavIndex}>
              <strong>{currentIndex + 1}</strong> из {filteredQuestions.length}
            </span>
            <button onClick={handleNext} className={styles.cardNavBtn}>
              <span>Следующий</span> <ChevronRight size={18} />
            </button>
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  );
};

export default StudyView;
