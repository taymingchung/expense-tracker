import { LogOut, Shield, WalletCards, Plus, ChevronDown, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";

// Premium Sapphire Blue Color Palette
const SAPPHIRE_BLUE = "#2563EB";
const SAPPHIRE_LIGHT = "#DBEAFE";
const SAPPHIRE_DARK = "#1E40AF";
const SKY_BLUE = "#3B82F6";
const EMERALD_GREEN = "#10B981";
const RED_DANGER = "#EF4444";
const WHITE = "#FFFFFF";
const LIGHT_GRAY = "#F3F4F6";
const DARK_NAVY = "#1E3A8A";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";
const BORDER_LIGHT = "#E5E7EB";

export default function Navbar() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [currentWallet, setCurrentWallet] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadWallets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: owned } = await supabase
      .from('wallets')
      .select('id, name')
      .eq('owner_id', user.id);

    const { data: shared } = await supabase
      .from('wallet_members')
      .select('wallets!inner(id, name)')
      .eq('user_id', user.id);

    const sharedWallets = shared?.map(m => ({ id: m.wallets.id, name: m.wallets.name })) || [];
    const walletMap = new Map();
    [...(owned || []), ...sharedWallets].forEach(w => {
      if (!walletMap.has(w.id)) {
        walletMap.set(w.id, w);
      }
    });
    const allWallets = Array.from(walletMap.values());
    setWallets(allWallets);

    const savedId = localStorage.getItem('currentWalletId');
    const selected = allWallets.find(w => w.id === savedId) || allWallets[0] || null;
    setCurrentWallet(selected);
    if (selected) localStorage.setItem('currentWalletId', selected.id);
  };

  const createWallet = async () => {
    if (!name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("wallets")
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (data) {
      await supabase.from("wallet_members").insert({
        wallet_id: data.id,
        user_id: user.id,
        role: "owner",
      });
      setName("");
      setShowCreate(false);
      loadWallets();
      window.dispatchEvent(new Event('walletChanged'));
    }
  };

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      setIsAdmin(data?.is_admin || false);
    }
  };

  const switchWallet = (wallet) => {
    setCurrentWallet(wallet);
    localStorage.setItem("currentWalletId", wallet.id);
    setShowMenu(false);
    setMobileMenuOpen(false);
    window.dispatchEvent(new Event('walletChanged'));
  };

  useEffect(() => {
    loadWallets();
    checkAdmin();

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);

    const handleWalletChange = () => loadWallets();
    window.addEventListener('walletChanged', handleWalletChange);
    window.addEventListener('storage', handleWalletChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener('walletChanged', handleWalletChange);
      window.removeEventListener('storage', handleWalletChange);
    };
  }, []);

  return (
    <>
      <div style={{
        background: WHITE,
        borderBottom: `1px solid ${BORDER_LIGHT}`,
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: isMobile ? "14px 16px" : "0 24px",
          height: isMobile ? "auto" : "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px"
        }}>
          <div style={{
            fontSize: isMobile ? "24px" : "28px",
            fontWeight: "800",
            background: `linear-gradient(135deg, ${SAPPHIRE_BLUE}, ${SKY_BLUE})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            cursor: "pointer",
            letterSpacing: "-0.5px",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }} onClick={() => navigate("/")}>
            ExpenseTracker
          </div>

          {/* Desktop Wallet Selector */}
          {!isMobile && wallets.length > 0 && (
            <div style={{ position: "relative", flex: 1, marginLeft: "32px" }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  padding: "10px 16px",
                  background: showMenu ? SAPPHIRE_LIGHT : LIGHT_GRAY,
                  borderRadius: "10px",
                  border: `1.5px solid ${showMenu ? SAPPHIRE_BLUE : BORDER_LIGHT}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "500",
                  color: showMenu ? SAPPHIRE_BLUE : TEXT_DARK,
                  transition: "all 0.2s",
                  maxWidth: "300px",
                  fontFamily: "inherit"
                }}
              >
                <WalletCards size={18} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentWallet?.name || "Select Wallet"}
                </span>
                <ChevronDown size={16} style={{
                  transform: showMenu ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "0.25s",
                  marginLeft: "auto",
                  flexShrink: 0
                }} />
              </button>

              {showMenu && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  width: "300px",
                  background: WHITE,
                  borderRadius: "12px",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                  overflow: "hidden",
                  zIndex: 200,
                  border: `1px solid ${BORDER_LIGHT}`
                }}>
                  <div style={{ padding: "8px" }}>
                    {wallets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => switchWallet(w)}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          fontSize: "14px",
                          cursor: "pointer",
                          background: currentWallet?.id === w.id ? SAPPHIRE_LIGHT : "transparent",
                          borderRadius: "8px",
                          border: "none",
                          color: currentWallet?.id === w.id ? SAPPHIRE_BLUE : TEXT_DARK,
                          fontWeight: currentWallet?.id === w.id ? "600" : "500",
                          textAlign: "left",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          fontFamily: "inherit"
                        }}
                        onMouseEnter={(e) => {
                          if (currentWallet?.id !== w.id) {
                            e.currentTarget.style.background = LIGHT_GRAY;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentWallet?.id !== w.id) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        <WalletCards size={16} />
                        {w.name}
                      </button>
                    ))}
                  </div>
                  <div style={{ height: "1px", background: BORDER_LIGHT, margin: "4px 0" }} />
                  <button
                    onClick={() => {
                      setShowCreate(true);
                      setShowMenu(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: EMERALD_GREEN,
                      background: "#ECFDF5",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      transition: "all 0.2s",
                      borderRadius: "8px",
                      margin: "8px",
                      fontFamily: "inherit"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#D1FAE5")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ECFDF5")}
                  >
                    <Plus size={18} />
                    New Wallet
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Desktop Right Buttons */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "12px" : "12px"
          }}>
            {!isMobile && isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                style={{
                  padding: "8px 14px",
                  background: SAPPHIRE_LIGHT,
                  color: SAPPHIRE_BLUE,
                  border: `1px solid ${SAPPHIRE_BLUE}`,
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                  fontFamily: "inherit"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = SAPPHIRE_BLUE;
                  e.currentTarget.style.color = WHITE;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = SAPPHIRE_LIGHT;
                  e.currentTarget.style.color = SAPPHIRE_BLUE;
                }}
              >
                <Shield size={16} />
                Admin
              </button>
            )}

            {!isMobile && (
              <button
                onClick={() => supabase.auth.signOut()}
                style={{
                  padding: "8px 14px",
                  background: "#FEE2E2",
                  color: RED_DANGER,
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                  fontFamily: "inherit"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = RED_DANGER;
                  e.currentTarget.style.color = WHITE;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FEE2E2";
                  e.currentTarget.style.color = RED_DANGER;
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            )}

            {/* Mobile Menu Toggle */}
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  padding: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: SAPPHIRE_BLUE,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            )}
          </div>
        </div>

        {/* BEAUTIFUL MOBILE MENU - FULLY UPGRADED */}
        {/* OPTIMIZED & BEAUTIFUL MOBILE MENU – FINAL VERSION */}
        {isMobile && mobileMenuOpen && (
          <div style={{
            background: WHITE,
            padding: "20px 20px 28px",
            borderRadius: "24px 24px 0 0",
            boxShadow: "0 -12px 40px rgba(0,0,0,0.12)",
            borderTop: `1px solid ${BORDER_LIGHT}`,
            animation: "slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            maxHeight: "85vh",
            overflowY: "auto"
          }}>
            {/* Thin gradient bar */}
            <div style={{
              position: "absolute",
              top: 0, left: 20, right: 20, height: "4px",
              background: `linear-gradient(90deg, ${SAPPHIRE_BLUE}, ${SKY_BLUE})`,
              borderRadius: "2px"
            }} />

            {/* Wallets – Compact & Elegant */}
            {wallets.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: TEXT_MUTED,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "12px",
                  paddingLeft: "4px"
                }}>Your Wallets</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => switchWallet(w)}
                      style={{
                        padding: "14px 16px",
                        background: currentWallet?.id === w.id ? SAPPHIRE_LIGHT : "transparent",
                        border: `2px solid ${currentWallet?.id === w.id ? SAPPHIRE_BLUE : BORDER_LIGHT}`,
                        borderRadius: "14px",
                        fontSize: "15px",
                        fontWeight: currentWallet?.id === w.id ? "600" : "500",
                        color: currentWallet?.id === w.id ? SAPPHIRE_BLUE : TEXT_DARK,
                        cursor: "pointer",
                        transition: "all 0.22s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "12 FUTUREpx",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
                      <WalletCards size={20} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, textAlign: "left" }}>{w.name}</span>
                      {currentWallet?.id === w.id && (
                        <div style={{
                          width: "8px", height: "8px",
                          background: EMERALD_GREEN,
                          borderRadius: "50%",
                          position: "absolute",
                          right: "12px",
                          boxShadow: "0 0 0 3px rgba(16,185,129,0.2)"
                        }} />
                      )}
                    </button>
                  ))}

                  {/* Compact Create Wallet Button */}
                  <button
                    onClick={() => { setShowCreate(true); setMobileMenuOpen(false); }}
                    style={{
                      padding: "14px 16px",
                      background: "#F0FDF4",
                      border: `2px dashed ${EMERALD_GREEN}`,
                      borderRadius: "14px",
                      color: EMERALD_GREEN,
                      fontWeight: "600",
                      fontSize: "15px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.2s"
                    }}
                  >
                    <Plus size={20} strokeWidth={2.5} />
                    Create New Wallet
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons – Slim & Clean */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              paddingTop: "16px",
              borderTop: `1.5px solid ${BORDER_LIGHT}`
            }}>
              {isAdmin && (
                <button
                  onClick={() => { navigate("/admin"); setMobileMenuOpen(false); }}
                  style={{
                    padding: "14px 16px",
                    background: SAPPHIRE_LIGHT,
                    color: SAPPHIRE_BLUE,
                    border: `2px solid ${SAPPHIRE_BLUE}`,
                    borderRadius: "14px",
                    fontWeight: "600",
                    fontSize: "15px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}
                >
                  <Shield size={20} />
                  Admin Panel
                </button>
              )}

              <button
                onClick={() => supabase.auth.signOut()}
                style={{
                  padding: "14px 16px",
                  background: "#FEF2F2",
                  color: RED_DANGER,
                  border: `2px solid ${RED_DANGER}`,
                  borderRadius: "14px",
                  fontWeight: "600",
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Wallet Modal */}
      {showCreate && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 999,
          padding: "20px"
        }} onClick={() => setShowCreate(false)}>
          <div style={{
            background: WHITE,
            padding: "36px",
            borderRadius: "20px",
            boxShadow: "0 25px 70px rgba(0,0,0,0.18)",
            width: "100%",
            maxWidth: "440px",
            textAlign: "center"
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              fontSize: "26px",
              fontWeight: "700",
              marginBottom: "28px",
              color: TEXT_DARK
            }}>
              Create New Wallet
            </h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter wallet name..."
              autoFocus
              onKeyPress={(e) => e.key === "Enter" && createWallet()}
              style={{
                width: "100%",
                padding: "16px 18px",
                borderRadius: "12px",
                border: `2px solid ${BORDER_LIGHT}`,
                marginBottom: "28px",
                outline: "none",
                fontSize: "16px",
                fontWeight: "500",
                boxSizing: "border-box",
                transition: "all 0.25s",
                fontFamily: "inherit"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = SAPPHIRE_BLUE;
                e.target.style.boxShadow = "0 0 0 4px rgba(37,99,235,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = BORDER_LIGHT;
                e.target.style.boxShadow = "none";
              }}
            />

            <div style={{ display: "flex", gap: "14px" }}>
              <button
                onClick={createWallet}
                style={{
                  flex: 1,
                  padding: "16px",
                  background: SAPPHIRE_BLUE,
                  color: WHITE,
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "700",
                  fontSize: "16px",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  fontFamily: "inherit"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = DARK_NAVY)}
                onMouseLeave={(e) => (e.currentTarget.style.background = SAPPHIRE_BLUE)}
              >
                Create Wallet
              </button>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  flex: 1,
                  padding: "16px",
                  background: LIGHT_GRAY,
                  color: TEXT_DARK,
                  borderRadius: "12px",
                  border: `2px solid ${BORDER_LIGHT}`,
                  fontWeight: "700",
                  fontSize: "16px",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  fontFamily: "inherit"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = BORDER_LIGHT;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = LIGHT_GRAY;
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}