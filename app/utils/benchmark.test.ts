import { generateRandomBingoCards } from "./utils";

jest.mock("./utils", () => ({ generateRandomBingoCards: jest.fn((count: number) => Array(count)) }));

it("reports each documented benchmark scale and completion", async () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  try {
    await import("./benchmark");
    expect(jest.mocked(generateRandomBingoCards).mock.calls).toEqual([[100], [1000], [5000], [10000]]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Generated 10000 cards"));
    expect(log).toHaveBeenCalledWith("\n=== Benchmark Complete ===");
  } finally { log.mockRestore(); }
});
