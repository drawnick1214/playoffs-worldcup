interface Props {
  name: string;
  crest?: string | null;
  className?: string;
  reverse?: boolean; // flag on the right (for the away team)
}

/** Team name with its flag/crest. Falls back gracefully when there is no crest. */
export default function TeamName({ name, crest, className = "", reverse = false }: Props) {
  const flag = crest ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={crest} alt="" className="inline-block h-4 w-5 shrink-0 object-contain" />
  ) : null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {!reverse && flag}
      <span>{name}</span>
      {reverse && flag}
    </span>
  );
}
