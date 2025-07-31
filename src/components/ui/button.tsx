import { cn } from "@/lib/utils";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = "primary",
  ...props
}) => {
  const baseStyle = "px-4 py-2 rounded font-medium";
  const variantStyle =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "bg-gray-200 text-black hover:bg-gray-300";

  return (
    <button className={cn(baseStyle, variantStyle, className)} {...props} />
  );
};
