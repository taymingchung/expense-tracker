import { LogOut, Shield, WalletCards, Plus, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
// NOTE: Assuming "../supabaseClient" is correctly configured
import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";

// Define a breakpoint for mobile/small screens
const MOBILE_BREAKPOINT = "600px";

// --- Color Palette ---
const PRIMARY_INDIGO = "#4F46E5"; // Primary action color
const LIGHT_INDIGO = "#EEF2FF"; // Light background for primary elements
const RED_DANGER = "#DC2626"; // Strong red for dangerous actions
const LIGHT_RED = "#FEE2E2"; // Light red for hover/active state
const GRAY_BORDER = "#E5E7EB"; // General border color
const GRAY_BG = "#F3F4F6"; // General background for elements

export default function Navbar() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [currentWallet, setCurrentWallet] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");

  const loadWallets = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch owned wallets
    const { data: owned } = await supabase
      .from("wallets")
      .select("id, name")
      .eq("owner_id", user.id);

    // Fetch shared wallets
    const { data: shared } = await supabase
      .from("wallet_members")
      .select("wallets!inner(id, name)")
      .eq("user_id", user.id);

    const sharedWallets =
      shared?.map((m) => ({
        id: m.wallets.id,
        name: m.wallets.name,
      })) || [];

    // Combine and deduplicate wallets
    const walletMap = new Map();
    [...(owned || []), ...sharedWallets].forEach((w) =>
      walletMap.set(w.id, w)
    );

    const allWallets = Array.from(walletMap.values());
    setWallets(allWallets);

    // Set initial current wallet
    const savedId = localStorage.getItem("currentWalletId");
    const selected =
      allWallets.find((w) => w.id === savedId) || allWallets[0] || null;

    setCurrentWallet(selected);
    if (selected) localStorage.setItem("currentWalletId", selected.id);
  };

  const createWallet = async () => {
    if (!name.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Create the wallet
    const { data } = await supabase
      .from("wallets")
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (data) {
      // 2. Add the owner as a member
      await supabase
        .from("wallet_members")
        .insert({ wallet_id: data.id, user_id: user.id, role: "owner" });

      setName("");
      setShowCreate(false);
      loadWallets(); // Reload wallets to show the new one
    }
  };

  const checkAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      setIsAdmin(data?.is_admin || false);
    }
  };

  useEffect(() => {
    loadWallets();
    checkAdmin();
  }, []);

  // --- Styles for responsiveness (Mobile-first aesthetics) ---
  const mobileStyles = {
    // Media query utility
    mq: (style) => ({
      [`@media (max-width: ${MOBILE_BREAKPOINT})`]: style,
    }),
    // Smaller mobile button size
    button: {
      padding: "8px 12px",
      fontSize: "14px",
    },
    // Smaller mobile dropdown trigger size
    dropdown: {
      padding: "8px 12px",
      fontSize: "14px",
    },
  };

  // --- Main Navbar Layout Styles ---
  const navbarContainerStyle = {
    background: "#fff",
    // Modern change: Use a subtle shadow instead of just a border
    boxShadow: "0 1px 10px rgba(0,0,0,0.05)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  };

  const navbarContentStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 24px",
    height: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    ...mobileStyles.mq({
      padding: "0 12px", // Smaller horizontal padding on mobile
      height: "64px", // Adjusted height for mobile
    }),
  };

  // --- Wallet Dropdown Trigger Styles ---
  const dropdownTriggerStyle = {
    padding: "10px 16px",
    background: GRAY_BG,
    // Modern change: More rounded corners
    borderRadius: "20px",
    border: `1px solid ${GRAY_BORDER}`,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 600,
    color: "#111",
    transition: "background 0.2s",
    // Apply mobile styling
    ...mobileStyles.mq(mobileStyles.dropdown),
  };

  // --- Right-side Button Styles (Admin & Logout) ---
  const baseButtonStyle = {
    borderRadius: "20px", // More rounded for modern look
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "6px", // Reduced gap for tighter look
    cursor: "pointer",
    border: "none",
    transition: "all 0.2s",
    // Inherit the responsive padding/font
    ...mobileStyles.button,
  };

  const adminButtonStyle = {
    ...baseButtonStyle,
    background: LIGHT_INDIGO,
    color: PRIMARY_INDIGO,
    fontWeight: 600,
    border: `1px solid ${PRIMARY_INDIGO}`, // Stronger border for admin button
  };

  const logoutButtonStyle = {
    ...baseButtonStyle,
    background: RED_DANGER,
    color: "white",
    // Hover style simulation
    ":hover": {
        background: "#B91C1C" // Darker red on hover
    }
  };

  // --- Create Wallet Modal Styles ---
  const modalContainerStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  };

  const modalContentStyle = {
    background: "white",
    padding: "40px",
    borderRadius: "20px", // More rounded
    boxShadow: "0 15px 30px rgba(0,0,0,0.2)",
    width: "90%",
    maxWidth: "420px",
    ...mobileStyles.mq({
      padding: "20px",
      borderRadius: "16px",
    }),
  };

  // Modal button style inherited from mobileStyles.button
  const modalButtonBase = {
    flex: 1,
    padding: "14px",
    borderRadius: "10px",
    fontWeight: "700",
    transition: "background 0.2s",
    ...mobileStyles.mq(mobileStyles.button),
  };

  return (
    <>
      {/* Navbar */}
      <div style={navbarContainerStyle}>
        <div style={navbarContentStyle}>
          {/* Left: Logo and Wallet Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "900",
                color: PRIMARY_INDIGO,
                ...mobileStyles.mq({
                  fontSize: "24px",
                }),
              }}
            >
              ETW
            </h1>

            {/* Wallet Dropdown */}
            {wallets.length > 0 && (
              <div style={{ position: "relative" }}>
                {/* Dropdown Trigger */}
                <div
                  onClick={() => setShowMenu(!showMenu)}
                  style={dropdownTriggerStyle}
                >
                  <WalletCards size={20} />
                  {currentWallet?.name}
                  <ChevronDown
                    size={18}
                    style={{
                      transform: showMenu ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "0.25s",
                    }}
                  />
                </div>

                {/* Dropdown Menu — Modern Card Style */}
                {showMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "120%", // Slightly lower position
                      left: 0,
                      width: "280px",
                      background: "#fff",
                      borderRadius: "16px",
                      boxShadow:
                        "0 12px 28px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.05)",
                      overflow: "hidden",
                      zIndex: 200,
                      border: `1px solid ${GRAY_BORDER}`,
                      ...mobileStyles.mq({
                        width: "220px",
                      }),
                    }}
                  >
                    {wallets.map((w) => (
                      <div
                        key={w.id}
                        onClick={() => {
                          setCurrentWallet(w);
                          localStorage.setItem("currentWalletId", w.id);
                          setShowMenu(false);
                          // Force reload to update entire app context (typical in single-page apps without global state)
                          window.location.reload();
                        }}
                        style={{
                          padding: "14px 18px",
                          fontSize: "16px",
                          cursor: "pointer",
                          background:
                            currentWallet?.id === w.id
                              ? LIGHT_INDIGO
                              : "transparent",
                          borderBottom: `1px solid ${GRAY_BORDER}`,
                          color:
                            currentWallet?.id === w.id
                              ? PRIMARY_INDIGO
                              : "#111",
                          fontWeight:
                            currentWallet?.id === w.id ? "600" : "400",
                          ...mobileStyles.mq({
                            padding: "10px 14px",
                            fontSize: "14px",
                          }),
                        }}
                        // Simulating hover effect
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            currentWallet?.id === w.id
                              ? LIGHT_INDIGO
                              : GRAY_BG)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            currentWallet?.id === w.id
                              ? LIGHT_INDIGO
                              : "transparent")
                        }
                      >
                        {w.name}
                      </div>
                    ))}

                    {/* Create New Wallet */}
                    <div
                      onClick={() => {
                        setShowCreate(true);
                        setShowMenu(false);
                      }}
                      style={{
                        padding: "14px 18px",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#059669", // Emerald green for "new"
                        background: "#F0FFF4",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        // Hover simulation
                        onMouseEnter: (e) =>
                          (e.currentTarget.style.background = "#D1FAE5"),
                        onMouseLeave: (e) =>
                          (e.currentTarget.style.background = "#F0FFF4"),
                        ...mobileStyles.mq({
                          padding: "10px 14px",
                          fontSize: "14px",
                        }),
                      }}
                    >
                      <Plus size={18} /> Create New Wallet
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Admin and Logout Buttons */}
          <div style={{ display: "flex", gap: "8px" }}>
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                style={adminButtonStyle}
              >
                <Shield size={18} />
                <span
                    style={mobileStyles.mq({
                        display: "none" // Hide text on mobile for tighter fit
                    })}
                >
                    Admin
                </span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={() => supabase.auth.signOut()}
              style={logoutButtonStyle}
              // Hover simulation
              onMouseEnter={(e) => (e.currentTarget.style.background = "#B91C1C")}
              onMouseLeave={(e) => (e.currentTarget.style.background = RED_DANGER)}
            >
              <LogOut size={18} />
              <span
                 style={mobileStyles.mq({
                    display: "none" // Hide text on mobile for tighter fit
                 })}
              >
                Logout
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Wallet Modal */}
      {showCreate && (
        <div
          style={modalContainerStyle}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={modalContentStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "700",
                marginBottom: "20px",
                color: "#1e293b",
                ...mobileStyles.mq({
                  fontSize: "20px",
                }),
              }}
            >
              Create New Wallet
            </h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wallet name..."
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: `1px solid ${GRAY_BORDER}`,
                marginBottom: "20px",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={createWallet}
                style={{
                  ...modalButtonBase,
                  background: PRIMARY_INDIGO,
                  color: "white",
                  // Hover simulation
                  onMouseEnter: (e) => (e.currentTarget.style.background = "#4338CA"),
                  onMouseLeave: (e) => (e.currentTarget.style.background = PRIMARY_INDIGO),
                }}
              >
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  ...modalButtonBase,
                  background: GRAY_BG,
                  color: "#475569",
                  fontWeight: "600",
                  // Hover simulation
                  onMouseEnter: (e) => (e.currentTarget.style.background = "#E5E7EB"),
                  onMouseLeave: (e) => (e.currentTarget.style.background = GRAY_BG),
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}