const test = require("node:test");
const assert = require("node:assert/strict");
const jdoodleService = require("../src/services/jdoodle.service");
const { runCodeController } = require("../src/controllers/coding.controller");

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("run endpoint executes valid JavaScript and returns output 5", async () => {
  const originalExecuteCode = jdoodleService.executeCode;
  let received;
  jdoodleService.executeCode = async (payload) => {
    received = payload;
    return { success: true, output: "5", error: null, status: "success" };
  };

  try {
    const res = responseRecorder();
    await runCodeController(
      {
        body: {
          language: "javascript",
          versionIndex: "4",
          code: "console.log(2 + 3);",
          stdin: "",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.output, "5");
    assert.deepEqual(received, {
      language: "nodejs",
      versionIndex: "4",
      code: "console.log(2 + 3);",
      stdin: "",
    });
  } finally {
    jdoodleService.executeCode = originalExecuteCode;
  }
});

test("run endpoint rejects an invalid request", async () => {
  const res = responseRecorder();
  await runCodeController({ body: { language: "brainfuck", code: "" } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.status, "invalid_request");
});

test("run endpoint returns normalized JDoodle errors", async () => {
  const originalExecuteCode = jdoodleService.executeCode;
  jdoodleService.executeCode = async () => ({
    success: false,
    output: "",
    error: "Code execution service is temporarily unavailable.",
    status: "api_error",
  });

  try {
    const res = responseRecorder();
    await runCodeController(
      { body: { language: "javascript", code: "console.log(2 + 3);" } },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.status, "api_error");
  } finally {
    jdoodleService.executeCode = originalExecuteCode;
  }
});
