import Link from "next/link";

interface Props {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  linked?: boolean;
}

const SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export default function AgentAvatar({ name, color = "#6b7280", size = "md", linked = true }: Props) {
  const initial = name.charAt(0).toUpperCase();
  const circle = (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 ${SIZES[size]}`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );

  if (linked) {
    return (
      <Link href={`/agents/${encodeURIComponent(name)}`} className="flex items-center gap-2 hover:underline">
        {circle}
        <span className="font-medium text-gray-800 text-sm">{name}</span>
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-2">
      {circle}
      <span className="font-medium text-gray-800 text-sm">{name}</span>
    </span>
  );
}
