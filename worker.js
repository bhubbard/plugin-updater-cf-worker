export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 1. configuration
    const GITHUB_USER = 'your-username';
    const GITHUB_REPO = 'your-repo';
    const TOKEN = env.GITHUB_TOKEN; // Store in CF Worker Secrets

    // 2. Fetch latest release from GitHub
    const ghResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'User-Agent': 'Cloudflare-Worker',
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!ghResponse.ok) return new Response('Not found', { status: 404 });

    const release = await ghResponse.json();

    // 3. Format for WordPress
    // WP expects: { new_version, package, url, slug }
    const wpUpdateData = {
      slug: 'my-plugin-slug', // Must match your plugin folder name
      new_version: release.tag_name.replace('v', ''), // Strip 'v' if needed
      url: release.html_url, // URL to view info
      package: release.assets[0].browser_download_url, // The zip file URL
      tested: '6.7', // Optional: Inject "tested up to" data
      requires: '6.0' // Optional: Inject "requires PHP" data
    };

    return new Response(JSON.stringify(wpUpdateData), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
