import { LogOut, Shield, WalletCards, Plus, ChevronDown, Menu, X, Trash2, LayoutDashboard, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [currentWallet, setCurrentWallet] = useState(null);
  
  // UI States
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data States
  const [name, setName] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Delete States
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null, name: "" });

  // --- LOGIC ---
  const loadWallets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: owned } = await supabase.from('wallets').select('id, name').eq('owner_id', user.id);
    const { data: shared } = await supabase.from('wallet_members').select('wallets!inner(id, name)').eq('user_id', user.id);
    const sharedWallets = shared?.map(m => ({ id: m.wallets.id, name: m.wallets.name })) || [];
    const walletMap = new Map();
    [...(owned || []), ...sharedWallets].forEach(w => { if (!walletMap.has(w.id)) walletMap.set(w.id, w); });
    const allWallets = Array.from(walletMap.values());
    setWallets(allWallets);
    const savedId = localStorage.getItem('currentWalletId');
    const selected = allWallets.find(w => w.id === savedId) || allWallets[0];
    setCurrentWallet(selected);
    if (selected) localStorage.setItem('currentWalletId', selected.id);
  };

  const createWallet = async () => {
    if (!name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("wallets").insert({ name: name.trim(), owner_id: user.id }).select().single();
    if (data) {
      await supabase.from("wallet_members").insert({ wallet_id: data.id, user_id: user.id, role: "owner" });
      setName(""); setShowCreate(false); loadWallets(); window.dispatchEvent(new Event('walletChanged'));
    }
  };

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    setIsAdmin(data?.is_admin || false);
  };

  const switchWallet = (wallet) => {
    setCurrentWallet(wallet); localStorage.setItem("currentWalletId", wallet.id);
    setShowMenu(false); setMobileMenuOpen(false);
    window.dispatchEvent(new Event('walletChanged'));
  };

  // Trigger the modal instead of native confirm
  const promptDelete = (wallet) => {
    setConfirmDelete({ show: true, id: wallet.id, name: wallet.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    
    setDeletingId(confirmDelete.id);
    // Close modal immediately so user sees the loading state on the button or UI
    setConfirmDelete({ show: false, id: null, name: "" }); 

    try {
      await supabase.from('expenses').delete().eq('wallet_id', confirmDelete.id);
      await supabase.from('wallet_members').delete().eq('wallet_id', confirmDelete.id);
      await supabase.from('wallets').delete().eq('id', confirmDelete.id);
      
      if (currentWallet?.id === confirmDelete.id) { 
        setCurrentWallet(null); 
        localStorage.removeItem('currentWalletId'); 
      }
      loadWallets(); 
      window.dispatchEvent(new Event('walletChanged'));
    } catch (err) { 
      alert("Failed to delete wallet"); 
    } finally { 
      setDeletingId(null); 
    }
  };

  useEffect(() => {
    loadWallets(); checkAdmin();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    const handleChange = () => loadWallets();
    window.addEventListener('walletChanged', handleChange);
    window.addEventListener('storage', handleChange);
    return () => { window.removeEventListener("resize", handleResize); window.removeEventListener('walletChanged', handleChange); window.removeEventListener('storage', handleChange); };
  }, []);

  // --- UI ---

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-gray-100/80 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* --- LEFT SIDE: LOGO & DESKTOP WALLET --- */}
            <div className="flex items-center gap-6">
              {/* Logo */}
              <div 
                onClick={() => navigate("/")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white md:hidden shadow-md shadow-blue-500/20">
                  <span className="font-bold text-lg">F</span>
                </div>
                <span className="hidden md:block text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                  FinTracka
                </span>
              </div>

              {/* Desktop Wallet Dropdown */}
              {!isMobile && wallets.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/80 hover:bg-white border border-gray-200 hover:border-blue-300 rounded-full text-sm font-medium text-gray-600 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-gray-100">
                      <WalletCards size={12} />
                    </div>
                    <span className="truncate max-w-[120px]">{currentWallet?.name || "Select"}</span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${showMenu ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                          {wallets.map((w) => (
                            <div key={w.id} className="relative group">
                              <button
                                onClick={() => switchWallet(w)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                                  currentWallet?.id === w.id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${currentWallet?.id === w.id ? "bg-blue-500" : "bg-gray-300"}`} />
                                <span className="truncate">{w.name}</span>
                              </button>
                              {currentWallet?.id !== w.id && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); promptDelete(w); }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                >
                                  {deletingId === w.id ? "..." : <Trash2 size={14} />}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="p-2 border-t border-gray-50 bg-gray-50/50">
                          <button
                            onClick={() => { setShowCreate(true); setShowMenu(false); }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-emerald-600 bg-white border border-emerald-100 hover:border-emerald-300 rounded-lg shadow-sm transition-all"
                          >
                            <Plus size={14} /> New Wallet
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* --- RIGHT SIDE: ACTIONS --- */}
            <div className="flex items-center gap-2">
              {/* Mobile: Current Wallet Pill */}
              {isMobile && currentWallet && (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-blue-700 max-w-[100px] truncate">{currentWallet.name}</span>
                 </div>
              )}

              {/* Desktop: Admin/Logout */}
              {!isMobile && (
                <>
                  {isAdmin && (
                    <button onClick={() => navigate("/admin")} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors">
                      ADMIN
                    </button>
                  )}
                  <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut size={14} />
                    EXIT
                  </button>
                </>
              )}

              {/* Mobile Menu Trigger */}
              {isMobile && (
                <button 
                  onClick={() => setMobileMenuOpen(true)} 
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                >
                  <Menu size={24} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* --- MOBILE SIDE DRAWER --- */}
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      
      <div 
        className={`fixed inset-y-0 right-0 z-[60] w-[280px] bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-5 flex items-center justify-between border-b border-gray-100">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Menu</span>
          <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Section 1: Wallets with Delete */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <WalletCards size={16} className="text-blue-600" /> My Wallets
              </h3>
            </div>
            
            <div className="space-y-2">
              {wallets.map((w) => (
                <div key={w.id} className="relative group flex items-center">
                  <button
                    onClick={() => switchWallet(w)}
                    className={`
                      w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all pr-12
                      ${currentWallet?.id === w.id 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-medium" 
                        : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 font-medium"}
                    `}
                  >
                    <span className="truncate">{w.name}</span>
                    {currentWallet?.id === w.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </button>

                  {/* Mobile Delete Button */}
                  {currentWallet?.id !== w.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); promptDelete(w); }}
                      className="absolute right-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      {deletingId === w.id ? "..." : <Trash2 size={16} />}
                    </button>
                  )}
                </div>
              ))}
              
              <button
                onClick={() => { setShowCreate(true); setMobileMenuOpen(false); }}
                className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-3 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-dashed border-emerald-200"
              >
                <Plus size={14} /> Add Wallet
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Section 2: Actions */}
          <div className="space-y-1">
            <button 
              onClick={() => { navigate("/"); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl"
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            
            {isAdmin && (
              <button 
                onClick={() => { navigate("/admin"); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl"
              >
                <Shield size={18} /> Admin Panel
              </button>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-600 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 rounded-xl transition-all shadow-sm"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>

      {/* CREATE WALLET MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Create Wallet</h2>
            <p className="text-sm text-gray-500 mb-4">Give your new wallet a name.</p>
            <input
              value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Travel Fund" autoFocus
              onKeyPress={e => e.key === "Enter" && createWallet()}
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={createWallet} className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: CUSTOM DELETE CONFIRMATION MODAL */}
      {confirmDelete.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            onClick={e => e.stopPropagation()} 
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Wallet?</h3>
              <p className="text-sm text-gray-500 mt-1 mb-6">
                Are you sure you want to delete <span className="font-bold text-gray-800">"{confirmDelete.name}"</span>? All expenses in this wallet will be lost forever.
              </p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setConfirmDelete({ show: false, id: null, name: "" })}
                  className="flex-1 py-3 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </>
  );
}