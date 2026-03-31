import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const APP_LOCALES = ["en", "es"] as const;
type AppLocale = (typeof APP_LOCALES)[number];

const DEFAULT_LOCALE: AppLocale = "en";

const intlMiddleware = createIntlMiddleware(routing);

function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    );
  }
  return { url, anonKey };
}

function isAppLocale(segment: string): segment is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(segment);
}

/**
 * Routes under `app/[locale]/(app)/…` use a locale prefix; public auth/share routes stay accessible.
 */
function getAuthGate(
  pathname: string,
): { requiresAuth: boolean; locale: AppLocale } {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { requiresAuth: false, locale: DEFAULT_LOCALE };
  }

  const [first, ...rest] = segments;
  if (!isAppLocale(first)) {
    return { requiresAuth: false, locale: DEFAULT_LOCALE };
  }

  const locale = first;
  if (rest.length === 0) {
    return { requiresAuth: true, locale };
  }

  const head = rest[0];
  if (head === "login" || head === "signup" || head === "forgot-password") {
    return { requiresAuth: false, locale };
  }
  if (head === "e" || head === "i") {
    return { requiresAuth: false, locale };
  }

  return { requiresAuth: true, locale };
}

export async function middleware(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();

  const response = intlMiddleware(request);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { requiresAuth, locale } = getAuthGate(request.nextUrl.pathname);

  if (requiresAuth && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.searchParams.set("next", request.nextUrl.pathname);

    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value);
    });
    const cacheControl = response.headers.get("Cache-Control");
    if (cacheControl) {
      redirectResponse.headers.set("Cache-Control", cacheControl);
    }
    const expires = response.headers.get("Expires");
    if (expires) {
      redirectResponse.headers.set("Expires", expires);
    }
    const pragma = response.headers.get("Pragma");
    if (pragma) {
      redirectResponse.headers.set("Pragma", pragma);
    }
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
