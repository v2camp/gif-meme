"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { SearchInput } from "@/components/search/SearchInput";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { Logo } from "@/components/brand/Logo";
import type { SessionPayload } from "@/lib/auth/jwt";
import { hasSignedInCookie } from "@/lib/auth/signed-in-cookie";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/browse", label: "browse" },
  { href: "/upload", label: "upload" },
  { href: "/trending", label: "trending" },
  { href: "/favorites", label: "favorites" },
];

export function Header({ session }: { session?: SessionPayload | null }) {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [liveSession, setLiveSession] = useState<SessionPayload | null | undefined>(session);

  useEffect(() => {
    setLiveSession(session);
  }, [session]);

  useEffect(() => {
    if (session) {
      return;
    }
    if (!hasSignedInCookie(document.cookie)) {
      return;
    }

    let cancelled = false;
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as { user?: SessionPayload };
      })
      .then((data) => {
        if (!cancelled && data?.user) {
          setLiveSession(data.user);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session]);

  const currentSession = liveSession ?? null;
  const isAuthenticated = !!currentSession;

  // Get first letter of email for avatar fallback
  const getInitial = () => {
    if (!currentSession?.email) return "?";
    return currentSession.email[0].toUpperCase();
  };

  // Handle logout
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [dropdownOpen]);

  return (
    <header className="site-header" role="banner">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand" aria-label="GIF Meme home">
          <Logo size={32} />
          <span className="site-header__brand-name">GifMeme</span>
        </Link>

        <div className="site-header__search">
          <SearchInput placeholder="search..." />
        </div>

        <nav
          className={`site-header__nav${menuOpen ? " site-header__nav--open" : ""}`}
          aria-label="Primary navigation"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="site-header__nav-link"
              onClick={() => setMenuOpen(false)}
            >
              <span className="site-header__bracket">[</span>
              {label}
              <span className="site-header__bracket">]</span>
            </Link>
          ))}
        </nav>

      <button
        type="button"
        className="site-header__theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
          {theme === "light" ? "◑" : "◐"}
        </button>

        {!isAuthenticated && (
          <button
            type="button"
            className="site-header__login-button"
            onClick={() => setLoginDialogOpen(true)}
            aria-label="Sign in"
            title="Sign in"
          >
            [sign in]
          </button>
        )}

        {isAuthenticated && (
          <div className="site-header__avatar-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="site-header__avatar-button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-label="Open user menu"
            >
              {currentSession?.avatarUrl ? (
                <img
                  src={currentSession.avatarUrl}
                  alt=""
                  className="site-header__avatar-img"
                />
              ) : (
                <div className="site-header__avatar-fallback">
                  {getInitial()}
                </div>
              )}
            </button>

            {dropdownOpen && (
              <div className="site-header__dropdown-menu">
                <Link
                  href="/favorites"
                  prefetch={false}
                  className="site-header__dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <span className="site-header__dropdown-icon">❤️</span>
                  My Favorites
                </Link>
                <button
                  type="button"
                  className="site-header__dropdown-item site-header__dropdown-item--button"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}

        <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />

        <button
          type="button"
          className="site-header__mobile-toggle"
          data-testid="mobile-menu-toggle"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="site-header__mobile-nav" aria-hidden="false">
          <div className="site-header__mobile-search">
            <SearchInput placeholder="search..." />
          </div>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="site-header__mobile-nav-link"
              onClick={() => setMenuOpen(false)}
            >
              <span className="site-header__bracket">[</span>
              {label}
              <span className="site-header__bracket">]</span>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
