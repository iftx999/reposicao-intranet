import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { ProfileCreateValues } from "@/lib/types";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: NextRequest) {
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nao configurada." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({ error: "Sessao ausente." }, { status: 401 });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
  }

  const { data: requesterProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();

  if (profileError || requesterProfile?.role !== "admin" || requesterProfile.active !== true) {
    return NextResponse.json({ error: "Apenas administradores podem criar usuarios." }, { status: 403 });
  }

  const body = (await request.json()) as Partial<ProfileCreateValues>;
  const fullName = body.full_name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const role = body.role || "operador";
  const sectorId = body.sector_id?.trim() || null;
  const active = body.active ?? true;

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "Nome, email e senha temporaria sao obrigatorios." }, { status: 400 });
  }

  if (!["admin", "gestor", "operador"].includes(role)) {
    return NextResponse.json({ error: "Role invalida." }, { status: 400 });
  }

  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      sector_id: sectorId
    }
  });

  if (createError || !authData.user) {
    return NextResponse.json({ error: createError?.message || "Erro ao criar usuario." }, { status: 400 });
  }

  const profile = {
    id: authData.user.id,
    full_name: fullName,
    email,
    role,
    sector_id: sectorId,
    active
  };

  const { data, error: profileInsertError } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .single();

  if (profileInsertError) {
    return NextResponse.json({ error: profileInsertError.message }, { status: 400 });
  }

  return NextResponse.json({ profile: data }, { status: 201 });
}
