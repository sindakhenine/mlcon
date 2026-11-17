import type { Metadata } from "next";
import { StageClient } from "@/components/stage/StageClient";

export const metadata: Metadata = { title: "Stage S1", robots: { index: false } };

export default function Stage() {
  return <StageClient session="s1" />;
}
