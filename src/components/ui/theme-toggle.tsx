"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme"
    >
      <Sun className={`h-5 w-5 transition-all ${theme === "dark" ? "scale-0 rotate-90" : "scale-100 rotate-0"}`} />
      <Moon className={`absolute top-2 left-2 h-5 w-5 transition-all ${theme === "dark" ? "scale-100 rotate-0" : "scale-0 -rotate-90"}`} />
    </button>
  );
}
