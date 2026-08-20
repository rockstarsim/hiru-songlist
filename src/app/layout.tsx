import type { Metadata } from "next";
import { Black_Han_Sans, Noto_Sans_KR } from "next/font/google";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const display = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "HIRU Songlist",
  description: "스트리머 하루(Hiru)의 노래 목록과 신청 페이지",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "/";

  return (
    <html lang="ko" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <SiteHeader pathname={pathname} />
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
