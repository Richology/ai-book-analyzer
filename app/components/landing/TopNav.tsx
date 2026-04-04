"use client";

import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "产品介绍", anchor: "#comparison" },
  { label: "用户评价", anchor: "#testimonials" },
  { label: "常见问题", anchor: "#faq" },
];

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 md:px-8">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Richology%E5%95%86%E6%A0%87%E9%BB%91%E4%BD%93.png"
          alt="Richology"
          width={120}
          height={14}
          className="h-3.5 w-auto object-contain opacity-70 transition-opacity hover:opacity-100"
        />

        {/* Nav links */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.anchor}
              href={item.anchor}
              className="text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
              onClick={(e) => {
                e.preventDefault();
                document
                  .querySelector(item.anchor)
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
