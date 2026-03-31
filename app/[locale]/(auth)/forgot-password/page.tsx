import { getTranslations } from "next-intl/server";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen min-h-dvh flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-[400px] text-center">
        <h1 className="text-xl font-semibold text-[#FFFFFF]">
          {t("forgotPasswordPageTitle")}
        </h1>
        <p className="mt-2 text-sm text-[#A3A3A3]">{t("forgotPasswordPageHint")}</p>
      </div>
    </div>
  );
}
