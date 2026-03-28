interface Env {
  ASSETS: Fetcher;
  API_ORIGIN: string;
  BASE_URL: string;
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, env, request } = context;
  const slug = params.slug as string;

  // Only valid chronicle slugs: 3-50 chars, lowercase alphanumeric + hyphens
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
    return env.ASSETS.fetch(request);
  }

  if (!env.API_ORIGIN) {
    return env.ASSETS.fetch(request);
  }

  try {
    const apiRes = await fetch(`${env.API_ORIGIN}/api/v1/users/chronicle/${slug}`);
    if (!apiRes.ok) return env.ASSETS.fetch(request);

    const body = await apiRes.json() as any;
    if (!body.success || !body.data) return env.ASSETS.fetch(request);

    const { user, stories, meta } = body.data;
    const baseUrl = env.BASE_URL || 'https://inchronicle.com';

    const ogTitle = esc(`${user.name} — ${user.title || ''} ${user.company ? 'at ' + user.company : ''}`.trim());
    const ogDescription = esc(`${stories.length} published career ${stories.length === 1 ? 'story' : 'stories'}`);
    const ogImage = user.avatar ? `<meta property="og:image" content="${esc(user.avatar)}" />` : '';
    const noIndex = !meta.allowSearchEngineIndexing ? '<meta name="robots" content="noindex">' : '';

    const ogTags = `
    <title>${esc(user.name)} — Career Chronicle | inchronicle</title>
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDescription}" />
    ${ogImage}
    <meta property="og:url" content="${esc(`${baseUrl}/${user.profileUrl}`)}" />
    <meta property="og:type" content="profile" />
    <meta name="twitter:card" content="summary" />
    ${noIndex}
    <script>window.__CHRONICLE_DATA__ = ${JSON.stringify(body.data).replace(/</g, '\\u003c')};</script>`;

    const assetRes = await env.ASSETS.fetch(new Request(new URL('/', request.url)));

    return new HTMLRewriter()
      .on('head', { element(el) { el.append(ogTags, { html: true }); } })
      .transform(new Response(assetRes.body, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=300',
        },
      }));
  } catch {
    return env.ASSETS.fetch(request);
  }
};
