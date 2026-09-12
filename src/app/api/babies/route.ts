// GET /api/babies — 获取宝宝列表
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/babies?select=id,name&order=name.asc`, { cache: "no-store", headers: { apiKey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY }, });
    if (!res.ok) return NextResponse.json({ babies: [] });
    const data = await res.json();
    return NextResponse.json({ babies: data || [] });
  } catch {
    return NextResponse.json({ babies: [] });
  }
}
