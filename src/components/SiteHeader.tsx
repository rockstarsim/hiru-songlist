import Link from "next/link";

const links = [
  { href: "/", label: "노래 목록" },
  { href: "/request", label: "노래 신청" },
  { href: "/admin", label: "관리자" },
];

export function SiteHeader({ pathname }: { pathname: string }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">HIRU</span>
          <span className="brand-sub">Songlist</span>
        </Link>
        <nav className="nav" aria-label="주요 메뉴">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
