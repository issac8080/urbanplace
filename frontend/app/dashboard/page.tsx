"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { workers, tutors, bookings } from "@/lib/api";
import type { Booking, WorkerProfile, TutorProfile } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const bookingsRes = await bookings.list();
        setBookingsList(bookingsRes.data);
        if (user.role === "worker") {
          workers.getProfile().then((r) => setWorkerProfile(r.data)).catch(() => {});
        }
        if (user.role === "tutor") {
          tutors.getProfile().then((r) => setTutorProfile(r.data)).catch(() => {});
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, authLoading, router]);

  const updateBookingStatus = async (bookingId: number, status: string) => {
    try {
      await bookings.updateStatus(bookingId, status);
      const { data } = await bookings.list();
      setBookingsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (authLoading || !user) return null;
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

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold text-slate-800 tracking-tight hover:text-primary-600 transition-colors">
            Urban
          </Link>
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
              href="/search"
              className="px-4 py-3 md:py-0 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 md:hover:bg-transparent"
              onClick={() => setMenuOpen(false)}
            >
              Find Providers
            </Link>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); logout(); }}
              className="px-4 py-3 md:py-0 text-left md:text-center text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 md:hover:bg-transparent"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Dashboard</h1>
        <p className="text-slate-600 mb-8">
          {user.name} <span className="text-slate-400">({user.role})</span> · Trust score: <span className="font-medium text-slate-700">{user.trust_score}</span>
        </p>

        {/* Provider profile setup */}
        {user.role === "worker" && !workerProfile && (
          <div className="mb-8 p-6 sm:p-8 bg-amber-50/80 border-2 border-amber-200/80 rounded-2xl shadow-soft">
            <h2 className="font-semibold text-amber-800 mb-2">Complete your worker profile</h2>
            <p className="text-amber-700/90 text-sm sm:text-base mb-4 leading-relaxed">
              Upload your ID and select a service type to get AI-verified and start receiving bookings.
            </p>
            <Link
              href="/dashboard/worker-profile"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 shadow-soft transition-all"
            >
              Create profile
            </Link>
          </div>
        )}
        {user.role === "tutor" && !tutorProfile && (
          <div className="mb-8 p-6 sm:p-8 bg-amber-50/80 border-2 border-amber-200/80 rounded-2xl shadow-soft">
            <h2 className="font-semibold text-amber-800 mb-2">Complete your tutor profile</h2>
            <p className="text-amber-700/90 text-sm sm:text-base mb-4 leading-relaxed">
              Add qualifications, experience, and a demo transcript for AI evaluation.
            </p>
            <Link
              href="/dashboard/tutor-profile"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 shadow-soft transition-all"
            >
              Create profile
            </Link>
          </div>
        )}

        {workerProfile && (
          <div className="mb-8 p-6 sm:p-8 card">
            <h2 className="font-semibold text-slate-800 mb-2">Worker profile</h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Service: <span className="font-medium">{workerProfile.service_type?.replace(/_/g, " ")}</span> · Status:{" "}
              <span className={workerProfile.verification_status === "approved" ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                {workerProfile.verification_status}
              </span>
              {" "}· Rating: {workerProfile.rating}
            </p>
          </div>
        )}
        {tutorProfile && (
          <div className="mb-8 p-6 sm:p-8 card">
            <h2 className="font-semibold text-slate-800 mb-2">Tutor profile</h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Subject: <span className="font-medium">{tutorProfile.subject?.replace(/_/g, " ")}</span> · Qualification score: {tutorProfile.qualification_score ?? "—"} · Skill score: {tutorProfile.skill_score ?? "—"} · Status:{" "}
              <span className={tutorProfile.verification_status === "approved" ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                {tutorProfile.verification_status}
              </span>
            </p>
            {tutorProfile.profile_summary && (
              <p className="text-slate-600 text-sm mt-3 italic border-l-2 border-slate-200 pl-3">&quot;{tutorProfile.profile_summary}&quot;</p>
            )}
          </div>
        )}

        <h2 className="text-lg font-semibold text-slate-800 mb-4">Bookings</h2>
        {bookingsList.length === 0 ? (
          <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 text-center text-slate-500">
            No bookings yet.
          </div>
        ) : (
          <ul className="space-y-4">
            {bookingsList.map((b) => (
              <li
                key={b.id}
                className="p-4 sm:p-6 bg-white border border-slate-200/80 rounded-2xl shadow-soft flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">
                    {b.service_type?.replace(/_/g, " ")}
                    {b.subject ? ` · ${b.subject?.replace(/_/g, " ")}` : ""}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Amount: ₹{b.total_price} · Status: <span className="font-medium text-slate-600">{b.status}</span>
                  </p>
                </div>
                {user.role !== "customer" && b.provider_id === user.id && b.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateBookingStatus(b.id, "accepted")}
                      className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => updateBookingStatus(b.id, "cancelled")}
                      className="btn-secondary py-2 text-sm"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {(b.customer_id === user.id || b.provider_id === user.id) && b.status === "accepted" && (
                  <button
                    type="button"
                    onClick={() => updateBookingStatus(b.id, "completed")}
                    className="btn-primary py-2 text-sm"
                  >
                    Mark completed
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
