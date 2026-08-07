import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { CompanyCreateValues } from "@/lib/types";

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
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (profileError || requesterProfile?.is_super_admin !== true) {
    return NextResponse.json({ error: "Apenas o super admin pode criar empresas." }, { status: 403 });
  }

  const body = (await request.json()) as Partial<CompanyCreateValues>;
  const companyName = body.company_name?.trim();
  const adminFullName = body.admin_full_name?.trim();
  const adminEmail = body.admin_email?.trim().toLowerCase();
  const adminPassword = body.admin_password;

  if (!companyName || !adminFullName || !adminEmail || !adminPassword) {
    return NextResponse.json(
      { error: "Nome da empresa, nome do admin, email e senha temporaria sao obrigatorios." },
      { status: 400 }
    );
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: companyName })
    .select("*")
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: companyError?.message || "Erro ao criar empresa." }, { status: 400 });
  }

  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: adminFullName,
      role: "admin",
      company_id: company.id,
      is_super_admin: false
    }
  });

  if (createError || !authData.user) {
    return NextResponse.json({ error: createError?.message || "Erro ao criar admin da empresa." }, { status: 400 });
  }

  const profile = {
    id: authData.user.id,
    full_name: adminFullName,
    email: adminEmail,
    role: "admin" as const,
    sector_id: null,
    active: true,
    company_id: company.id,
    is_super_admin: false
  };

  const { error: profileInsertError } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .single();

  if (profileInsertError) {
    return NextResponse.json({ error: profileInsertError.message }, { status: 400 });
  }

  return NextResponse.json({ company }, { status: 201 });
}
