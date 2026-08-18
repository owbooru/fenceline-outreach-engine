import { useState } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  LayoutDashboard,
  Search,
  Filter,
  FileText,
  Send,
  Activity,
  Settings,
  Lock,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Search, label: "Find", path: "/find" },
  { icon: Filter, label: "Segment", path: "/segment" },
  { icon: FileText, label: "Templates", path: "/templates" },
  { icon: Send, label: "Campaigns", path: "/campaigns" },
  { icon: Activity, label: "Tracking", path: "/tracking" },
  { icon: ShieldCheck, label: "Compliance", path: "/compliance" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const AUTH_KEY = "fenceline-auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem(AUTH_KEY) === "true");
  const [isChecking, setIsChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [location, setLocation] = useLocation();

  // On mount, verify the session cookie is still valid server-side
  useEffect(() => {
    fetch("/api/access/status")
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          localStorage.setItem(AUTH_KEY, "true");
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem(AUTH_KEY);
        }
      })
      .catch(() => {
        // If status check fails, keep local state as-is
      })
      .finally(() => setIsChecking(false));
  }, []);

  const handleLogin = async () => {
    setError("");
    try {
      const res = await fetch("/api/access/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        localStorage.setItem(AUTH_KEY, "true");
        setPassword("");
      } else {
        setError(data.error || "Incorrect password. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/access/logout", { method: "POST" }).catch(() => {});
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fb]">
        <div className="h-8 w-8 border-2 border-[#1a4750] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fb]">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#1a4750] flex items-center justify-center">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-center text-[#1a4750]">
              Lead Engine
            </h1>
            <p className="text-sm text-[#777] text-center max-w-sm mt-2">
              Enter your password to access the lead generation platform.
            </p>
          </div>
          <div className="w-full space-y-3">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="text-center border-[#ddd] rounded-lg"
            />
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <Button
              onClick={handleLogin}
              className="w-full bg-[#1a4750] hover:bg-[#2a5a65] text-white font-semibold rounded-lg"
            >
              Access Platform
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Teal Sidebar */}
      <div className={`${collapsed ? "w-16" : "w-[240px]"} bg-[#1a4750] text-white flex flex-col shrink-0 transition-all duration-200 relative`}>
        <div className={`px-6 pt-6 pb-7 border-b border-white/[0.08] ${collapsed ? "px-3" : ""}`}>
          {!collapsed && <h1 className="text-lg font-extrabold tracking-tight">Lead Engine</h1>}
          {collapsed && <h1 className="text-lg font-extrabold tracking-tight text-center">LE</h1>}
        </div>
        <nav className={`flex-1 py-4 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
          {menuItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <div
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`flex items-center gap-2.5 ${collapsed ? "justify-center px-2" : "px-3"} py-2.5 rounded-lg cursor-pointer text-sm transition-all ${
                  isActive
                    ? "bg-white/10 text-white font-semibold"
                    : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
                }`}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            );
          })}
        </nav>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-16 left-0 w-full flex justify-center py-2.5 text-white/30 hover:text-white/70 transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
        <div className={`px-6 py-4 border-t border-white/[0.08] ${collapsed ? "hidden" : ""}`}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-[11px] text-white/25 hover:text-white/50 transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Lock Platform
          </button>
          <div className="text-[11px] text-white/25 mt-2">Prepared for Fenceline</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8f9fb]">
        {children}
      </div>
    </div>
  );
}
