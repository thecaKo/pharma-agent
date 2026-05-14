import { NextResponse } from "next/server";
import { createToken, listTokens } from "@/services/tokens";

export async function GET() {
  return NextResponse.json(await listTokens());
}

export async function POST() {
  const token = await createToken();
  return NextResponse.json({
    id: token.id,
    token: token.token,
    status: token.status
  });
}
