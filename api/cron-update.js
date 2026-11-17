/**
 * Vercel Serverless Function: GET/POST /api/cron-update
 * Triggers GitHub Actions workflow 'auto_update_youtube.yml' via GitHub REST API
 * so the catalog in data.js updates automatically in the background on schedule,
 * independent of whether users visit the site.
 * Can be called by Vercel Cron, cron-job.org, or any external scheduler.
 */

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  const rawToken = process.env.GH_TOKEN || process.env.GITHUB_DISPATCH_TOKEN || req.query.token || '';
  const sanitizedToken = String(rawToken)
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^(bearer|token)\s+/i, '')
    .trim();

  const repoOwner = process.env.GITHUB_REPO_OWNER || 'hungvdn1314';
  const repoName = process.env.GITHUB_REPO_NAME || 'hom-nay-xem-gi';
  const workflowFile = 'auto_update_youtube.yml';

  if (!sanitizedToken) {
    return res.status(200).json({
      ok: false,
      message: 'GH_TOKEN is not configured in Vercel environment variables.',
      instructions: 'Add GH_TOKEN (GitHub Personal Access Token with repo or actions:write scope) to Vercel Project Settings > Environment Variables.'
    });
  }

  try {
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowFile}/dispatches`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `token ${sanitizedToken}`,
        'User-Agent': 'HomNayXemGi-Cron-Dispatcher',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({ ref: 'main' })
    });

    if (resp.status === 204) {
      return res.status(200).json({
        ok: true,
        message: 'Successfully triggered GitHub Actions auto_update_youtube.yml!',
        timestamp: new Date().toISOString()
      });
    }

    const errorText = await resp.text();
    return res.status(resp.status).json({
      ok: false,
      status: resp.status,
      tokenLength: sanitizedToken.length,
      tokenPrefix: sanitizedToken.slice(0, 4) + '***',
      error: errorText
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
