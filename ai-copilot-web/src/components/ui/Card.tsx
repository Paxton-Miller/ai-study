"use client";

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: "flat" | "ring" | "floating";
}

export function Card({ elevation = "ring", className = "", children, ...props }: CardProps) {
  // 基础样式：近乎纯黑的表面背景，10px-15px圆角
  const baseStyle = "bg-surface-elevated rounded-lg md:rounded-xl p-[15px] md:p-[30px]"; 
  
  // 三级阴影系统
  const elevations = {
    flat: "", // Level 0: 扁平
    ring: "shadow-ring-blue transition-shadow hover:shadow-[rgba(0,153,255,0.3)_0px_0px_0px_1px]", // Level 1: 蓝色发光环，hover增强
    floating: "shadow-floating", // Level 3: 极致浮动阴影（白边+深黑底影）
  };

  return (
    <div
      className={`${baseStyle} ${elevations[elevation]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}