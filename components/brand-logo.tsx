import Image from "next/image";
import { Home } from "lucide-react";

interface BrandLogoProps {
  /**
   * Logo size variant - enforces minimum widths for brand visibility
   * - desktop: 160px (default for headers, main nav)
   * - tablet: 140px (medium screens, footers)
   * - mobile: 120px (mobile headers, compact layouts)
   */
  size?: "desktop" | "tablet" | "mobile";
  /**
   * Logo color variant
   * - primary: Full color logo (default)
   * - mono-dark: Monochrome dark (for light backgrounds)
   * - mono-light: Monochrome light (for dark backgrounds)
   */
  variant?: "primary" | "mono-dark" | "mono-light";
  className?: string;
  priority?: boolean;
}

/**
 * BrandLogo component - Enforces minimum logo dimensions for brand visibility
 *
 * CRITICAL REQUIREMENTS:
 * - Desktop: 160px minimum width - logo text must be clearly readable
 * - Tablet: 140px minimum width
 * - Mobile: 120px minimum width
 * - NO auto-scaling or container-based shrinking below minimum
 * - Text-based design ensures readability at all sizes
 *
 * TEMPORARY: Using text-based logo until horizontal logo asset is provided.
 * To replace: Add horizontal logo to /public/Branding/logo-horizontal.svg
 */
export function BrandLogo({
  size = "desktop",
  variant = "primary",
  className = "",
  priority = false
}: BrandLogoProps) {
  // Enforce minimum widths - these are HARD requirements
  const widthMap = {
    desktop: 160,
    tablet: 140,
    mobile: 120,
  };

  // Heights optimized for horizontal text logo
  const heightMap = {
    desktop: 48,
    tablet: 42,
    mobile: 36,
  };

  const width = widthMap[size];
  const height = heightMap[size];

  // Font sizes scaled to logo size
  const fontSizeMap = {
    desktop: "20px",
    tablet: "18px",
    mobile: "16px",
  };

  const iconSizeMap = {
    desktop: 28,
    tablet: 24,
    mobile: 20,
  };

  const fontSize = fontSizeMap[size];
  const iconSize = iconSizeMap[size];

  // Color scheme based on variant
  const colorScheme = {
    primary: {
      icon: "#3b82f6", // blue-500
      text: "#1e3a8a", // blue-900
      bg: "transparent",
    },
    "mono-dark": {
      icon: "#1f2937", // gray-800
      text: "#1f2937",
      bg: "transparent",
    },
    "mono-light": {
      icon: "#ffffff",
      text: "#ffffff",
      bg: "transparent",
    },
  };

  const colors = colorScheme[variant];

  return (
    <div
      className={`relative flex items-center gap-2 flex-shrink-0 ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        minWidth: `${width}px`,
        minHeight: `${height}px`,
        backgroundColor: colors.bg,
      }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          backgroundColor: variant === "primary" ? "#3b82f6" : "transparent",
          border: variant !== "primary" ? `2px solid ${colors.icon}` : "none",
        }}
      >
        <Home
          size={iconSize * 0.6}
          style={{
            color: variant === "primary" ? "#ffffff" : colors.icon,
            strokeWidth: 2.5,
          }}
        />
      </div>

      {/* Text */}
      <div className="flex flex-col justify-center leading-none">
        <span
          style={{
            fontSize: fontSize,
            fontWeight: 800,
            color: colors.text,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          TENANT
        </span>
        <span
          style={{
            fontSize: `calc(${fontSize} * 0.85)`,
            fontWeight: 700,
            color: colors.text,
            letterSpacing: "0.05em",
            lineHeight: 1.1,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          BUDDY
        </span>
      </div>
    </div>
  );
}
