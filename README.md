# Replicate webhooks to GitHub Actions dispatcher

This is a Node.js proxy server that receives Replicate webhooks and turns them into GitHub Actions repository dispatches.

<img src="dispatcher.png" alt="Replicate to dispatcher to GitHub">

What it does:

- **Receives webhooks from Replicate.** You set a `webhook` URL when creating a prediction on Replicate, and add a `?gh_repo=your-github-username/your-repo` query param to the URL.
- **Massages them into the right shape for GitHub Actions**. GitHub Actions repository dispatches can't just be arbitrary JSON. The payload has to have a certain shape, and there are limits to the number of keys and the length of the JSON string. This proxy server removes extra params and constructs a JSON object that suits GitHub's expectations.
- **Triggers a repository dispatch event on the receiving repo**. You add a workflow file to your GitHub repo, so you handle the incoming webhook however you want. Write it to the repo, put it into a database, post it to Slack, etc.

## Usage

1. Set a [webhook](https://replicate.com/docs/webhooks) URL when creating a Replicate prediction
1. Add a GitHub Personal Access token to the receiving repo
1. Add a GitHub Actions workflow to the receiving repo

### 1. Set a webhook URL

Set a [webhook URL](https://replicate.com/docs/webhooks) when creating a Replicate prediction. Replicate will send a POST message to the URL when the prediction is complete.

```js
import Replicate from "replicate";
import "dotenv/config";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const ghRepo = `zeke/coding-train-transcripts`;
const webhook = `https://fe74d3ab4511.ngrok.app/dispatch?gh_repo=${ghRepo}`;
const webhook_events_filter = ["completed"];
const version =
  "5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa"; // https://replicate.com/replicate/hello-world/versions

async function main() {
  const prediction = await replicate.predictions.create({
    version,
    input: { text: "Alice" },
    webhook,
    webhook_events_filter,
  });
  console.log({ prediction });
  console.log(`https://replicate.com/p/${prediction.id}`);
}

main();
```

### 2. Add a GitHub Personal Access token to the receiving repo

Create a new token at https://github.com/settings/tokens/new with Workflow and Repo scope.

Also go into the repo's settings and make sure workflows have read and write permissions flipped on:

<img width="788" alt="Screenshot 2023-08-31 at 2 31 57 PM" src="https://github.com/replicate/cog/assets/2289/1d3d470a-399f-4ba7-8e50-f79479d76d33">

### 3. Add a GitHub Actions workflow to the receiving repo

```yml
name: Save Replicate Prediction

on:
  repository_dispatch:

jobs:
  save-replicate-prediction:
    runs-on: ubuntu-latest
    env:
      PAYLOAD: ${{ toJson(github.event.client_payload) }}
      ID: ${{ github.event.client_payload.id }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Save payload to file
        run: |
          echo "Payload: $PAYLOAD"
          echo "ID: $ID"
          echo "$PAYLOAD" > "predictions/${ID}.json"

      - name: Commit and push changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -am "Save prediction ${ID}"
          git push
```

## Credits

ChatGPT conversations wrote most of this code:

- https://chat.openai.com/share/f55f3981-4336-4eb0-932c-437c62019cae
- https://chat.openai.com/share/86abe2fb-0b72-4a37-9d90-54853a398879
