"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { constants, workers } from "@/lib/api";

export default function WorkerProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState("");
  const [price, setPrice] = useState("");
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "worker") {
      router.push("/dashboard");
      return;
    }
    constants.serviceTypes().then((r) => setServiceTypes(r.data.home_services)).catch(() => {});
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await workers.createProfile(serviceType, idDocument || undefined);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;
  if (user.role !== "worker") return null;

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-slate-800 tracking-tight hover:text-primary-600 transition-colors">
            Urban
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Create worker profile</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Upload your ID document and select a service type. AI will verify your identity and approve or reject your profile.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-soft">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{error}</p>
          )}
          <div>
            <label htmlFor="service_type" className="block text-sm font-medium text-slate-700 mb-1.5">
              Service type
            </label>
            <select
              id="service_type"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              required
              className="input-base"
            >
              <option value="">Select</option>
              {serviceTypes.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-1.5">
              Your price (per job / per session)
            </label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="e.g. 500"
              className="input-base"
            />
          </div>
          <div>
            <label htmlFor="id_document" className="block text-sm font-medium text-slate-700 mb-1.5">
              ID document (optional for prototype)
            </label>
            <input
              id="id_document"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 rounded-xl border-2 border-surface-200 bg-white file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-medium file:cursor-pointer"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
            {loading ? "Submitting..." : "Submit for AI verification"}
          </button>
        </form>
      </main>
    </div>
  );
}
