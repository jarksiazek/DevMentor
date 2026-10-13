import Link from "next/link";

const features = [
  {
    title: "Guided learning paths",
    body: "Structured tracks that take developers from fundamentals to production-ready skills.",
  },
  {
    title: "1:1 mentoring",
    body: "Pair with experienced engineers for reviews, career advice and architecture sessions.",
  },
  {
    title: "Progress you can see",
    body: "Goals, milestones and feedback in one place for mentors and mentees.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-6 py-24">
      <section className="flex flex-col items-start gap-6">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          DevMentor
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Grow as a developer with mentors who have shipped it before.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          DevMentor connects developers with experienced engineers for focused, practical mentoring.
        </p>
        <Link
          href="/backend"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Open the backend
        </Link>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
