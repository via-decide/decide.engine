'use strict';

/**
 * Decide Engine Telegram Bot (Serverless-friendly Express app)
 *
 * Flow:
 * 1) Receive Telegram webhook update with a user prompt.
 * 2) Immediately acknowledge processing to the same chat.
 * 3) Ask LLM for RAW code only.
 * 4) Commit generated code to GitHub (main branch) using Git Data API.
 * 5) Notify user with commit URL.
 *
 * Deployment notes:
 * - Vercel: export default app (this file does that at the bottom).
 * - AWS Lambda: wrap with serverless-http if desired.
 * - Cloudflare Workers: use a Workers-specific adapter (Express is Node-oriented).
 */

const express = require('express');
const { Octokit } = require('@octokit/rest');

const app = express();
app.use(express.json({ limit: '1mb' }));

/**
 * Required environment variables.
 */
const REQUIRED_ENV_VARS = [
  'TELEGRAM_BOT_TOKEN',
  'GITHUB_PAT',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'LLM_API_KEY'
];

/**
 * Utility: Validate environment variables and return a user-friendly list if missing.
 */
function getMissingEnvVars() {
  return REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
}

/**
 * Utility: Keep Telegram messages safely within limits and avoid huge stack traces.
 */
function safeErrorMessage(err) {
  const raw = err?.response?.data?.error?.message || err?.message || String(err);
  return raw.length > 350 ? `${raw.slice(0, 347)}...` : raw;
}

/**
 * Telegram API helper using native fetch.
 */
async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * LLM helper: asks OpenAI Chat Completions for raw code only.
 *
 * You can swap this function for Gemini if needed; this V1 uses OpenAI-compatible API.
 */
async function generateCodeFromPrompt(userPrompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LLM_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a code generation engine. Return ONLY raw, functional source code. ' +
            'Do not include markdown fences, explanations, or prose.'
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const generated = data?.choices?.[0]?.message?.content?.trim();

  if (!generated) {
    throw new Error('LLM returned an empty response.');
  }

  return generated;
}

/**
 * Very light filename inference based on prompt keywords.
 */
function inferExtension(promptText) {
  const prompt = promptText.toLowerCase();
  if (prompt.includes('python')) return 'py';
  if (prompt.includes('javascript') || prompt.includes('node')) return 'js';
  if (prompt.includes('typescript')) return 'ts';
  if (prompt.includes('html')) return 'html';
  if (prompt.includes('css')) return 'css';
  if (prompt.includes('java')) return 'java';
  if (prompt.includes('go ')) return 'go';
  if (prompt.includes('rust')) return 'rs';
  return 'txt';
}

/**
 * GitHub commit flow using Git Data API:
 * - Read main branch ref
 * - Get latest commit + base tree
 * - Create blob for generated code
 * - Create tree with the new file
 * - Create commit
 * - Update main ref to new commit
 */
async function commitGeneratedCodeToGitHub({ prompt, generatedCode }) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

  // 1) Get current HEAD SHA of main
  const ref = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
  const latestCommitSha = ref.data.object.sha;

  // 2) Resolve latest commit to get base tree SHA
  const latestCommit = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
  const baseTreeSha = latestCommit.data.tree.sha;

  // 3) Create a blob containing generated code
  const blob = await octokit.git.createBlob({
    owner,
    repo,
    content: generatedCode,
    encoding: 'utf-8'
  });

  // file path example: generated/2026-03-14T11-33-00-123Z.py
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = inferExtension(prompt);
  const filePath = `generated/${timestamp}.${ext}`;

  // 4) Create a new tree that adds the new file
  const tree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: [
      {
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.data.sha
      }
    ]
  });

  // 5) Create a commit pointing to this tree
  const commitMessage = `Decide Engine: ${prompt.slice(0, 72).replace(/\n/g, ' ')}`;
  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: tree.data.sha,
    parents: [latestCommitSha]
  });

  // 6) Move main branch ref to the new commit
  await octokit.git.updateRef({
    owner,
    repo,
    ref: 'heads/main',
    sha: commit.data.sha,
    force: false
  });

  const commitUrl = `https://github.com/${owner}/${repo}/commit/${commit.data.sha}`;
  return { commitUrl, filePath, commitSha: commit.data.sha };
}

/**
 * Health endpoint: quick sanity check.
 */
app.get('/health', (_req, res) => {
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    return res.status(500).json({ ok: false, missing_env: missing });
  }
  return res.json({ ok: true, service: 'decide-engine' });
});

/**
 * Telegram webhook endpoint.
 */
app.post('/webhook', async (req, res) => {
  // Respond quickly to Telegram to avoid retries/timeouts.
  res.status(200).json({ ok: true });

  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    return;
  }

  try {
    const update = req.body;
    const message = update?.message;
    const chatId = message?.chat?.id;
    const userPrompt = message?.text?.trim();

    // Ignore unsupported updates (stick to standard text message in V1).
    if (!chatId || !userPrompt) {
      return;
    }

    // 1) Acknowledge immediately in chat.
    await sendTelegramMessage(chatId, '⚙️ Decide Engine is processing your request...');

    // 2) Generate code from LLM.
    const generatedCode = await generateCodeFromPrompt(userPrompt);

    // 3) Commit code to GitHub main branch.
    const { commitUrl } = await commitGeneratedCodeToGitHub({
      prompt: userPrompt,
      generatedCode
    });

    // 4) Notify success.
    await sendTelegramMessage(
      chatId,
      `✅ Code generated and committed successfully! View it here: ${commitUrl}`
    );
  } catch (error) {
    console.error('Decide Engine error:', error);

    // Try to notify user if we still have chat id.
    const chatId = req.body?.message?.chat?.id;
    if (chatId) {
      try {
        await sendTelegramMessage(chatId, `❌ Error: ${safeErrorMessage(error)}`);
      } catch (notifyErr) {
        console.error('Failed to send Telegram error notification:', notifyErr);
      }
    }
  }
});

/**
 * Local development runner.
 */
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Decide Engine listening on port ${port}`);
  });
}

module.exports = app;
module.exports.default = app;
