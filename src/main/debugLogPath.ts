import path from "node:path";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function pad3(value: number): string {
  return String(value).padStart(3, "0");
}

export function formatLocalDebugLogTimestamp(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffsetMinutes / 60);
  const offsetRemainderMinutes = absoluteOffsetMinutes % 60;

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
    date.getSeconds()
  )}.${pad3(date.getMilliseconds())}${offsetSign}${pad2(
    offsetHours
  )}:${pad2(offsetRemainderMinutes)}`;
}

export function resolveDebugLogFilePath(input: {
  logsDir: string;
  sessionId: string;
  openedAt: Date;
  suffix?: number;
}): string {
  const { logsDir, sessionId, openedAt, suffix } = input;
  const datePart = `${openedAt.getFullYear()}-${pad2(
    openedAt.getMonth() + 1
  )}-${pad2(openedAt.getDate())}`;
  const timePart = `${pad2(openedAt.getHours())}-${pad2(
    openedAt.getMinutes()
  )}`;
  const suffixPart = suffix === undefined ? "" : `-${pad2(suffix)}`;

  return path.join(
    logsDir,
    `Pergamum-debug-${sessionId}--${datePart}--${timePart}${suffixPart}.jsonl`
  );
}

