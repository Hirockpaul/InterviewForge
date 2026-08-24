const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
  quiet: true,
});

const { resolveTopic } = require("../src/services/focusedPractice.services");
const { QuestionPoolService } = require("../src/services/mcqPool.services");

async function run() {
  const input = process.argv[2];
  const category = process.argv[3] || "programming";

  if (!input) {
    throw new Error(
      'Usage: npm run generate:mcq -- "JavaScript" programming'
    );
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const topic = resolveTopic(input);
    const pool = new QuestionPoolService();

    const result = await pool.replenish({
      canonicalTopic: topic.canonicalTopic,
      displayTopic: topic.displayTopic,
      category: resolveTopic(category).canonicalTopic,
    });

    console.log(result);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});