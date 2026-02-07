"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { constants, tutors } from "@/lib/api";

export default function TutorProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [qualificationText, setQualificationText] = useState("");
  const [experienceDescription, setExperienceDescription] = useState("");
  const [demoTranscript, setDemoTranscript] = useState("");
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [qualificationDocument, setQualificationDocument] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "tutor") {
      router.push("/dashboard");
      return;
    }
    constants.serviceTypes().then((r) => setSubjects(r.data.tutor_subjects)).catch(() => {});
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const priceNum = parseFloat(price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        setError("Please enter a valid price");
        return;
      }
      await tutors.createProfile({
        subject,
        price: priceNum,
        qualification_text: qualificationText,
        experience_description: experienceDescription,
        demo_transcript: demoTranscript,
        id_document: idDocument || undefined,
        qualification_document: qualificationDocument || undefined,
      });
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;
  if (user.role !== "tutor") return null;

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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Create tutor profile</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Add your qualifications, experience, and a demo teaching transcript. AI will evaluate and return qualification score, skill score, approval status, and a profile summary.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-soft">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{error}</p>
          )}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1.5">
              Subject
            </label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="input-base"
            >
              <option value="">Select</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-1.5">
              Your price (per session)
            </label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="e.g. 800"
              className="input-base"
            />
          </div>
          <div>
            <label htmlFor="qualification_text" className="block text-sm font-medium text-slate-700 mb-1.5">
              Qualification text
            </label>
            <textarea
              id="qualification_text"
              value={qualificationText}
              onChange={(e) => setQualificationText(e.target.value)}
              rows={3}
              placeholder="e.g. B.Sc Mathematics, M.Ed"
              className="input-base resize-y min-h-[80px]"
            />
          </div>
          <div>
            <label htmlFor="experience_description" className="block text-sm font-medium text-slate-700 mb-1.5">
              Experience description
            </label>
            <textarea
              id="experience_description"
              value={experienceDescription}
              onChange={(e) => setExperienceDescription(e.target.value)}
              rows={3}
              placeholder="Years of teaching, institutions, etc."
              className="input-base resize-y min-h-[80px]"
            />
          </div>
          <div>
            <label htmlFor="demo_transcript" className="block text-sm font-medium text-slate-700 mb-1.5">
              Demo teaching transcript (required)
            </label>
            <textarea
              id="demo_transcript"
              value={demoTranscript}
              onChange={(e) => setDemoTranscript(e.target.value)}
              required
              rows={6}
              placeholder="Paste or type a sample of how you would explain a topic to a student..."
              className="input-base resize-y min-h-[140px]"
            />
          </div>
          <div>
            <label htmlFor="id_document" className="block text-sm font-medium text-slate-700 mb-1.5">
              ID document (optional)
            </label>
            <input
              id="id_document"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 rounded-xl border-2 border-surface-200 bg-white file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-medium file:cursor-pointer"
            />
          </div>
          <div>
            <label htmlFor="qualification_document" className="block text-sm font-medium text-slate-700 mb-1.5">
              Qualification document (optional)
            </label>
            <input
              id="qualification_document"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setQualificationDocument(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 rounded-xl border-2 border-surface-200 bg-white file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-medium file:cursor-pointer"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
            {loading ? "Submitting for AI evaluation..." : "Submit for AI evaluation"}
          </button>
        </form>
      </main>
    </div>
  );
}
