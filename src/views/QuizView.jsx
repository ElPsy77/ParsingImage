import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, ArrowRight, RotateCcw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
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
    } else {
      setIsFinished(true);
    }
  };

  useEffect(() => {
    if (window.MathJax) {
      setIsTypesetting(true);
      window.MathJax.typesetPromise()
        .catch(err => console.error(err))
        .finally(() => setIsTypesetting(false));
    }
  }, [currentIndex, isFinished, isActive]);

  useEffect(() => {
    if (selectedOption !== null && window.MathJax) {
      setIsTypesetting(true);
      window.MathJax.typesetPromise()
        .catch(err => console.error(err))
        .finally(() => setIsTypesetting(false));
    }
  }, [selectedOption]);

  const renderMarkdown = (text) => {
    if (!text) return '';
    return { __html: marked.parse(text) };
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
              onChange={(e) => setCount(Math.max(5, Math.min(445, e.target.value)))}
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
        <div className={styles.imageWrap}>
          <img src={q.image} alt="Вопрос" />
        </div>
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
                  dangerouslySetInnerHTML={{ __html: opt }}
                />
              );
            })}
          </div>

          <AnimatePresence>
            {selectedOption !== null && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className={styles.footer}>
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
