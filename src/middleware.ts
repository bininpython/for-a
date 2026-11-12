import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/env';

const ADMIN_PREFIX = '/admin';
const STUDENT_PREFIX = '/aluno';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem configuração não há sessão para renovar nem rota para proteger
  // além do aviso de configuração exibido pelas próprias telas.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Renova a sessão e mantém os cookies em dia.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminArea = pathname.startsWith(ADMIN_PREFIX);
  const isStudentArea = pathname.startsWith(STUDENT_PREFIX);

  if (!user && (isAdminArea || isStudentArea)) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && (isAdminArea || isStudentArea)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role ?? 'student';

    if (isAdminArea && role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = STUDENT_PREFIX;
      url.search = '';
      return NextResponse.redirect(url);
    }

    if (isStudentArea && role === 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = ADMIN_PREFIX;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|woff2?)$).*)',
  ],
};
