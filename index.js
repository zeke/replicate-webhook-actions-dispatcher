require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post("/dispatch", async (req, res) => {
  let prediction = req.body;

  // Ignore predictions that did not succeed
  if (prediction.status !== "succeeded") {
    console.log(`Prediction did not succeed: ${prediction.id}. Ignoring.`);
    return res.status(200).send({ success: true });
  }

  // GitHub's repository_dispatch event allows a maximum of 10 properties in the client_payload.
  if (prediction.logs) delete prediction.logs;
  if (prediction.metrics) delete prediction.metrics;
  if (prediction.urls) delete prediction.urls;
  if (prediction.created_at) delete prediction.created_at;
  if (prediction.started_at) delete prediction.started_at;
  if (prediction.completed_at) delete prediction.completed_at;

  // Extract gh_repo from query params
  const repo = req.query.gh_repo;

  if (!repo) {
    return res
      .status(400)
      .send({ error: "gh_repo query parameter is required." });
  }

  let dispatchPayload = {
    event_type: "prediction",
    client_payload: prediction,
  };

  const githubEndpoint = `https://api.github.com/repos/${repo}/dispatches`;

  console.log({ githubEndpoint, dispatchPayload });

  const headers = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.everest-preview+json", // required header for repository_dispatch events
  };

  await axios.post(githubEndpoint, dispatchPayload, { headers });

  // Let the Replicate API know we received the request
  res.status(200).send({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
