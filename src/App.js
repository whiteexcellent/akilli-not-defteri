import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit2, Check, Share2, 
  LayoutGrid, List, Loader2, Users, Pin, X, 
  Moon, Sun, Copy, Archive, RefreshCw, Menu, 
  Filter, User, Download
} from 'lucide-react';
import { 
  collection, addDoc, onSnapshot, 
  doc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// --- RENK PALETLERİ ---
const COLORS = [
  { id: 'default', name: 'Varsayılan', bg: 'bg-white dark:bg-slate-800', border: 'border-gray-200 dark:border-slate-700' },
  { id: 'red', name: 'Kırmızı', bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' },
  { id: 'orange', name: 'Turuncu', bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800' },
  { id: 'amber', name: 'Sarı', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' },
  { id: 'green', name: 'Yeşil', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800' },
  { id: 'blue', name: 'Mavi', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'indigo', name: 'Mor', bg: 'bg-violet-50 dark:bg-violet-900/30', border: 'border-violet-200 dark:border-violet-800' },
  { id: 'pink', name: 'Pembe', bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-800' },
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

// --- YARDIMCI: Link Algılayıcı ---
// Metin içindeki URL'leri bulup tıklanabilir <a> etiketine çevirir
const formatContent = (text) => {
  if (!text) return null;
  
  // URL regex kalıbı (http veya https ile başlayanlar)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 dark:text-blue-400 hover:underline break-all font-medium z-20 relative"
          onClick={(e) => e.stopPropagation()} // Karta tıklamayı engelle
        >
          {part}
        </a>
      );
    }
    return part;
  });
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
    if (!form.title.trim() && !form.content.trim()) {
      showToast("Boş not ekleyemezsiniz", "error");
      return;
    }
    
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
      setActiveTab('notes');
    } catch (error) {
      showToast("Hata oluştu", "error");
    }
  };

  const updateStatus = async (id, field, value) => {
    await updateDoc(doc(db, "notes", id), { [field]: value });
    showToast(value ? "Durum aktif edildi" : "Durum iptal edildi");
  };

  const permanentDelete = async (id) => {
    if (window.confirm('Bu notu tamamen silmek istiyor musun?')) {
      await deleteDoc(doc(db, "notes", id));
      showToast("Not kalıcı olarak silindi", "error");
    }
  };

  const downloadNote = (note) => {
    const element = document.createElement("a");
    const file = new Blob([`BAŞLIK: ${note.title}\n\nİÇERİK:\n${note.content}\n\nYazar: ${note.author}\nTarih: ${note.createdAt.toLocaleDateString()}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${note.title || 'not'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast("Not indirildi 📥");
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.content.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === 'trash') return n.isDeleted;
    if (n.isDeleted) return false;
    if (activeTab === 'archive') return n.isArchived;
    return !n.isArchived;
  }).sort((a, b) => (b.isPinned - a.isPinned)); 

  // --- ARAYÜZ ---
  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} font-sans`}>
      
      {/* TOAST MESAJI */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? <X size={20} /> : <Check size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* İSİM MODALI */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-slate-800">
            <h2 className="text-2xl font-bold mb-2 text-indigo-600">Kimsin Sen?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Notlara ismini eklemek için adını gir.</p>
            <form onSubmit={saveUsername}>
              <input name="name" type="text" placeholder="Adın..." className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 dark:border-slate-700 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none" autoFocus />
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg">Başla 🚀</button>
            </form>
          </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-indigo-600 flex items-center gap-2"><Edit2 /> NoteMaster</h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500"><X /></button>
        </div>

        <div className="px-4 mb-6">
          <button onClick={() => {setActiveTab('notes'); setSidebarOpen(false); document.getElementById('noteInput')?.focus()}} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
            <Plus size={20} /> Yeni Not
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'notes', icon: <List size={20} />, label: 'Notlar' },
            { id: 'archive', icon: <Archive size={20} />, label: 'Arşiv' },
            { id: 'trash', icon: <Trash2 size={20} />, label: 'Çöp Kutusu' }
          ].map(item => (
            <button key={item.id} onClick={() => {setActiveTab(item.id); setSidebarOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">{username.charAt(0).toUpperCase()}</div>
            <div className="overflow-hidden">
              <p className="font-bold truncate text-sm">{username}</p>
              <div className="flex items-center gap-1 text-xs text-green-500"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Çevrimiçi</div>
            </div>
          </div>
        </div>
      </aside>

      {/* --- ANA İÇERİK --- */}
      <main className="flex-1 flex flex-col w-full md:ml-72 h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-20 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-20">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-gray-500"><Menu /></button>
          
          <div className="relative hidden sm:block w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Notlarda ara..." 
              className="pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-900 border-none rounded-xl w-full focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg mr-2">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-gray-400'}`}><List size={18} /></button>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => {navigator.clipboard.writeText(window.location.href); showToast('Davet linki kopyalandı!')}} className="hidden md:flex bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors items-center gap-2">
              <Share2 size={18} /> Paylaş
            </button>
          </div>
        </header>

        {/* Scroll Alanı */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          
          {activeTab === 'notes' && (
            <div className="max-w-3xl mx-auto mb-10 relative z-10">
              <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-800 overflow-hidden transition-all duration-300 ${isEditing ? 'ring-2 ring-indigo-500 scale-105 z-20' : ''}`}>
                <input 
                  type="text" placeholder="Not Başlığı..." 
                  className="w-full p-5 text-lg font-bold bg-transparent outline-none border-b border-gray-100 dark:border-slate-800 placeholder-gray-400"
                  value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                />
                <textarea 
                  id="noteInput" placeholder="Bir not yazın... (Linkler otomatik algılanır)" 
                  className="w-full p-5 h-32 bg-transparent outline-none resize-none placeholder-gray-400 text-base leading-relaxed"
                  value={form.content} onChange={(e) => setForm({...form, content: e.target.value})}
                ></textarea>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
                    {COLORS.map(c => (
                      <button key={c.id} onClick={() => setForm({...form, color: c.id})} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${c.bg.split(' ')[0].replace('/30','')} ${c.border.split(' ')[0]} ${form.color === c.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''}`} title={c.name} />
                    ))}
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    {isEditing && <button onClick={() => {setIsEditing(null); setForm({title:'', content:'', color:'default'})}} className="flex-1 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg font-medium">İptal</button>}
                    <button onClick={handleSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-transform active:scale-95">
                      {isEditing ? 'Güncelle' : 'Ekle'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto mb-6 flex items-end justify-between border-b border-gray-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                {activeTab === 'notes' ? 'Notlarım' : activeTab === 'archive' ? 'Arşiv' : 'Çöp Kutusu'}
                <span className="text-sm font-normal bg-gray-200 dark:bg-slate-800 px-3 py-1 rounded-full text-gray-600 dark:text-gray-400">{filteredNotes.length}</span>
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-600 mb-4" size={48} /><p className="text-gray-400">Notlar yükleniyor...</p></div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'trash' ? <Trash2 size={40} /> : activeTab === 'archive' ? <Archive size={40} /> : <Filter size={40} />}
              </div>
              <p className="text-xl font-medium text-gray-500">Burada hiç not yok.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20" : "flex flex-col gap-4 pb-20 max-w-4xl mx-auto"}>
              {filteredNotes.map(note => {
                const theme = COLORS.find(c => c.id === note.color) || COLORS[0];
                return (
                  <div key={note.id} className={`group relative rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col ${theme.bg} ${theme.border} ${note.isPinned ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950' : ''} ${viewMode === 'list' ? 'flex-row items-start p-5 gap-6' : 'p-6 min-h-[220px]'}`}>
                    {note.isPinned && activeTab === 'notes' && <div className="absolute -top-3 -right-3 bg-indigo-600 text-white p-1.5 rounded-full shadow-md z-10"><Pin size={14} fill="currentColor" /></div>}
                    
                    <div className="flex-1 min-w-0 w-full">
                      <h3 className={`font-bold text-slate-800 dark:text-slate-100 mb-3 leading-tight ${viewMode === 'grid' ? 'text-lg' : 'text-xl'}`}>{note.title}</h3>
                      <div className={`text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed ${viewMode === 'grid' ? 'text-sm line-clamp-6' : 'text-base'}`}>
                        {/* BURADA LİNKLERİ ALGILIYORUZ */}
                        {formatContent(note.content)}
                      </div>
                    </div>
                    
                    <div className={`mt-auto pt-4 flex items-center justify-between w-full ${viewMode === 'list' ? 'w-auto flex-col items-end gap-3 border-l pl-6 border-gray-200/50' : 'border-t border-black/5 dark:border-white/5'}`}>
                      <div className="flex flex-col text-xs opacity-60">
                        <span className="font-bold flex items-center gap-1"><User size={12}/> {note.author}</span>
                        <span>{note.createdAt.toLocaleDateString('tr-TR')}</span>
                      </div>
                      
                      <div className={`flex gap-1 ${viewMode === 'grid' ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}>
                        {activeTab === 'trash' ? (
                          <>
                            <button onClick={() => updateStatus(note.id, 'isDeleted', false)} className="p-2 hover:bg-green-100 text-green-600 rounded-lg" title="Geri Yükle"><RefreshCw size={16}/></button>
                            <button onClick={() => permanentDelete(note.id)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg" title="Kalıcı Sil"><X size={16}/></button>
                          </>
                        ) : (
                          <>
                             <button onClick={() => downloadNote(note)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500" title="İndir"><Download size={16} /></button>
                             <button onClick={() => {navigator.clipboard.writeText(note.content); showToast('Kopyalandı')}} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500" title="Kopyala"><Copy size={16} /></button>
                            {activeTab === 'notes' && (
                              <>
                                <button onClick={() => updateStatus(note.id, 'isPinned', !note.isPinned)} className={`p-2 rounded-lg ${note.isPinned ? 'text-indigo-600 bg-indigo-50' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'}`} title="Sabitle"><Pin size={16}/></button>
                                <button onClick={() => {setIsEditing(note.id); setForm({title: note.title, content: note.content, color: note.color}); document.getElementById('noteInput').focus(); window.scrollTo({top:0, behavior:'smooth'})}} className="p-2 hover:bg-indigo-100 text-indigo-600 rounded-lg" title="Düzenle"><Edit2 size={16}/></button>
                              </>
                            )}
                            <button onClick={() => updateStatus(note.id, 'isArchived', !note.isArchived)} className="p-2 hover:bg-orange-100 text-orange-600 rounded-lg" title={note.isArchived ? "Arşivden Çıkar" : "Arşivle"}><Archive size={16}/></button>
                            <button onClick={() => updateStatus(note.id, 'isDeleted', true)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg" title="Sil"><Trash2 size={16}/></button>
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
