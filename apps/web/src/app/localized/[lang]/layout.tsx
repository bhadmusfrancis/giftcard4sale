import { notFound } from "next/navigation";
import { isSeoLocale } from "@/lib/locale";
import { SeoLanguageLinks } from "@/components/SeoLanguageLinks";

// Internal rewrite target for /{lang}/… URLs (see middleware.ts). Params are
// always validated here even though middleware only rewrites known paths.
export default function LocalizedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!isSeoLocale(params.lang)) notFound();
  return (
    <>
      {children}
      <SeoLanguageLinks current={params.lang} />
    </>
  );
}
