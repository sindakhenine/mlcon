import type { Metadata } from "next";
import Link from "next/link";
import { LabClient } from "./LabClient";

export const metadata: Metadata = {
  title: "Lab: building blocks",
  robots: { index: false },
};

export default function Lab() {
  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center gap-4">
        <Link href="/" className="text-sm text-brand">← Home</Link>
        <h1 className="text-xl font-semibold">Lab: the player and its building blocks</h1>
      </div>
      <LabClient />
    </main>
  );
}
