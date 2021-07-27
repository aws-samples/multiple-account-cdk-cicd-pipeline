module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/cdk/test"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
