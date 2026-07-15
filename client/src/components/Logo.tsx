interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

export function Logo({ size = 'medium' }: LogoProps) {
  const sizeClasses = {
    small: 'h-10 w-auto',
    medium: 'h-20 w-auto',
    large: 'h-32 w-auto',
  };

  return (
    <div className="flex items-center gap-3">
      <img
        src="/manus-storage/ColorLOGO_SemFundo_9629c7aa.PNG"
        alt="Affinity Financial Consulting Inc."
        className={sizeClasses[size]}
      />
    </div>
  );
}
