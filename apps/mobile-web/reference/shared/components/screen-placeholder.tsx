type ScreenPlaceholderProps = {
  name: string;
  routeNumber: string;
};

export function ScreenPlaceholder({ name, routeNumber }: ScreenPlaceholderProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="text-[12px] font-medium uppercase tracking-wider text-holo-ink-4">
        {routeNumber}
      </span>
      <h1 className="text-[20px] font-semibold text-holo-ink">{name}</h1>
      <p className="text-[14px] text-holo-ink-3">Phase C에서 구현 예정</p>
    </div>
  );
}
