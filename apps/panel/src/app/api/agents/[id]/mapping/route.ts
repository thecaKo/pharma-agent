import { NextResponse } from "next/server";
import { saveMapping } from "@/services/mappings";
import { ProductMapping } from "@/types/agent";

type Params = {
  params: { id: string };
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as Partial<ProductMapping>;
  const mapping: ProductMapping = {
    table: String(body.table ?? "").trim(),
    idField: String(body.idField ?? "").trim(),
    nameField: String(body.nameField ?? "").trim(),
    priceField: cleanOptional(body.priceField),
    stockField: cleanOptional(body.stockField),
    imageField: cleanOptional(body.imageField)
  };

  if (!mapping.table || !mapping.idField || !mapping.nameField) {
    return NextResponse.json({
      success: false,
      message: "Tabela, ID e campo de nome sao obrigatorios."
    }, { status: 400 });
  }

  const saved = await saveMapping(params.id, mapping);
  return NextResponse.json({ success: true, data: saved });
}

function cleanOptional(value: unknown) {
  const text = String(value ?? "").trim();
  return text || undefined;
}
