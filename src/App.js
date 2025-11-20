import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit2, Check, Share2, 
  LayoutGrid, List, Loader2, Users, Pin, X, 
  Moon, Sun, Copy, Archive, RefreshCw, Menu, 
  Filter, User
} from 'lucide-react';
import { 
  collection, addDoc, onSnapshot, 
  doc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// --- RENK PALETLERİ ---
const COLORS = [
  { id: 'default', name: 'Varsayılan', bg: 'bg-white dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' },
  { id: 'red', name: 'Kırmızı', bg: 'bg-red-50 dark:bg-red-900', border: 'border-red-200 dark:border-red-800' },
  { id: 'orange', name: 'Turuncu', bg: 'bg-yellow-50 dark:bg-yellow-900', border: 'border-yellow-200 dark:border-yellow-800' },
  { id: 'green', name: 'Yeşil', bg: 'bg-green-50 dark:bg-green-900', border: 'border-green-200 dark:border-green-800' },
  { id: 'blue', name: 'Mavi', bg: 'bg-blue-50 dark:bg-blue-900', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'indigo', name: 'Mor', bg: 'bg-indigo-50 dark:bg-indigo-900', border: 'border-indigo-200 dark:border-indigo-800' },
];

// Oda ID bulucu
const getRoomId = () => {
  const params = new URLSearchParams(window.location.search);
  let room = params.get('room');
  if (!room) {
    room = Math.random().toString(36).substring(2, 9);
    window.history.replaceState(null, '', `?room=${room}`);
  }
  return room;
};

export default function App() {
  // --- STATE ---
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', color: 'default' });
  const [isEditing, setIsEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); 
  const [activeTab, setActiveTab] = useState('notes'); // notes | archive | trash
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [showNameModal, setShowNameModal] = useState(!localStorage.getItem('username'));
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [roomId] = useState(getRoomId());
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // --- ETKİLER ---
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    // Veritabanı Dinleyici
    const q = query(
      collection(db, "notes"), 
      where("room", "==", roomId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setNotes(notesData);
      setLoading(false);
    }, (error) => {
      console.error("Hata:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId]);

  // --- FONKSİYONLAR ---
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const saveUsername = (e) => {
    e.preventDefault();
    const name = e.target.elements.name.value.trim();
    if (name) {
      localStorage.setItem('username', name);
      setUsername(name);
      setShowNameModal(false);
      showToast(`Hoş geldin, ${name}! 👋`);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() && !form.content.trim()) return;
    try {
      if (isEditing) {
        await updateDoc(doc(db, "notes", isEditing), { ...form, updatedAt: serverTimestamp(), lastEditor: username });
        showToast("Not güncellendi");
        setIsEditing(null);
      } else {
        await addDoc(collection(db, "notes"), {
          ...form,
          room: roomId,
          author: username || 'Misafir',
          isPinned: false,
          isArchived: false,
          isDeleted: false,
          createdAt: serverTimestamp()
        });
        showToast("Not eklendi");
      }
      setForm({ title: '', content: '', color: 'default' });
    } catch (error) {
      showToast("Hata oluştu", "error");
    }
  };

  const updateStatus = async (id, field, value) => {
    await updateDoc(doc(db, "notes", id), { [field]: value });
    showToast("Durum güncellendi");
  };

  const permanentDelete = async (id) => {
    if (window.confirm('Bu notu tamamen silmek istiyor musun?')) {
      await deleteDoc(doc(db, "notes", id));
      showToast("Not kalıcı olarak silindi", "error");
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.content.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === 'trash') return n.isDeleted;
    if (n.isDeleted) return false;
    if (activeTab === 'archive') return n.isArchived;
    return !n.isArchived;
  }).sort((a, b) => (b.isPinned - a.isPinned)); // Pinliler üstte

  // --- ARAYÜZ ---
  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      
      {/* TOAST MESAJI */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-slide-in ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.type === 'error' ? <X size={20} /> : <Check size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* İSİM MODALI */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full">
            <h2 className="text-2xl font-bold mb-2 text-indigo-600">Hoş Geldin!</h2>
            <p className="text-gray-500 mb-6">Notlara ismini eklemek için adını gir.</p>
            <form onSubmit={saveUsername}>
              <input name="name" type="text" placeholder="Adın Soyadın..." className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none" autoFocus />
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold">Başla</button>
            </form>
          </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2"><Edit2 /> NoteMaster</h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden"><X /></button>
        </div>

        <div className="px-4 mb-6">
          <button onClick={() => {setActiveTab('notes'); setSidebarOpen(false); document.getElementById('noteInput')?.focus()}} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
            <Plus size={20} /> Yeni Not
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => {setActiveTab('notes'); setSidebarOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeTab === 'notes' ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <List size={20} /> Notlar
          </button>
          <button onClick={() => {setActiveTab('archive'); setSidebarOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeTab === 'archive' ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <Archive size={20} /> Arşiv
          </button>
          <button onClick={() => {setActiveTab('trash'); setSidebarOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeTab === 'trash' ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <Trash2 size={20} /> Çöp Kutusu
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">{username.charAt(0).toUpperCase()}</div>
            <div className="overflow-hidden">
              <p className="font-bold truncate text-sm">{username}</p>
              <p className="text-xs text-green-500 flex items-center gap-1">● Çevrimiçi</p>
            </div>
          </div>
        </div>
      </aside>

      {/* --- ANA İÇERİK --- */}
      <main className="flex-1 flex flex-col w-full md:ml-64 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-20">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2"><Menu /></button>
          
          <div className="relative hidden sm:block w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Ara..." 
              className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              {viewMode === 'grid' ? <List size={20} /> : <LayoutGrid size={20} />}
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => {navigator.clipboard.writeText(window.location.href); showToast('Link kopyalandı!')}} className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              <Share2 size={16} /> Paylaş
            </button>
          </div>
        </header>

        {/* Scroll Alanı */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* Not Ekleme Formu (Sadece Notlar sekmesinde) */}
          {activeTab === 'notes' && (
            <div className="max-w-2xl mx-auto mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <input 
                type="text" placeholder="Başlık..." 
                className="w-full p-4 text-lg font-bold bg-transparent outline-none border-b border-gray-100 dark:border-gray-700"
                value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
              />
              <textarea 
                id="noteInput" placeholder="Bir not yazın..." 
                className="w-full p-4 h-24 bg-transparent outline-none resize-none"
                value={form.content} onChange={(e) => setForm({...form, content: e.target.value})}
              ></textarea>
              <div className="p-3 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c.id} onClick={() => setForm({...form, color: c.id})} className={`w-6 h-6 rounded-full border ${c.bg.split(' ')[0]} ${form.color === c.id ? 'ring-2 ring-indigo-500' : ''}`} />
                  ))}
                </div>
                <button onClick={handleSubmit} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm">
                  {isEditing ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </div>
          )}

          {/* Liste Başlığı */}
          <div className="max-w-7xl mx-auto mb-4 flex items-center gap-2">
            <h2 className="text-2xl font-bold">
              {activeTab === 'notes' && 'Notlarım'}
              {activeTab === 'archive' && 'Arşiv'}
              {activeTab === 'trash' && 'Çöp Kutusu'}
            </h2>
            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-sm">{filteredNotes.length}</span>
          </div>

          {/* Notlar Grid */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="flex justify-center mb-4"><Filter size={48} /></div>
              <p className="text-xl">Burada hiç not yok.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-4 max-w-3xl mx-auto"}>
              {filteredNotes.map(note => {
                const theme = COLORS.find(c => c.id === note.color) || COLORS[0];
                return (
                  <div key={note.id} className={`group relative rounded-xl border p-6 transition-all hover:shadow-xl ${theme.bg} ${theme.border} ${note.isPinned ? 'ring-2 ring-indigo-500' : ''}`}>
                    {note.isPinned && <Pin size={16} className="absolute top-4 right-4 text-indigo-600 fill-current" />}
                    
                    <h3 className="font-bold text-lg mb-2">{note.title}</h3>
                    <p className="text-sm whitespace-pre-wrap opacity-80 mb-4 line-clamp-6">{note.content}</p>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/5 mt-auto">
                      <div className="text-xs opacity-60 flex flex-col">
                        <span className="font-bold flex items-center gap-1"><User size={10}/> {note.author}</span>
                        <span>{note.createdAt.toLocaleDateString('tr-TR')}</span>
                      </div>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {activeTab === 'trash' ? (
                          <>
                            <button onClick={() => updateStatus(note.id, 'isDeleted', false)} className="p-2 hover:bg-green-100 text-green-600 rounded" title="Geri Yükle"><RefreshCw size={16}/></button>
                            <button onClick={() => permanentDelete(note.id)} className="p-2 hover:bg-red-100 text-red-600 rounded" title="Sil"><X size={16}/></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => {navigator.clipboard.writeText(note.content); showToast('Kopyalandı')}} className="p-2 hover:bg-gray-200 rounded"><Copy size={16}/></button>
                            {activeTab === 'notes' && (
                              <>
                                <button onClick={() => updateStatus(note.id, 'isPinned', !note.isPinned)} className="p-2 hover:bg-indigo-100 text-indigo-600 rounded"><Pin size={16}/></button>
                                <button onClick={() => {setIsEditing(note.id); setForm({title: note.title, content: note.content, color: note.color}); document.getElementById('noteInput').focus(); window.scrollTo({top:0, behavior:'smooth'})}} className="p-2 hover:bg-blue-100 text-blue-600 rounded"><Edit2 size={16}/></button>
                              </>
                            )}
                            <button onClick={() => updateStatus(note.id, 'isArchived', !note.isArchived)} className="p-2 hover:bg-orange-100 text-orange-600 rounded"><Archive size={16}/></button>
                            <button onClick={() => updateStatus(note.id, 'isDeleted', true)} className="p-2 hover:bg-red-100 text-red-600 rounded"><Trash2 size={16}/></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
