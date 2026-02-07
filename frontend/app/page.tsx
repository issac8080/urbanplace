"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

function NavLoggedIn({ user, logout }: { user: { name: string; role: string }; logout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Toggle menu"
        className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {menuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      <nav
        className={`absolute md:relative top-full left-0 right-0 md:left-auto md:right-auto mt-2 md:mt-0
          flex flex-col md:flex-row items-stretch md:items-center gap-1 md:gap-4
          bg-white md:bg-transparent border border-slate-200 md:border-0 rounded-2xl md:rounded-none
          shadow-soft md:shadow-none overflow-hidden
          ${menuOpen ? "block animate-fade-in" : "hidden md:flex"}`}
      >
        <span className="px-4 py-3 md:py-0 text-sm text-slate-600 border-b md:border-0 border-slate-100">
          {user.name} <span className="text-slate-400">({user.role})</span>
        </span>
        <Link
          href="/dashboard"
          className="px-4 py-3 md:py-0 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50/50 md:hover:bg-transparent"
          onClick={() => setMenuOpen(false)}
        >
          Dashboard
        </Link>
        <Link
          href="/search"
          className="px-4 py-3 md:py-0 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 md:hover:bg-transparent"
          onClick={() => setMenuOpen(false)}
        >
          Find Providers
        </Link>
        <button
          type="button"
          className="px-4 py-3 md:py-0 text-left md:text-center text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 md:hover:bg-transparent"
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
      </nav>
    </>
  );
}

function NavGuest() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Toggle menu"
        className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {menuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      <nav
        className={`absolute md:relative top-full left-0 right-0 md:left-auto md:right-auto mt-2 md:mt-0
          flex flex-col md:flex-row items-stretch md:items-center gap-0 md:gap-4
          bg-white md:bg-transparent border border-slate-200 md:border-0 rounded-2xl md:rounded-none shadow-soft md:shadow-none overflow-hidden
          ${menuOpen ? "block animate-fade-in" : "hidden md:flex"}`}
      >
        <Link
          href="/login"
          className="px-4 py-3 md:py-0 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 md:hover:bg-transparent"
          onClick={() => setMenuOpen(false)}
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-4 py-3 md:py-0 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50/50 md:hover:bg-transparent"
          onClick={() => setMenuOpen(false)}
        >
          Register
        </Link>
        <Link
          href="/chat"
          className="px-4 py-3 md:py-0 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 md:hover:bg-transparent"
          onClick={() => setMenuOpen(false)}
        >
          AI Assistant
        </Link>
      </nav>
    </>
  );
}

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="text-xl font-bold text-slate-800 tracking-tight hover:text-primary-600 transition-colors">
              Urban
            </Link>
            <NavLoggedIn user={user} logout={logout} />
          </div>
        </header>
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2 animate-slide-up">
            Welcome back, {user.name}
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mb-10">
            AI-governed home services and tutor marketplace. Find verified providers or manage your bookings.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Link href="/chat" className="card block p-6 sm:p-8 group">
              <h2 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">
                AI Assistant
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Describe your problem in plain language and get provider recommendations.
              </p>
            </Link>
            <Link href="/search" className="card block p-6 sm:p-8 group">
              <h2 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">
                Find Providers
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Search approved home service workers and tutors.
              </p>
            </Link>
            <Link href="/dashboard" className="card block p-6 sm:p-8 group">
              <h2 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">
                Dashboard
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                View your profile and bookings.
              </p>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <span className="text-xl font-bold text-slate-800 tracking-tight">Urban</span>
          <NavGuest />
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-800 mb-4 sm:mb-6 leading-tight animate-slide-up">
            AI-Governed Home Services & Tutor Marketplace
          </h1>
          <p className="text-slate-600 text-lg sm:text-xl max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed">
            Connect with verified home service providers and tutors. Identity and qualifications are validated by AI—minimal human admin, maximum trust.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link href="/register" className="btn-primary text-base px-8 py-3.5">
              Get Started
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3.5">
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
