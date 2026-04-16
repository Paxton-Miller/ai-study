"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";

export function Navbar() {
  return (
    // 使用 fixed 定位让它浮动在顶部，背景使用极深的纯黑色并带有一丝丝透明度
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[1200px] flex items-center justify-between px-[20px] py-[15px] bg-void/90 border border-white/10 rounded-nav"
    >
      {/* Logo 区域 */}
      <div className="flex items-center gap-2 text-white font-display font-medium text-[20px] tracking-tight-sub">
        <div className="w-[24px] h-[24px] bg-framer-blue rounded-thumb"></div>
        Copilot
      </div>

      {/* 居中链接：15px Inter，默认银色，hover 白色 */}
      <div className="hidden md:flex items-center gap-[30px] font-body text-[15px] text-silver-muted font-feature-nav">
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#components" className="hover:text-white transition-colors">Components</a>
        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
      </div>

      {/* 右侧 CTA：使用毛玻璃胶囊按钮 */}
      <div className="flex items-center gap-[10px]">
        <span className="hidden md:block font-body text-[14px] text-silver-muted mr-2">Log in</span>
        <Button variant="frosted">Sign Up</Button>
      </div>
    </motion.nav>
  );
}