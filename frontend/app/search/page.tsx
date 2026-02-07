"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { constants, providers, bookings } from "@/lib/api";
import type { ProviderSearchResult } from "@/lib/api";

export default function SearchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [homeServices, setHomeServices] = useState<string[]>([]);
  const [tutorSubjects, setTutorSubjects] = useState<string[]>([]);
  const [searchType, setSearchType] = useState<"home" | "tutor">("home");
  const [selectedService, setSelectedService] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [results, setResults] = useState<ProviderSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingModal, setBookingModal] = useState<ProviderSearchResult | null>(null);
  const [bookingPrice, setBookingPrice] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    constants.serviceTypes().then((r) => {
      setHomeServices(r.data.home_services);
      setTutorSubjects(r.data.tutor_subjects);
    }).catch(() => {});
  }, [user, authLoading, router]);

  const runSearch = async () => {
    setLoading(true);
    try {
      if (searchType === "home" && selectedService) {
        const { data } = await providers.search({ service_type: selectedService });
        setResults(data);
      } else if (searchType === "tutor" && selectedSubject) {
        const { data } = await providers.search({ subject: selectedSubject });
        setResults(data);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!bookingModal || !bookingPrice || user?.role !== "customer") return;
    const price = parseFloat(bookingPrice);
    if (Number.isNaN(price) || price <= 0) return;
    setBookingSubmitting(true);
    try {
      const serviceType = bookingModal.role === "tutor" ? "tutor" : (bookingModal.service_type || "");
      const subject = bookingModal.subject || undefined;
      await bookings.create(bookingModal.id, serviceType, price, subject);
      setBookingModal(null);
      setBookingPrice("");
      runSearch();
    } catch (e) {
      console.error(e);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (authLoading || !user) return null;

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
              href="/dashboard"
              className="px-4 py-3 md:py-0 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 md:hover:bg-transparent"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Find providers</h1>
        <p className="text-slate-600 mb-6 sm:mb-8">
          Only AI-verified providers are shown. You can propose a price; the provider will accept or decline.
        </p>

        <div className="mb-8 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:items-end">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSearchType("home")}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                searchType === "home"
                  ? "bg-primary-600 text-white shadow-soft"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Home services
            </button>
            <button
              type="button"
              onClick={() => setSearchType("tutor")}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                searchType === "tutor"
                  ? "bg-primary-600 text-white shadow-soft"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Tutors
            </button>
          </div>
          {searchType === "home" && (
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="input-base max-w-xs"
            >
              <option value="">Select service</option>
              {homeServices.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
          {searchType === "tutor" && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="input-base max-w-xs"
            >
              <option value="">Select subject</option>
              {tutorSubjects.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={runSearch}
            disabled={loading}
            className="btn-primary min-w-[120px]"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="space-y-4">
          {results.map((p) => (
            <div
              key={`${p.id}-${p.role}`}
              className="p-5 sm:p-6 card flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-800 text-lg">{p.name}</h2>
                <p className="text-sm text-slate-500">{p.email}</p>
                <p className="text-sm text-slate-600 mt-1">
                  {p.role === "worker" ? p.service_type?.replace(/_/g, " ") : p.subject?.replace(/_/g, " ")} · Trust: {p.trust_score} · Status:{" "}
                  <span className={p.verification_status === "approved" ? "text-green-600 font-medium" : "text-amber-600"}>
                    {p.verification_status}
                  </span>
                </p>
                {p.price != null && <p className="text-sm font-medium text-slate-700">Price: ₹{p.price}</p>}
                {p.rating != null && <p className="text-sm text-slate-600">Rating: {p.rating}</p>}
                {p.profile_summary && (
                  <p className="text-sm text-slate-600 mt-2 italic border-l-2 border-slate-200 pl-3">&quot;{p.profile_summary}&quot;</p>
                )}
                {p.qualification_score != null && (
                  <p className="text-sm text-slate-600">
                    Qualification: {p.qualification_score} · Skill: {p.skill_score}
                  </p>
                )}
              </div>
              {user.role === "customer" && (
                <button
                  type="button"
                  onClick={() => {
                    setBookingModal(p);
                    setBookingPrice(p.price != null ? String(p.price) : "");
                  }}
                  className="btn-primary shrink-0"
                >
                  Book
                </button>
              )}
            </div>
          ))}
        </div>
        {results.length === 0 && !loading && (selectedService || selectedSubject) && (
          <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 text-center text-slate-500">
            No approved providers found.
          </div>
        )}
      </main>

      {bookingModal && user?.role === "customer" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-card-hover animate-slide-up">
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Request booking with {bookingModal.name}</h3>
            {bookingModal.price != null && (
              <p className="text-sm text-slate-600 mb-2">Provider&apos;s price: ₹{bookingModal.price}</p>
            )}
            <p className="text-sm text-slate-600 mb-4">
              Propose your price below. The provider will accept or decline your request.
            </p>
            <label htmlFor="proposed_price" className="block text-sm font-medium text-slate-700 mb-1.5">Your proposed price</label>
            <input
              id="proposed_price"
              type="number"
              placeholder="e.g. 500"
              value={bookingPrice}
              onChange={(e) => setBookingPrice(e.target.value)}
              min="0"
              step="0.01"
              className="input-base mb-6"
            />
            <div className="flex gap-3 justify-end flex-wrap">
              <button
                type="button"
                onClick={() => setBookingModal(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBook}
                disabled={bookingSubmitting}
                className="btn-primary"
              >
                {bookingSubmitting ? "Sending..." : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
