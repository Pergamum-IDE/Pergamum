export function parseDebugModeFromArgv(argv: readonly string[]): boolean {
  return argv.some((argument, index) => {
    if (argument.toLowerCase() !== "--pergamum-debug") {
      return false;
    }

    const nextArgument = argv[index + 1];

    return nextArgument === undefined || nextArgument.startsWith("-");
  });
}
