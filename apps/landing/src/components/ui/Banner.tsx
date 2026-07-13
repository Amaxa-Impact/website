interface BannerProps {
  message?: string;
  href?: string;
}

export function Banner({
  message = "Application to an Ámaxa Pathway. Apply here now! →",
  href,
}: BannerProps) {
  return (
    <div className="bg-coral-light-500 flex h-11 items-center justify-center w-full overflow-hidden">
      {href ? (
        <a
          href={href}
          className="font-medium text-sm text-purple-dark-500 whitespace-pre hover:underline"
        >
          {message}
        </a>
      ) : (
        <p className="font-medium text-sm text-purple-dark-500 whitespace-pre">
          {message}
        </p>
      )}
    </div>
  );
}
