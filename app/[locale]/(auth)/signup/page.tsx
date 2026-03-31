import { getTranslations } from "next-intl/server";

export default async function SignupPage() {
  const t = await getTranslations("placeholder");
  return <div>{t("signup")}</div>;
}
