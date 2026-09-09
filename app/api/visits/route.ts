import { NextResponse } from "next/server";
import { recordVisit } from "@/lib/visits";

export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }
  const path = typeof body === "object" && body && "path" in body ? (body as { path: unknown }).path : null;
  const result = await recordVisit(path);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, deduped: result.deduped });
}
