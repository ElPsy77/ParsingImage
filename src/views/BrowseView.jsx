import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Filter, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './BrowseView.module.scss';

const BrowseView = () => {
  const { catalog, progress, setCurrentView, setLastIndex } = useApp();
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return catalog.questions.filter(q => {
      const s = search.toLowerCase();
      const searchMatch = !search || String(q.id).includes(s) || (q.questionText && q.questionText.toLowerCase().includes(s));
      const topicMatch = topicFilter === 'all' || q.topicId === topicFilter;
      const statusMatch = statusFilter === 'all' || 
        (statusFilter === 'unviewed' && !progress.viewed.includes(q.id)) ||
        (statusFilter === 'starred' && progress.starred.includes(q.id)) ||
        (statusFilter === 'known' && progress.known.includes(q.id));
      
      return searchMatch && topicMatch && statusMatch;
    });
  }, [catalog.questions, search, topicFilter, statusFilter, progress]);

  const handleOpen = (id) => {
    setLastIndex(id);
    setCurrentView('study');
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Поиск по тексту или номеру..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.search}
          />
        </div>
        <div className={styles.filters}>
          <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className={styles.select}>
            {catalog.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.select}>
            <option value="all">Все статусы</option>
            <option value="unviewed">Новые</option>
            <option value="starred">Избранное</option>
            <option value="known">Знаю</option>
          </select>
        </div>
      </div>

      <div className={styles.grid}>
        {filtered.map((q, idx) => (
          <motion.div 
            key={q.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.02 }}
            className={`${styles.item} ${progress.known.includes(q.id) ? styles.known : ''}`}
            onClick={() => handleOpen(q.id)}
          >
            <div className={styles.preview}>
              <img src={q.image} alt="" loading="lazy" />
            </div>
            <div className={styles.info}>
              <div className={styles.infoHead}>
                <span className={styles.id}>#{q.id}</span>
                <span className={styles.topic}>{catalog.topics.find(t => t.id === q.topicId)?.name}</span>
              </div>
              <p className={styles.text}>{q.questionText || 'Вопрос на изображении'}</p>
            </div>
            <div className={styles.overlay}>
              <ExternalLink size={24} />
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.empty}>Ничего не найдено</div>
      )}
    </div>
  );
};

export default BrowseView;
