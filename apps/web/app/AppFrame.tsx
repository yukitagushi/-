"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell, NavItem } from "@silent-voice/ui";

type AppFrameProps = {
  children: ReactNode;
};

const navConfig: Array<{ title: string; items: Omit<NavItem, "isActive">[] }> = [
  {
    title: "ページ",
    items: [
      { label: "トップ", icon: "🏠", href: "/" },
      { label: "通報フォーム", icon: "📩", href: "/report" },
      { label: "ダッシュボード", icon: "📊", href: "/dashboard" },
      { label: "ケースフロー", icon: "🔁", href: "/flow" },
      { label: "監査ログ", icon: "🧾", href: "/audit" }
    ]
  },
  {
    title: "管理",
    items: [
      { label: "請求管理", icon: "💼", href: "/admin/billing" },
      { label: "システム", icon: "⚙️", href: "/admin/system" },
      { label: "ログイン(β)", icon: "🔐", href: "/auth" }
    ]
  }
];

export function AppFrame({ children }: AppFrameProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const saved = (localStorage.getItem("theme") as "light" | "dark" | null);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const eff = saved || (prefersDark ? "dark" : "light");
    root.setAttribute("data-theme", eff);
    setTheme(eff);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}/auth/session`, {
        credentials: "include"
      });
      if (!res.ok) {
        setUserEmail(null);
        return;
      }
      const data = await res.json();
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      } else {
        setUserEmail(null);
      }
    } catch (err) {
      console.warn("session fetch failed", err);
    }
  }, []);

  useEffect(() => {
    refreshSession();
    const handler = () => refreshSession();
    window.addEventListener("sv:session-changed", handler);
    return () => window.removeEventListener("sv:session-changed", handler);
  }, [refreshSession]);

  const handleThemeToggle = useCallback(() => {
    const root = document.documentElement;
    const nextTheme = theme === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  }, [theme]);

  const navSections = useMemo(() => {
    return navConfig.map((section) => ({
      title: section.title,
      items: section.items.map((item) => ({
        ...item,
        isActive: pathname === item.href,
        onSelect: () => {
          setSidebarOpen(false);
          if (pathname !== item.href) {
            router.push(item.href);
          }
        }
      }))
    }));
  }, [pathname, router]);

  const footerSlot = (
    <>
      <button className="textbtn" type="button" onClick={handleThemeToggle}>
        <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>
        <span style={{ marginLeft: 8 }}>テーマ切替</span>
      </button>
      <p className="hint">{userEmail ? `${userEmail} として閲覧中` : "ゲストモード"}</p>
      {userEmail && (
        <button
          className="textbtn"
          style={{ marginTop: 8 }}
          type="button"
          onClick={async () => {
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}/auth/logout`, {
              method: "POST",
              credentials: "include"
            });
            setUserEmail(null);
            router.push("/auth");
            window.dispatchEvent(new Event("sv:session-changed"));
          }}
        >
          ログアウト
        </button>
      )}
      <p className="hint">左メニューでページ切替。モバイルはメニューから。</p>
    </>
  );

  const searchSlot = (
    <div className="search" style={{ marginLeft: 12 }}>
      <span className="search__icon" aria-hidden>
        🔍
      </span>
      <input
        type="search"
        placeholder="ダッシュボード内検索…"
        aria-label="検索"
        onFocus={() => {
          if (pathname !== "/dashboard") {
            router.push("/dashboard");
          }
        }}
      />
    </div>
  );

  return (
    <AppShell
      navSections={navSections}
      workspaceName="サイレントボイス"
      userName={userEmail ?? "ゲスト"}
      onThemeToggle={handleThemeToggle}
      themeSymbol={theme === "dark" ? "☀️" : "🌙"}
      searchSlot={searchSlot}
      footerSlot={footerSlot}
      isSidebarOpen={sidebarOpen}
      onSidebarOpen={() => setSidebarOpen(true)}
      onSidebarClose={() => setSidebarOpen(false)}
    >
      {children}
    </AppShell>
  );
}
