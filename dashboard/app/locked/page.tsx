import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { LockForm } from "./LockForm";

export const metadata: Metadata = {
  title: "Private preview",
  robots: { index: false, follow: false },
};

export default function Locked() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-line bg-surface p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-brand">
          <Lock size={22} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">Private preview</h1>
        <p className="mt-2 text-muted">This demo opens at MLCon Berlin 2026. Enter the access code to continue.</p>
        <LockForm />
      </div>
    </main>
  );
}
