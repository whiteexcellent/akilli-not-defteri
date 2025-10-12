import React, { useState, useEffect } from 'react';
import { Search, Plus, Moon, Sun, Link2, Trash2, Edit2, Copy, Download, Upload, Lock, Unlock, X, Check, TrendingUp, ExternalLink, Sparkles, Cloud, CloudOff } from 'lucide-react';

// Firebase yapılandırması - KENDİ BİLGİLERİNİZLE DEĞİŞTİRİN
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDZB_8rf6-R02_4Popkt-APSNdT2-s2UTo",
  authDomain: "akilli-not-defteri-ea627.firebaseapp.com",
  projectId: "akilli-not-defteri-ea627",
  storageBucket: "akilli-not-defteri-ea627.firebasestorage.app",
  messagingSenderId: "628676298507",
  appId: "G-5BEDBY1KYQ"
};

const SmartNotebook = () => {
  const [notes, setNotes] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', tags: '' });
  const [showStats, setShowStats] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [lockedNotes, setLockedNotes] = useState({});
  const [cloudSync, setCloudSync] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'syncing', 'synced', 'error'

  // Firebase'den notları yükle
  useEffect(() => {
    loadNotesFromFirebase();
    loadFromLocalStorage();
  }, []);

  // Firebase'e kaydet
  useEffect(() => {
    if (notes.length > 0 && cloudSync) {
      saveNotesToFirebase();
    }
    saveToLocalStorage();
  }, [notes, darkMode, cloudSync]);

  const loadFromLocalStorage = () => {
    try {
      const savedNotes = localStorage.getItem('smartNotes');
      const savedTheme = localStorage.getItem('darkMode');
      const savedLocked = localStorage.getItem('lockedNotes');
      
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedTheme) setDarkMode(JSON.parse(savedTheme));
      if (savedLocked) setLockedNotes(JSON.parse(savedLocked));
    } catch (error) {
      console.error('LocalStorage yükleme hatası:', error);
    }
  };

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem('smartNotes', JSON.stringify(notes));
      localStorage.setItem('darkMode', JSON.stringify(darkMode));
      localStorage.setItem('lockedNotes', JSON.stringify(lockedNotes));
    } catch (error) {
      console.error('LocalStorage kaydetme hatası:', error);
    }
  };

  const loadNotesFromFirebase = async () => {
    if (!cloudSync) return;
    
    try {
      setSyncStatus('syncing');
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/notes`,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.documents) {
          const loadedNotes = data.documents.map(doc => {
            const fields = doc.fields;
            return {
              id: fields.id?.stringValue || '',
              title: fields.title?.stringValue || '',
              content: fields.content?.stringValue || '',
              tags: fields.tags?.arrayValue?.values?.map(v => v.stringValue) || [],
              date: fields.date?.stringValue || new Date().toISOString(),
              shareId: fields.shareId?.stringValue || '',
              urls: fields.urls?.arrayValue?.values?.map(v => v.stringValue) || [],
              hasURL: fields.hasURL?.booleanValue || false
            };
          });
          setNotes(loadedNotes);
        }
        setSyncStatus('synced');
      }
    } catch (error) {
      console.error('Firebase yükleme hatası:', error);
      setSyncStatus('error');
    }
  };

  const saveNotesToFirebase = async () => {
    if (!cloudSync) return;
    
    try {
      setSyncStatus('syncing');
      
      for (const note of notes) {
        const firestoreDoc = {
          fields: {
            id: { stringValue: note.id },
            title: { stringValue: note.title },
            content: { stringValue: note.content },
            tags: { 
              arrayValue: { 
                values: note.tags.map(tag => ({ stringValue: tag }))
              }
            },
            date: { stringValue: note.date },
            shareId: { stringValue: note.shareId },
            urls: {
              arrayValue: {
                values: note.urls.map(url => ({ stringValue: url }))
              }
            },
            hasURL: { booleanValue: note.hasURL }
          }
        };

        await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/notes/${note.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(firestoreDoc)
          }
        );
      }
      
      setSyncStatus('synced');
    } catch (error) {
      console.error('Firebase kaydetme hatası:', error);
      setSyncStatus('error');
    }
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const detectURL = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const extractDomain = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  const extractTags = (text) => {
    const tagRegex = /#(\w+)/g;
    const matches = text.match(tagRegex);
    return matches ? matches.map(tag => tag.slice(1)) : [];
  };

  const addNote = () => {
    if (!newNote.content.trim()) return;
    
    const urls = detectURL(newNote.content);
    const note = {
      id: generateId(),
      title: newNote.title || newNote.content.split('\n')[0].slice(0, 50),
      content: newNote.content,
      tags: extractTags(newNote.content + ' ' + newNote.tags),
      date: new Date().toISOString(),
      shareId: generateId(),
      urls: urls,
      hasURL: urls.length > 0
    };
    
    setNotes([note, ...notes]);
    setNewNote({ title: '', content: '', tags: '' });
    setIsAdding(false);
  };

  const updateNote = () => {
    const urls = detectURL(editingNote.content);
    setNotes(notes.map(n => n.id === editingNote.id ? {
      ...editingNote,
      tags: extractTags(editingNote.content + ' ' + editingNote.tags),
      urls: urls,
      hasURL: urls.length > 0
    } : n));
    setEditingNote(null);
  };

  const deleteNote = async (id) => {
    setNotes(notes.filter(n => n.id !== id));
    const newLocked = { ...lockedNotes };
    delete newLocked[id];
    setLockedNotes(newLocked);

    // Firebase'den sil
    if (cloudSync) {
      try {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/notes/${id}`,
          { method: 'DELETE' }
        );
      } catch (error) {
        console.error('Firebase silme hatası:', error);
      }
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareNote = (note) => {
    const shareUrl = window.location.origin + '/note/' + note.shareId;
    copyToClipboard(shareUrl, note.id);
  };

  const exportNotes = () => {
    const dataStr = JSON.stringify(notes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'notlar-' + new Date().toISOString().split('T')[0] + '.json';
    link.click();
  };

  const importNotes = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        setNotes([...imported, ...notes]);
      } catch (error) {
        alert('Dosya okunamadı!');
      }
    };
    reader.readAsText(file);
  };

  const toggleLock = (id) => {
    if (lockedNotes[id]) {
      const password = prompt('Şifre girin:');
      if (password === lockedNotes[id]) {
        const newLocked = { ...lockedNotes };
        delete newLocked[id];
        setLockedNotes(newLocked);
      } else {
        alert('Yanlış şifre!');
      }
    } else {
      const password = prompt('Not için şifre belirleyin:');
      if (password) {
        setLockedNotes({ ...lockedNotes, [id]: password });
      }
    }
  };

  const filteredNotes = notes.filter(note => {
    if (lockedNotes[note.id]) return false;
    const query = searchQuery.toLowerCase();
    return note.title.toLowerCase().includes(query) ||
           note.content.toLowerCase().includes(query) ||
           note.tags.some(tag => tag.toLowerCase().includes(query));
  });

  const stats = {
    total: notes.length,
    withLinks: notes.filter(n => n.hasURL).length,
    tags: [...new Set(notes.flatMap(n => n.tags))].slice(0, 5),
    locked: Object.keys(lockedNotes).length
  };

  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  const NoteCard = ({ note }) => {
    const urls = note.urls || [];
    let cleanText = note.content;
    urls.forEach(url => {
      cleanText = cleanText.replace(url, '');
    });
    
    return (
      <div className={'group relative overflow-hidden rounded-2xl transition-all duration-500 shadow-lg hover:scale-[1.02] ' + (darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-850 hover:from-gray-750 hover:to-gray-800 border border-gray-700/50' : 'bg-gradient-to-br from-white to-gray-50 hover:shadow-2xl border border-gray-200/50')}>
        <div className={'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ' + (darkMode ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10' : 'bg-gradient-to-r from-indigo-100/20 via-purple-100/20 to-pink-100/20')} />
        
        <div className="relative p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className={'font-bold text-xl mb-2 line-clamp-2 leading-tight ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                {note.title}
              </h3>
              {urls.length > 0 && (
                <div className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ' + (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')}>
                  <Link2 size={12} />
                  {urls.length} Bağlantı
                </div>
              )}
            </div>
            <div className={'p-2 rounded-xl ' + (darkMode ? 'bg-gray-700/50' : 'bg-gray-100')}>
              <Sparkles size={18} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
            </div>
          </div>
          
          <div className={'mb-4 text-sm leading-relaxed space-y-2 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>
            <div className="line-clamp-3" dangerouslySetInnerHTML={{ __html: formatText(cleanText) }} />
          </div>

          {urls.length > 0 && (
            <div className={'mb-4 p-3 rounded-xl space-y-2 ' + (darkMode ? 'bg-gray-700/30 border border-gray-600/30' : 'bg-gray-50 border border-gray-200')}>
              {urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={'flex items-center gap-2 p-2 rounded-lg transition-all hover:scale-[1.02] group/link ' + (darkMode ? 'hover:bg-gray-600/50 text-blue-400 hover:text-blue-300' : 'hover:bg-white text-blue-600 hover:text-blue-700')}
                >
                  <div className={'p-1.5 rounded-lg group-hover/link:scale-110 transition-transform ' + (darkMode ? 'bg-blue-500/20' : 'bg-blue-100')}>
                    <ExternalLink size={14} />
                  </div>
                  <span className="flex-1 text-xs font-medium truncate">
                    {extractDomain(url)}
                  </span>
                  <div className={'text-xs ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>↗</div>
                </a>
              ))}
            </div>
          )}
          
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className={'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ' + (darkMode ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200')}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          <div className={'text-xs mb-4 flex items-center gap-2 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
            <div className={'w-1.5 h-1.5 rounded-full ' + (darkMode ? 'bg-gray-600' : 'bg-gray-300')} />
            {new Date(note.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => shareNote(note)}
              className={'py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 ' + (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 active:scale-95' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95')}
              title="Paylaş"
            >
              {copiedId === note.id ? <Check size={14} /> : <Link2 size={14} />}
            </button>
            <button
              onClick={() => copyToClipboard(note.content, 'copy-' + note.id)}
              className={'py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 ' + (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 active:scale-95' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95')}
              title="Kopyala"
            >
              {copiedId === ('copy-' + note.id) ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              onClick={() => toggleLock(note.id)}
              className={'py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center ' + (darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600 active:scale-95' : 'bg-gray-100 text-yellow-600 hover:bg-gray-200 active:scale-95')}
              title="Kilitle"
            >
              {lockedNotes[note.id] ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            <button
              onClick={() => setEditingNote(note)}
              className={'py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center ' + (darkMode ? 'bg-gray-700 text-blue-400 hover:bg-gray-600 active:scale-95' : 'bg-gray-100 text-blue-600 hover:bg-gray-200 active:scale-95')}
              title="Düzenle"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => deleteNote(note.id)}
              className="py-2.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-medium hover:bg-red-500/20 transition-all active:scale-95 flex items-center justify-center"
              title="Sil"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={'min-h-screen transition-colors duration-500 ' + (darkMode ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100')}>
      <header className={'sticky top-0 z-50 backdrop-blur-xl border-b shadow-lg ' + (darkMode ? 'bg-gray-900/80 border-gray-800/50' : 'bg-white/80 border-gray-200/50')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={'p-2 rounded-xl shadow-lg ' + (darkMode ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-gradient-to-br from-indigo-500 to-purple-500')}>
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h1 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                  Akıllı Not Defteri
                </h1>
                <p className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                  Notlarınızı düzenleyin, paylaşın
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCloudSync(!cloudSync)}
                className={'p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ' + (cloudSync ? (darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white') : (darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'))}
                title={cloudSync ? 'Bulut Senkronizasyonu Açık' : 'Bulut Senkronizasyonu Kapalı'}
              >
                {cloudSync ? <Cloud size={20} /> : <CloudOff size={20} />}
              </button>
              <button onClick={() => setShowStats(!showStats)} className={'p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ' + (darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                <TrendingUp size={20} />
              </button>
              <button onClick={() => document.getElementById('import').click()} className={'p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ' + (darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                <Upload size={20} />
              </button>
              <input id="import" type="file" accept=".json" onChange={importNotes} className="hidden" />
              <button onClick={exportNotes} className={'p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ' + (darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                <Download size={20} />
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className={'p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg ' + (darkMode ? 'bg-gradient-to-br from-yellow-600 to-orange-600 text-white' : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white')}>
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative group">
              <Search className={'absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors ' + (darkMode ? 'text-gray-500 group-hover:text-indigo-400' : 'text-gray-400 group-hover:text-indigo-600')} size={20} />
              <input
                type="text"
                placeholder="Notlarda ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={'w-full pl-12 pr-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/20 ' + (darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500')}
              />
            </div>
            <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2 font-semibold shadow-lg hover:scale-105 active:scale-95">
              <Plus size={20} />
              <span className="hidden sm:inline">Yeni Not</span>
            </button>
          </div>

          {syncStatus === 'syncing' && (
            <div className={'mt-3 text-xs flex items-center gap-2 ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
              Senkronize ediliyor...
            </div>
          )}
          {syncStatus === 'error' && (
            <div className={'mt-3 text-xs flex items-center gap-2 ' + (darkMode ? 'text-red-400' : 'text-red-600')}>
              ⚠️ Senkronizasyon hatası
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showStats && (
          <div className={'mb-8 p-6 rounded-2xl shadow-xl ' + (darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200')}>
            <h3 className={'text-lg font-semibold mb-6 flex items-center gap-2 ' + (darkMode ? 'text-white' : 'text-gray-900')}>
              <TrendingUp size={20} />
              İstatistikler
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={'p-5 rounded-xl ' + (darkMode ? 'bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200')}>
                <div className={'text-3xl font-bold mb-1 ' + (darkMode ? 'text-indigo-400' : 'text-indigo-600')}>{stats.total}</div>
                <div className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Toplam Not</div>
              </div>
              <div className={'p-5 rounded-xl ' + (darkMode ? 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200')}>
                <div className={'text-3xl font-bold mb-1 ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>{stats.withLinks}</div>
                <div className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Bağlantılı</div>
              </div>
              <div className={'p-5 rounded-xl ' + (darkMode ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/20' : 'bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200')}>
                <div className={'text-3xl font-bold mb-1 ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>{stats.locked}</div>
                <div className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Kilitli</div>
              </div>
              <div className={'p-5 rounded-xl ' + (darkMode ? 'bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/20' : 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200')}>
                <div className={'text-3xl font-bold mb-1 ' + (darkMode ? 'text-green-400' : 'text-green-600')}>{stats.tags.length}</div>
                <div className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Etiket Türü</div>
              </div>
            </div>
            {stats.tags.length > 0 && (
              <div className="mt-6">
                <div className={'text-sm font-medium mb-3 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Popüler Etiketler:</div>
                <div className="flex flex-wrap gap-2">
                  {stats.tags.map(tag => (
                    <span key={tag} className={'px-4 py-2 rounded-xl text-sm font-medium ' + (darkMode ? 'bg-gray-700 text-indigo-400 border border-gray-600' : 'bg-indigo-100 text-indigo-700 border border-indigo-200')}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(isAdding || editingNote) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={'w-full max-w-2xl rounded-2xl shadow-2xl p-6 ' + (darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200')}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={'text-2xl font-bold flex items-center gap-2 ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                  {editingNote ? <Edit2 size={24} /> : <Plus size={24} />}
                  {editingNote ? 'Notu Düzenle' : 'Yeni Not'}
                </h3>
                <button onClick={() => { setIsAdding(false); setEditingNote(null); }} className={'p-2 rounded-xl transition-all hover:scale-110 active:scale-95 ' + (darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600')}>
                  <X size={24} />
                </button>
              </div>
              
              <input
                type="text"
                placeholder="Başlık (opsiyonel)"
                value={editingNote ? editingNote.title : newNote.title}
                onChange={(e) => editingNote ? setEditingNote({ ...editingNote, title: e.target.value }) : setNewNote({ ...newNote, title: e.target.value })}
                className={'w-full px-4 py-3 mb-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/20 ' + (darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500')}
              />
              
              <textarea
                placeholder="Not içeriği... &#10;&#10;💡 İpuçları:&#10;• URL'ler otomatik algılanır&#10;• **kalın** *italik* için markdown&#10;• Her satıra bir link ekleyin"
                value={editingNote ? editingNote.content : newNote.content}
                onChange={(e) => editingNote ? setEditingNote({ ...editingNote, content: e.target.value }) : setNewNote({ ...newNote, content: e.target.value })}
                className={'w-full px-4 py-4 mb-4 rounded-xl border-2 transition-all h-48 resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/20 ' + (darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500')}
              />
              
              <input
                type="text"
                placeholder="Etiketler (örn: #proje #önemli)"
                value={editingNote ? editingNote.tags : newNote.tags}
                onChange={(e) => editingNote ? setEditingNote({ ...editingNote, tags: e.target.value }) : setNewNote({ ...newNote, tags: e.target.value })}
                className={'w-full px-4 py-3 mb-6 rounded-xl border-2 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/20 ' + (darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500')}
              />
              
              <div className="flex gap-3">
                <button onClick={() => { setIsAdding(false); setEditingNote(null); }} className={'flex-1 py-3 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 ' + (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}>
                  İptal
                </button>
                <button onClick={editingNote ? updateNote : addNote} className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg hover:scale-105 active:scale-95">
                  {editingNote ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredNotes.length === 0 ? (
          <div className={'text-center py-20 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
            <div className="text-6xl mb-4">📝</div>
            <p className="text-xl font-medium">
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz not yok. İlk notunu ekle!'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map(note => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}

        {Object.keys(lockedNotes).length > 0 && (
          <div className="mt-12">
            <h3 className={'text-xl font-bold mb-6 flex items-center gap-2 ' + (darkMode ? 'text-white' : 'text-gray-900')}>
              <Lock size={24} />
              Kilitli Notlar ({Object.keys(lockedNotes).length})
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.filter(n => lockedNotes[n.id]).map(note => (
                <div key={note.id} className={'p-6 rounded-2xl border-2 border-dashed shadow-lg ' + (darkMode ? 'bg-gray-800 border-gray-700/50' : 'bg-white border-gray-200/50')}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={'p-3 rounded-xl ' + (darkMode ? 'bg-yellow-500/20' : 'bg-yellow-100')}>
                      <Lock className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} size={24} />
                    </div>
                    <button onClick={() => toggleLock(note.id)} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:scale-105 active:scale-95">
                      Kilidi Aç
                    </button>
                  </div>
                  <p className={'text-sm mb-3 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                    Bu not şifreyle korunuyor
                  </p>
                  <div className={'text-xs flex items-center gap-2 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                    <div className={'w-1.5 h-1.5 rounded-full ' + (darkMode ? 'bg-gray-600' : 'bg-gray-300')} />
                    {new Date(note.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SmartNotebook;