"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Expand, History, Leaf, Maximize2, Settings } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";

export function Header() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Aprivity Focus 首页">
        <span className="brand-mark"><Leaf size={17} /></span>
        <span>Aprivity Focus</span>
      </Link>
      <nav className="header-actions" aria-label="主导航">
        <Link href="/history" className={`icon-link${pathname === "/history" ? " active" : ""}`} aria-current={pathname === "/history" ? "page" : undefined}><History size={18} /><span>历史记录</span></Link>
        <Link href="/settings" className={`icon-link${pathname === "/settings" ? " active" : ""}`} aria-current={pathname === "/settings" ? "page" : undefined}><Settings size={18} /><span>设置</span></Link>
        <button className="icon-link" type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? "退出全屏" : "进入全屏"}>
          {isFullscreen ? <Expand size={18} /> : <Maximize2 size={18} />}<span className="desktop-label">全屏</span>
        </button>
      </nav>
    </header>
  );
}
