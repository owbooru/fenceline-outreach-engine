import { useState, useEffect } from "react";
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
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Search, label: "Find", path: "/leads/sourcing" },
  { icon: Filter, label: "Segment", path: "/leads/management" },
  { icon: FileText, label: "Templates", path: "/campaigns" },
  { icon: Send, label: "Campaigns", path: "/engagement" },
  { icon: Activity, label: "Tracking", path: "/salesforce" },
  { icon: Settings, label: "Settings", path: "/domains" },
];

const AUTH_KEY = "fenceline-auth";
const CORRECT_PASSWORD = "Fenceline!";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem(AUTH_KEY) === "true");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [location, setLocation] = useLocation();

  const handleLogin = () => {
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_KEY, "true");
      setError("");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fb]">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#1a1a2e] flex items-center justify-center">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-center text-[#1a1a2e]">
              Lead Engine
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#999]">
              Quiet Logic
            </p>
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
              className="w-full bg-[#1a1a2e] hover:bg-[#2a2a4e] text-white font-semibold rounded-lg"
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
      {/* Dark Sidebar */}
      <div className="w-[240px] bg-[#1a1a2e] text-white flex flex-col shrink-0">
        <div className="px-6 pt-6 pb-7 border-b border-white/[0.08]">
          <h1 className="text-lg font-extrabold tracking-tight">Lead Engine</h1>
          <div className="text-[11px] text-white/[0.35] mt-1 font-semibold uppercase tracking-widest">Quiet Logic</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <div
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all ${
                  isActive
                    ? "bg-white/10 text-white font-semibold"
                    : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
                }`}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-white/[0.08]">
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
