"use client";
import React from "react";
import { Search } from "lucide-react";

import { ThemeToggle } from "./theme-toggle";

interface NavLink {
  href: string;
  label: string;
}

interface NavbarProps {
  logoText: string;
  navLinks: NavLink[];
  onJoinClick?: () => void;
}

export function Navbar({ logoText, navLinks, onJoinClick }: NavbarProps) {
  // Get current path to highlight active link
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    window.location.href = href;
  };

  return (
    <header className="absolute inset-x-0 top-0 p-6 md:p-8 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <a href="/" className="text-3xl font-bold hover:opacity-80 transition-opacity text-joyan-text">
          {logoText}
        </a>
        <nav className="hidden md:flex space-x-8 text-sm">
          {navLinks.map(({ href, label }) => {
            const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));
            return (
              <a
                key={href}
                href={href}
                onClick={(e) => handleNavClick(e, href)}
                className={`hover:text-joyan-text transition-colors ${
                  isActive ? 'text-joyan-text font-semibold' : 'text-joyan-muted'
                }`}
              >
                {label}
              </a>
            );
          })}
        </nav>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Search"
            className="hover:text-joyan-text transition-colors text-joyan-muted"
          >
            <Search className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onJoinClick}
            className="border border-joyan-text rounded-full px-6 py-2 text-sm font-medium hover:bg-joyan-text hover:text-joyan-bg transition-colors text-joyan-text"
          >
            Únete
          </button>
        </div>
      </div>
    </header>
  );
}
