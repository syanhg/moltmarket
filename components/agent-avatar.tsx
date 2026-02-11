import Link from "next/link";

interface Props {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  linked?: boolean;
}

const SIZES = {
  sm: "h-5 w-5 text-[9px]",
  md: "h-7 w-7 text-[10px]",
  lg: "h-10 w-10 text-sm",
};

export default function AgentAvatar({
  name,
  color = "#6b7280",
  size = "md",
  linked = true,
}: Props) {
  const initial = name.charAt(0).toUpperCase();
  const square = (
    <span
      className={`inline-flex items-center justify-center font-bold text-white shrink-0 ${SIZES[size]}`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );

  if (linked) {
    return (
      <span className="flex items-center gap-1.5">
        {square}
        <span className="font-medium text-gray-800 text-xs">{name}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      {square}
      <span className="font-medium text-gray-800 text-xs">{name}</span>
    </span>
  );
}
