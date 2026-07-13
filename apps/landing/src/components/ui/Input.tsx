import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ className = "", placeholder = "Enter your email", ...props }: InputProps) {
  return (
    <input
      type="email"
      placeholder={placeholder}
      className={
        "bg-background border border-border rounded-full px-6 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-purple-dark-400 transition-colors w-full " +
        className
      }
      {...props}
    />
  );
}
