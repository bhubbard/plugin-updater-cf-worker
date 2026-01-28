export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // --- CONFIGURATION ---
    const GITHUB_ORG = 'TappNetwork';
    const GITHUB_REPO = 'tapp-network';
    const TOKEN = env.GITHUB_TOKEN; // Ensure this is set in Worker Settings
    const USER_AGENT = 'TappNetwork-Updater/1.0';
    // ---------------------

    // Helper to fetch from GitHub
    const githubFetch = async (endpoint, isBinary = false) => {
      return fetch(endpoint, {
        headers: {
          'User-Agent': USER_AGENT,
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': isBinary ? 'application/octet-stream' : 'application/vnd.github.v3+json'
        }
      });
    };

    // 1. Get the latest release data
    const releaseResponse = await githubFetch(
      `https://api.github.com/repos/${GITHUB_ORG}/${GITHUB_REPO}/releases/latest`
    );

    if (!releaseResponse.ok) return new Response('Release not found', { status: 404 });
    const release = await releaseResponse.json();

    // 2. ROUTING: Handle "Download" Request (Proxy for Private Repos)
    // If the URL ends in /download.zip, we fetch the actual file and serve it
    if (url.pathname.endsWith('/download.zip')) {
      const assetUrl = release.assets[0]?.url; // Get API URL for the asset
      if (!assetUrl) return new Response('No asset found', { status: 404 });

      // Fetch the binary from GitHub
      const assetResponse = await githubFetch(assetUrl, true);
      
      // Stream it back to WordPress
      return new Response(assetResponse.body, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${GITHUB_REPO}.zip"`
        }
      });
    }

    // 3. ROUTING: Handle "Update Check" (JSON for WordPress)
    // WP expects: { new_version, package, url, slug }
    const wpUpdateData = {
      slug: GITHUB_REPO, 
      new_version: release.tag_name.replace(/^v/, ''), // Strip 'v' prefix
      url: release.html_url,
      // CRITICAL: Point the package URL back to THIS worker, not GitHub directly
      package: `${url.origin}/download.zip`, 
      tested: '6.7', 
      requires: '6.0' 
    };

    return new Response(JSON.stringify(wpUpdateData), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
