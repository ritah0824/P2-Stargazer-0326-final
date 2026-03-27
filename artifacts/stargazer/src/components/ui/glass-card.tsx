import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glowColor?: "primary" | "secondary" | "accent";
}

export function GlassCard({ children, className, glowColor, ...props }: GlassCardProps) {
  const glowMap = {
    primary: "bg-primary/20",
    secondary: "bg-secondary/20",
    accent: "bg-accent/20",
  };

  return (
    <motion.div
      className={cn(
        "glass-panel glass-panel-hover rounded-2xl relative overflow-hidden group",
        className
      )}
      {...props}
    >
      {glowColor && (
        <div 
          className={cn(
            "absolute -top-24 -right-24 w-48 h-48 blur-[60px] rounded-full pointer-events-none transition-opacity duration-500 opacity-30 group-hover:opacity-60",
            glowMap[glowColor]
          )} 
        />
      )}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </motion.div>
  );
}
