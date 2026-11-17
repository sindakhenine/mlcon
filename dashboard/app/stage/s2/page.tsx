import type { Metadata } from "next";
import { StageClient } from "@/components/stage/StageClient";

export const metadata: Metadata = { title: "Stage S2", robots: { index: false } };

export default function Stage() {
  return <StageClient session="s2" />;
}
