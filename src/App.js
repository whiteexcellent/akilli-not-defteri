import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit2, Check, Share2, 
  LayoutGrid, List, Loader2, Users, Pin, X, 
  Moon, Sun, Copy, Archive, RefreshCw, Menu, 
  Filter, User, Download, LogOut, Lock, Unlock
} from 'lucide-react';
import { 
  collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, 
  query, where, orderBy, serverTimestamp, setDoc 
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth, googleProvider } from './firebase';

// --- RENK PALETLERİ ---
const COLORS = [
  { id: 'default', bg: 'bg-white dark:bg-slate-800', border: 'border-gray-200 dark:border-slate-700' },
  { id: 'red', bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' },
  { id: 'orange', bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800' },
  { id: 'green', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800' },
  { id: 'blue', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'purple', bg: 'bg-violet-50 dark:bg-violet-900/30', border: 'border-violet-200 dark:border-violet-800' },
];

const getRoomId = () => {
  const params = new URLSearchParams(window.location.search);
  let room = params.get('room');
  if (!room) {
    room = Math.random().toString(36).substring(2, 9);
    window.history.replaceState(null, '', `?room=${room}`);
  }
  return room;
};

// Link Algılayıcı
const formatContent = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => 
    part.match(urlRegex) ? <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline z-20 relative" onClick={e=>e.stopPropagation()}>{part}</a> : part
  );
};

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [roomData, setRoomData] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [form, setForm] = useState({ title: '', content: '', color: 'default', tags: '' });
  const [isEditing, setIsEditing] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); 
  const [activeTab, setActiveTab] = useState('notes'); 
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [roomId] = useState(getRoomId());
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // --- AUTH & THEME ---
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    return () => unsubAuth();
  }, [darkMode]);

  // --- ROOM SECURITY & DATA ---
  useEffect(() => {
    const roomRef = doc(db, "rooms", roomId);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        if (data.password && !sessionStorage.getItem(`unlocked_${roomId}`)) {
          setIsLocked(true);
        }
      } else {
        if (user) {
          setDoc(roomRef, { admin: user.uid, password: null, createdAt: serverTimestamp() });
        }
      }
    });

    let unsubNotes = () => {};
    if (!isLocked) {
      const q = query(collection(db, "notes"), where("room", "==", roomId), orderBy("createdAt", "desc"));
      unsubNotes = onSnapshot(q, (snapshot) => {
        setNotes(snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || new Date() })));
        setLoading(false);
      }, (err) => { console.log(err); setLoading(false); });
    }

    return () => { unsubRoom(); unsubNotes(); };
  }, [roomId, isLocked, user]);

  // --- ACTIONS ---
  const showToast = (msg, type = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const login = async () => {
    try { await signInWithPopup(auth, googleProvider); } catch (e) { showToast("Giriş hatası: Pop-up'a izin verin.", "error"); }
  };

  const unlockRoom = () => {
    if (roomData?.password === passwordInput) {
      setIsLocked(false);
      sessionStorage.setItem(`unlocked_${roomId}`, 'true');
      showToast("Giriş başarılı");
    } else {
      showToast("Yanlış şifre!", "error");
    }
  };

  const setRoomPassword = async () => {
    const newPass = prompt("Yeni oda şifresi girin (Kaldırmak için boş bırakın):");
    if (newPass !== null) {
      await updateDoc(doc(db, "rooms", roomId), { password: newPass || null });
      showToast(newPass ? "Oda şifrelendi 🔒" : "Şifre kaldırıldı 🔓");
    }
  };

  const handleSubmit = async () => {
    if (!user) return showToast("Önce giriş yapmalısın!", "error");
    if (!form.title.trim() && !form.content.trim()) return;
    
    try {
      const noteData = {
        title: form.title,
        content: form.content,
        color: form.color,
        tags: form.tags ? form.tags.split(',').map(t=>t.trim()).filter(t=>t) : [],
        updatedAt: serverTimestamp(),
        lastEditor: user.displayName
      };

      if (isEditing) {
        await updateDoc(doc(db, "notes", isEditing), noteData);
        showToast("Not güncellendi");
      } else {
        await addDoc(collection(db, "notes"), {
          ...noteData,
          room: roomId,
          author: user.displayName,
          authorId: user.uid,
          isPinned: false,
          isArchived: false,
          isDeleted: false,
          createdAt: serverTimestamp()
        });
        showToast("Not eklendi");
      }
      setForm({ title: '', content: '', color: 'default', tags: '' });
      setIsEditing(null);
    } catch (error) {
      console.error(error);
      showToast("Bir hata oluştu", "error");
    }
  };

  // --- UI ---
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3"><Lock className="text-white" size={40} /></div>
          <h1 className="text-4xl font-bold mb-2">NoteMaster <span className="text-indigo-500">Pro</span></h1>
          <p className="mb-8 text-gray-500">Güvenli, Şifreli ve Bulut Tabanlı Not Defteri.</p>
          <button onClick={login} className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-3 hover:shadow-lg transition-all">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="G" />
            Google ile Devam Et
          </button>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-red-100 dark:border-red-900/30">
          <div className="flex justify-center mb-4"><div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full text-red-500"><Lock size={32}/></div></div>
          <h2 className="text-2xl font-bold text-center mb-2 dark:text-white">Oda Kilitli 🔒</h2>
          <p className="text-center text-gray-500 mb-6">Bu odaya girmek için şifre gerekiyor.</p>
          <input type="password" placeholder="Şifre..." className="w-full p-3 rounded-xl border mb-4 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} />
          <button onClick={unlockRoom} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">Kilidi Aç</button>
          <button onClick={() => signOut(auth)} className="w-full mt-2 text-gray-500 text-sm hover:underline">Çıkış Yap</button>
        </div>
      </div>
    );
  }

  const filteredNotes = notes.filter(n => {
    const match = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.content.toLowerCase().includes(searchTerm.toLowerCase()) || (n.tags && n.tags.some(t => t.includes(searchTerm.toLowerCase())));
    if (!match) return false;
    if (activeTab === 'trash') return n.isDeleted;
    if (n.isDeleted) return false;
    if (activeTab === 'archive') return n.isArchived;
    return !n.isArchived;
  }).sort((a, b) => (b.isPinned - a.isPinned));

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} font-sans`}>
      {toast.show && <div className={`fixed top-5 right-5 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in ${toast.type==='error'?'bg-red-500 text-white':'bg-emerald-600 text-white'}`}>{toast.type==='error'?<X/>:<Check/>}<span className="font-medium">{toast.message}</span></div>}

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
        <div className="p-6"><h1 className="text-2xl font-extrabold text-indigo-600 flex gap-2"><Edit2/> NoteMaster</h1></div>
        <div className="px-4 mb-6"><button onClick={()=>{setActiveTab('notes'); setSidebarOpen(false); document.getElementById('titleInput')?.focus()}} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg shadow-indigo-500/20"><Plus/> Yeni Not</button></div>
        <nav className="flex-1 px-4 space-y-2">
          {[{id:'notes',icon:<List/>,label:'Notlar'},{id:'archive',icon:<Archive/>,label:'Arşiv'},{id:'trash',icon:<Trash2/>,label:'Çöp Kutusu'}].map(item=>(
            <button key={item.id} onClick={()=>{setActiveTab(item.id);setSidebarOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab===item.id?'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600':'hover:bg-gray-100 dark:hover:bg-slate-800'}`}>{item.icon} {item.label}</button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 mb-2">
            <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full"/>
            <div className="overflow-hidden"><p className="font-bold truncate text-sm">{user.displayName}</p><p className="text-xs text-green-500">● Çevrimiçi</p></div>
          </div>
          {roomData?.admin === user.uid && (
            <button onClick={setRoomPassword} className="w-full mb-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200">
              {roomData.password ? <><Lock size={12}/> Şifreyi Değiştir</> : <><Unlock size={12}/> Şifre Koy</>}
            </button>
          )}
          <button onClick={()=>signOut(auth)} className="w-full flex items-center justify-center gap-2 text-red-500 text-sm font-medium hover:bg-red-50 p-2 rounded-lg"><LogOut size={16}/> Çıkış Yap</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col w-full md:ml-72 h-full overflow-hidden relative">
        <header className="h-20 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-20">
          <button onClick={()=>setSidebarOpen(true)} className="md:hidden p-2"><Menu/></button>
          <div className="relative hidden sm:block w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
            <input type="text" placeholder="Ara (#etiket, metin)..." className="pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-900 border-none rounded-xl w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setViewMode(viewMode==='grid'?'list':'grid')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">{viewMode==='grid'?<LayoutGrid/>:<List/>}</button>
            <button onClick={()=>setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">{darkMode?<Sun/>:<Moon/>}</button>
            <button onClick={()=>{navigator.clipboard.writeText(window.location.href);showToast('Link kopyalandı!')}} className="hidden md:flex bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-4 py-2 rounded-xl font-bold items-center gap-2 hover:bg-indigo-100"><Share2 size={18}/> Paylaş</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {activeTab === 'notes' && (
            <div className={`max-w-3xl mx-auto mb-10 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-800 overflow-hidden transition-all ${isEditing?'ring-2 ring-indigo-500':''}`}>
              <input id="titleInput" type="text" placeholder="Başlık" className="w-full p-5 text-lg font-bold bg-transparent outline-none border-b border-gray-100 dark:border-slate-800" value={form.title} onChange={e=>setForm({...form, title: e.target.value})}/>
              <textarea placeholder="Bir not yaz..." className="w-full p-5 h-32 bg-transparent outline-none resize-none" value={form.content} onChange={e=>setForm({...form, content: e.target.value})}></textarea>
              <input type="text" placeholder="#etiket1, #etiket2" className="w-full px-5 py-2 text-sm bg-transparent outline-none text-gray-500" value={form.tags} onChange={e=>setForm({...form, tags: e.target.value})}/>
              <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  {COLORS.map(c=><button key={c.id} onClick={()=>setForm({...form, color:c.id})} className={`w-6 h-6 rounded-full border ${c.bg.split(' ')[0]} ${form.color===c.id?'ring-2 ring-indigo-500':''}`}/>)}
                </div>
                <div className="flex gap-2">
                  {isEditing && <button onClick={()=>{setIsEditing(null);setForm({title:'',content:'',color:'default',tags:''})}} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg">İptal</button>}
                  <button onClick={handleSubmit} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700">{isEditing?'Güncelle':'Ekle'}</button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto mb-6"><h2 className="text-3xl font-bold flex items-center gap-3">{activeTab==='notes'?'Notlarım':activeTab==='archive'?'Arşiv':'Çöp Kutusu'} <span className="text-sm bg-gray-200 dark:bg-slate-800 px-3 py-1 rounded-full">{filteredNotes.length}</span></h2></div>
          
          {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40}/></div> : filteredNotes.length === 0 ? <div className="text-center py-20 opacity-50"><p className="text-xl">Burada hiç not yok.</p></div> : (
            <div className={viewMode==='grid'?"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20":"flex flex-col gap-4 pb-20 max-w-4xl mx-auto"}>
              {filteredNotes.map(note => {
                const theme = COLORS.find(c => c.id === note.color) || COLORS[0];
                return (
                  <div key={note.id} className={`group relative rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col ${theme.bg} ${theme.border} ${note.isPinned?'ring-2 ring-indigo-500':''} ${viewMode==='list'?'flex-row p-5 gap-6':'p-6'}`}>
                    {note.isPinned && activeTab==='notes' && <div className="absolute -top-3 -right-3 bg-indigo-600 text-white p-1.5 rounded-full shadow z-10"><Pin size={14} fill="currentColor"/></div>}
                    <div className="flex-1 w-full">
                      <h3 className="font-bold text-lg mb-2 break-words">{note.title}</h3>
                      <div className="text-sm opacity-80 mb-3 whitespace-pre-wrap break-words line-clamp-6">{formatContent(note.content)}</div>
                      {note.tags && note.tags.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{note.tags.map((t,i)=><span key={i} className="text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded">#{t}</span>)}</div>}
                    </div>
                    <div className={`mt-auto pt-4 flex justify-between items-center ${viewMode==='list'?'w-auto flex-col border-l pl-4':'border-t border-black/5 dark:border-white/5'}`}>
                      <div className="text-xs opacity-60 flex flex-col gap-1"><span className="font-bold flex items-center gap-1"><User size={10}/> {note.author}</span><span>{note.createdAt?.toLocaleDateString()}</span></div>
                      <div className={`flex gap-1 ${viewMode==='grid'?'opacity-0 group-hover:opacity-100':''}`}>
                        {activeTab === 'trash' ? (
                          <><button onClick={()=>updateDoc(doc(db,"notes",note.id),{isDeleted:false})} className="p-2 hover:bg-green-100 text-green-600 rounded"><RefreshCw size={16}/></button><button onClick={()=>deleteDoc(doc(db,"notes",note.id))} className="p-2 hover:bg-red-100 text-red-600 rounded"><X size={16}/></button></>
                        ) : (
                          <>
                            <button onClick={()=>{const e=document.createElement("a");e.href=URL.createObjectURL(new Blob([`${note.title}\n${note.content}`],{type:'text/plain'}));e.download=`${note.title}.txt`;e.click()}} className="p-2 hover:bg-slate-200 rounded text-slate-500"><Download size={16}/></button>
                            {activeTab==='notes' && <><button onClick={()=>updateDoc(doc(db,"notes",note.id),{isPinned:!note.isPinned})} className="p-2 hover:bg-indigo-100 text-indigo-600 rounded"><Pin size={16}/></button><button onClick={()=>{setIsEditing(note.id);setForm({title:note.title,content:note.content,color:note.color,tags:note.tags.join(', ')});window.scrollTo(0,0)}} className="p-2 hover:bg-blue-100 text-blue-600 rounded"><Edit2 size={16}/></button></>}
                            <button onClick={()=>updateDoc(doc(db,"notes",note.id),{isArchived:!note.isArchived})} className="p-2 hover:bg-orange-100 text-orange-600 rounded"><Archive size={16}/></button>
                            <button onClick={()=>updateDoc(doc(db,"notes",note.id),{isDeleted:true})} className="p-2 hover:bg-red-100 text-red-600 rounded"><Trash2 size={16}/></button>
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
