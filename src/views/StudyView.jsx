import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Star, CheckCircle, Hash, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import { AI_PROVIDERS, askAi, buildAiPrompt } from '../utils/aiAssist';
import styles from './StudyView.module.scss';

const StudyView = () => {
  const { catalog, progress, toggleStar, toggleKnown, markViewed, setLastIndex } = useApp();
  const [topicFilter, setTopicFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (progress.lastIndex && catalog.questions.length > 0) {
      const idx = catalog.questions.findIndex(q => q.id === progress.lastIndex);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });
  const [isTypesetting, setIsTypesetting] = useState(false);
  const [selectedAi, setSelectedAi] = useState('chatgpt');
  const [aiNotice, setAiNotice] = useState(null);
  
  const scheduleTypeset = (attempt = 0) => {
    if (!window.MathJax) {
      if (attempt < 10) {
        setTimeout(() => scheduleTypeset(attempt + 1), 120);
      }
      return;
    }

    setIsTypesetting(true);
    window.MathJax.typesetPromise()
      .catch(err => console.error(err))
      .finally(() => setIsTypesetting(false));
  };

  // Apply filters
  const filteredQuestions = React.useMemo(() => {
    return catalog.questions.filter(q => {
      const topicMatch = topicFilter === 'all' || q.topicId === topicFilter;
      const statusMatch = statusFilter === 'all' || 
        (statusFilter === 'unviewed' && !progress.viewed.includes(q.id)) ||
        (statusFilter === 'starred' && progress.starred.includes(q.id)) ||
        (statusFilter === 'known' && progress.known.includes(q.id));
      return topicMatch && statusMatch;
    });
  }, [catalog.questions, topicFilter, statusFilter, progress.viewed, progress.starred, progress.known]);

  const currentQuestion = filteredQuestions[currentIndex];

  // Sync currentIndex with filteredQuestions and progress.lastIndex
  useEffect(() => {
    if (filteredQuestions.length === 0) {
      if (currentIndex !== 0) setCurrentIndex(0);
      return;
    }

    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(0);
      return;
    }

    // Try to find the last viewed question in the current filtered list
    if (progress.lastIndex) {
      const qAtCurrent = filteredQuestions[currentIndex];
      if (!qAtCurrent || qAtCurrent.id !== progress.lastIndex) {
        const idxByLast = filteredQuestions.findIndex(q => q.id === progress.lastIndex);
        if (idxByLast >= 0) {
          setCurrentIndex(idxByLast);
        }
      }
    }
  }, [filteredQuestions, progress.lastIndex]);

  // Mark viewed and update lastIndex - separate from navigation logic
  useEffect(() => {
    if (currentQuestion?.id) {
      // Avoid automatic marking if it would cause the question to disappear immediately (loop)
      if (statusFilter !== 'unviewed') {
        markViewed(currentQuestion.id);
      }
      
      if (progress.lastIndex !== currentQuestion.id) {
        setLastIndex(currentQuestion.id);
      }
    }
  }, [currentQuestion?.id, statusFilter]);

  const handleNext = () => setCurrentIndex(prev => (prev + 1) % filteredQuestions.length);
  const handlePrev = () => setCurrentIndex(prev => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);

  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    setSelectedOption(null);
    setAiNotice(null);
    // Wait for card transition + handle delayed MathJax script load
    const timer = setTimeout(() => scheduleTypeset(), 300);
    return () => clearTimeout(timer);
  }, [currentQuestion?.id]);

  useEffect(() => {
    setAiNotice(null);
  }, [selectedAi]);

  useEffect(() => {
    if (selectedOption !== null) {
      scheduleTypeset();
    }
  }, [selectedOption]);

  if (!currentQuestion) {
    return <div className={styles.empty}>Вопросы не найдены с текущими фильтрами.</div>;
  }

  const renderMarkdown = (text) => {
    const safeText = typeof text === 'string' ? text : String(text ?? '');
    if (!safeText) return { __html: '' };
    const escaped = safeText
      .replace(/\\\(/g, '\\\\(')
      .replace(/\\\)/g, '\\\\)')
      .replace(/\\\[/g, '\\\\[')
      .replace(/\\\]/g, '\\\\]');
    const html = marked.parse(escaped);
    return { __html: typeof html === 'string' ? html : '' };
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

          {currentQuestion.image && (
            <div className={styles.imageWrap}>
              <img src={currentQuestion.image} alt="Вопрос" />
            </div>
          )}

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
                  >
                    {typeof opt === 'string' ? opt : String(opt ?? '')}
                  </button>
                );
              })}
            </div>

            {selectedOption !== null && currentQuestion.explanation && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.explanation}
              >
                <h3>💡 Разбор решения</h3>
                <div className={styles.aiTools}>
                  <select
                    value={selectedAi}
                    onChange={(e) => setSelectedAi(e.target.value)}
                    className={styles.aiSelect}
                  >
                    {AI_PROVIDERS.map(provider => (
                      <option key={provider.id} value={provider.id}>{provider.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.aiButton}
                    onClick={async () => {
                      const topicName = catalog.topics.find(t => t.id === currentQuestion.topicId)?.name || '';
                      const prompt = buildAiPrompt(currentQuestion, topicName);
                      const result = await askAi({ providerId: selectedAi, prompt });
                      setAiNotice(result);
                    }}
                  >
                    <Bot size={16} />
                    <span>Спросить у ИИ</span>
                  </button>
                </div>
                {aiNotice && (
                  <div className={styles.aiNotice}>
                    <span>
                      {aiNotice.copied
                        ? 'Промпт скопирован. Вставьте в чат (Cmd/Ctrl + V).'
                        : 'Не удалось скопировать автоматически. Скопируйте промпт вручную.'}
                    </span>
                    <button
                      type="button"
                      className={styles.aiOpenButton}
                      onClick={() => window.open(aiNotice.url, '_blank', 'noopener,noreferrer')}
                    >
                      Открыть {aiNotice.providerLabel}
                    </button>
                  </div>
                )}
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
