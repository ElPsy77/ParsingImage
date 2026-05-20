import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, ArrowRight, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import { AI_PROVIDERS, askAi, buildAiPrompt } from '../utils/aiAssist';
import styles from './QuizView.module.scss';

const QuizView = () => {
  const { catalog, markViewed } = useApp();
  const [isActive, setIsActive] = useState(false);
  const [quizQueue, setQuizQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [count, setCount] = useState(10);
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

  const startQuiz = () => {
    const shuffled = [...catalog.questions].sort(() => 0.5 - Math.random());
    setQuizQueue(shuffled.slice(0, count));
    setCurrentIndex(0);
    setScore(0);
    setIsActive(true);
    setIsFinished(false);
    setSelectedOption(null);
  };

  const handleOptionSelect = (idx) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    const q = quizQueue[currentIndex];
    if (idx === q.correctOptionIndex) setScore(s => s + 1);
    markViewed(q.id);
  };

  const handleNext = () => {
    if (currentIndex + 1 < quizQueue.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setAiNotice(null);
    } else {
      setIsFinished(true);
    }
  };

  useEffect(() => {
    setAiNotice(null);
  }, [selectedAi]);

  useEffect(() => {
    scheduleTypeset();
  }, [currentIndex, isFinished, isActive]);

  useEffect(() => {
    if (selectedOption !== null) {
      scheduleTypeset();
    }
  }, [selectedOption]);

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

  if (isFinished) {
    const percentage = Math.round((score / quizQueue.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={styles.result}>
        <Trophy size={64} className={styles.icon} />
        <h2>Тест завершен!</h2>
        <div className={styles.scoreBoard}>
          <div className={styles.scoreItem}>
            <span>Результат:</span>
            <strong>{score} / {quizQueue.length}</strong>
          </div>
          <div className={styles.scoreItem}>
            <span>Точность:</span>
            <strong>{percentage}%</strong>
          </div>
        </div>
        <button onClick={() => setIsActive(false)} className={styles.restartBtn}>
          Вернуться к настройкам
        </button>
      </motion.div>
    );
  }

  if (!isActive) {
    return (
      <div className={styles.setup}>
        <div className={styles.setupCard}>
          <Trophy size={48} color="var(--accent)" />
          <h2>Режим тренировки</h2>
          <p>Случайная выборка вопросов для проверки знаний.</p>
          
          <div className={styles.field}>
            <label>Количество вопросов:</label>
            <input 
              type="number" 
              value={count} 
              onChange={(e) => setCount(Math.max(5, Math.min(catalog.questions.length || 5, Number(e.target.value) || 5)))}
              className={styles.input}
            />
          </div>

          <button onClick={startQuiz} className={styles.startBtn}>
            Начать тест
          </button>
        </div>
      </div>
    );
  }

  const q = quizQueue[currentIndex];

  return (
    <div className={styles.container}>
      <div className={styles.progress}>
        <div className={styles.progressText}>
          Вопрос {currentIndex + 1} из {quizQueue.length}
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.fill} 
            style={{ width: `${((currentIndex + 1) / quizQueue.length) * 100}%` }}
          />
        </div>
      </div>

      <article className={styles.card}>
        {q.image && (
          <div className={styles.imageWrap}>
            <img src={q.image} alt="Вопрос" />
          </div>
        )}
        <div className={`${styles.body} ${isTypesetting ? styles.typesetting : ''}`}>
          {q.questionText && <div className={styles.questionText} dangerouslySetInnerHTML={renderMarkdown(q.questionText)} />}
          
          <div className={styles.options}>
            {q.options.map((opt, idx) => {
              let btnClass = styles.option;
              if (selectedOption !== null) {
                if (idx === q.correctOptionIndex) btnClass += ` ${styles.correct}`;
                else if (selectedOption === idx) btnClass += ` ${styles.wrong}`;
              }
              return (
                <button 
                  key={idx} 
                  className={btnClass}
                  onClick={() => handleOptionSelect(idx)}
                  disabled={selectedOption !== null}
                >
                  {typeof opt === 'string' ? opt : String(opt ?? '')}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {selectedOption !== null && q.explanation && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className={styles.footer}>
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
                      const topicName = catalog.topics.find(t => t.id === q.topicId)?.name || '';
                      const prompt = buildAiPrompt(q, topicName);
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
                <div className={styles.explanation} dangerouslySetInnerHTML={renderMarkdown(q.explanation)} />
                <button onClick={handleNext} className={styles.nextBtn}>
                  Далее <ArrowRight size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </article>

      <button onClick={() => setIsActive(false)} className={styles.cancelBtn}>
        Прервать тест
      </button>
    </div>
  );
};

export default QuizView;
