"use client";
import React, { useState } from "react";
import PropTypes from "prop-types";

interface HeroSectionProps {
  avatarSrcList: string[];
  userCount: number;
  title: string;
  description: string;
  placeholder: string;
  ctaText: string;
  onSubmit: (email: string) => void;
}

export default function HeroSection({
  avatarSrcList,
  userCount,
  title,
  description,
  placeholder,
  ctaText,
  onSubmit,
}: HeroSectionProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    onSubmit(email);
    setEmail("");
  };

  return (
    <div className="container mx-auto h-screen flex items-center px-6 md:px-8">
      <div className="w-full md:w-1/2 lg:w-2/5">
        <div className="flex items-center mb-4">
          <div className="flex -space-x-2">
            {avatarSrcList.map((src, idx) => (
              <img
                key={idx}
                className="h-8 w-8 rounded-full ring-2 ring-gray-900/50"
                src={src}
                alt={`User avatar ${idx + 1}`}
              />
            ))}
          </div>
          <p className="ml-3 text-sm text-gray-300">
            &lt;{userCount.toLocaleString()} usuarios
          </p>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">
          {title}
        </h1>

        <p className="text-md text-gray-300 max-w-md mb-8">{description}</p>

        <form
          className="flex w-full max-w-sm"
          onSubmit={handleSubmit}
          aria-label="Waitlist signup"
        >
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 rounded-l-md border-0 focus:ring-2 focus:ring-inset focus:ring-indigo-600 text-black placeholder:text-gray-500"
            required
          />
          <button
            type="submit"
            className="bg-white text-black font-bold px-5 py-3 rounded-r-md hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            {ctaText}
          </button>
        </form>
      </div>
    </div>
  );
}

HeroSection.propTypes = {
  avatarSrcList: PropTypes.arrayOf(PropTypes.string),
  userCount: PropTypes.number,
  title: PropTypes.string,
  description: PropTypes.string,
  placeholder: PropTypes.string,
  ctaText: PropTypes.string,
  onSubmit: PropTypes.func,
};

HeroSection.defaultProps = {
  avatarSrcList: [],
  userCount: 0,
  title: "",
  description: "",
  placeholder: "Enter email",
  ctaText: "Submit",
  onSubmit: () => { /* noop */ },
};
