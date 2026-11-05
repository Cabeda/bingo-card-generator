const base = require("./jest.config.js");

// Critical game rules and saved sessions must keep complete branch coverage.
module.exports = {
  ...base,
  testMatch: [
    "<rootDir>/app/utils/gameFiles.test.ts",
    "<rootDir>/app/components/EventWorkspace/session.test.ts",
    "<rootDir>/app/components/EventWorkspace/EventWorkspace.test.tsx",
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    "app/utils/gameFiles.ts",
    "app/components/EventWorkspace/session.ts",
    "app/components/EventWorkspace/EventWorkspace.tsx",
  ],
  coverageDirectory: "coverage/game",
  coverageThreshold: {
    "./app/utils/gameFiles.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "./app/components/EventWorkspace/session.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "./app/components/EventWorkspace/EventWorkspace.tsx": {
      statements: 75,
      branches: 85,
      functions: 75,
      lines: 75,
    },
  },
};
