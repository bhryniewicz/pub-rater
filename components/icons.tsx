type IconProps = {
  size?: number;
  color?: string;
  className?: string;
};

export function PubLine({ size = 24, color = "currentColor", className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="4 7 17 15"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M5.5 8.5h9.5V20a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1z" />
      <path d="M15 10.5h2.6A2.4 2.4 0 0 1 20 12.9v1.6a2.4 2.4 0 0 1-2.4 2.4H15v-2h2.2a.6.6 0 0 0 .6-.6v-1.2a.6.6 0 0 0-.6-.6H15z" />
    </svg>
  );
}

export function BarSolid({ size = 24, color = "currentColor", className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 5h17l-7.5 8.2V18h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-4.8z" />
    </svg>
  );
}

export function BiergartenSolid({ size = 24, color = "currentColor", className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.5a5.5 5.5 0 0 0-4.9 8A4.2 4.2 0 0 0 9 18.6V20a1.1 1.1 0 0 0 2.2 0v-1.3h1.6V20a1.1 1.1 0 0 0 2.2 0v-1.4a4.2 4.2 0 0 0 1.9-8.1A5.5 5.5 0 0 0 12 2.5z" />
    </svg>
  );
}

export function MixedSolid({ size = 24, color = "currentColor", className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" />
    </svg>
  );
}
