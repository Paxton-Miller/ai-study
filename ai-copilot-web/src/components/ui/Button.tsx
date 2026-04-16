"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import React from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "solid" | "frosted" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "solid", className = "", children, ...props }, ref) => {
    // 【彻底清理】：text-[15px] -> text-body
    const baseStyle = "inline-flex items-center justify-center font-body text-body tracking-nav font-medium transition-all outline-none focus-visible:shadow-ring-blue font-feature-nav shrink-0";
    
    const variants = {
      solid: "bg-white text-void rounded-pill px-15 py-10 hover:bg-[#e5e5e5]", 
      frosted: "bg-frosted text-white rounded-nav px-15 py-10 hover:bg-frosted-hover",
      ghost: "bg-transparent text-white rounded-nav px-15 py-10 hover:bg-frosted",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.85 }} 
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`${baseStyle} ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";