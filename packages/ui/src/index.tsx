"use client";

import React, { ReactNode } from "react";
import "../styles/style.css";

export type NavItem = {
  label: string;
  icon?: string;
  href: string;
  isActive?: boolean;
  onSelect?: () => void;
};

export type AppShellProps = {
  children: React.ReactNode;
  navSections: Array<{
    title: string;
    items: NavItem[];
  }>;
  workspaceName: string;
  userName?: string;
  onThemeToggle?: () => void;
  themeSymbol?: string;
  searchSlot?: ReactNode;
  footerSlot?: ReactNode;
  topbarExtras?: ReactNode;
  brandIcon?: ReactNode;
  isSidebarOpen?: boolean;
  onSidebarOpen?: () => void;
  onSidebarClose?: () => void;
};

export function AppShell({
  children,
  navSections,
  workspaceName,
  userName,
  onThemeToggle,
  themeSymbol = "🌙",
  searchSlot,
  footerSlot,
  topbarExtras,
  brandIcon = "🛡️",
  isSidebarOpen = false,
  onSidebarOpen,
  onSidebarClose
}: AppShellProps) {
  return (
    <div className="app">
      <aside
        id="sidebar"
        className={`sidebar${isSidebarOpen ? " is-open" : ""}`}
      >
        <header className="sidebar__header">
          <button
            className="iconbtn only-mobile"
            type="button"
            aria-label="サイドバーを閉じる"
            onClick={onSidebarClose}
          >
            <span aria-hidden>←</span>
          </button>
          <div className="ws">
            <div className="ws__icon">{brandIcon}</div>
            <div className="ws__name">{workspaceName}</div>
          </div>
        </header>
        <nav className="nav">
          {navSections.map((section) => (
            <div key={section.title} className="nav__section">
              <div className="nav__title">{section.title}</div>
              {section.items.map((item) => (
                <a
                  key={item.href}
                  className={`nav__item js-nav${
                    item.isActive ? " is-active" : ""
                  }`}
                  data-target={item.href}
                  href={item.href}
                  onClick={(evt) => {
                    if (item.onSelect) {
                      evt.preventDefault();
                      item.onSelect();
                    }
                  }}
                >
                  <span className="nav__icon">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>
        <footer className="sidebar__footer">{footerSlot}</footer>
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            className="iconbtn only-mobile"
            type="button"
            aria-label="サイドバーを開く"
            onClick={onSidebarOpen}
          >
            <span aria-hidden>☰</span>
          </button>
          {searchSlot}
          <div className="topbar__spacer" />
          {topbarExtras}
          <button
            className="iconbtn"
            id="themeToggle"
            type="button"
            onClick={onThemeToggle}
          >
            <span id="themeIcon" aria-hidden>
              {themeSymbol}
            </span>
          </button>
          <div className="avatar">{userName ? userName[0] : "G"}</div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

export function ThemeClientScript() {
  const code = `(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const eff = saved || (prefersDark ? 'dark' : 'light');
  root.setAttribute('data-theme', eff);
  const iconEl = document.getElementById('themeIcon');
  if (iconEl) iconEl.textContent = eff === 'dark' ? '☀️' : '🌙';
})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
