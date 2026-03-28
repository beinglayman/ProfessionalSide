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
  const shortCode = params.shortCode as string;

  if (!/^[a-hjkmnp-z2-9]{8}$/.test(shortCode)) {
    return env.ASSETS.fetch(request);
  }

  if (!env.API_ORIGIN) {
    return env.ASSETS.fetch(request);
  }

  try {
    const apiRes = await fetch(`${env.API_ORIGIN}/api/v1/pragma/resolve/${shortCode}`);
    if (!apiRes.ok) return env.ASSETS.fetch(request);

    const body = await apiRes.json() as any;
    if (!body.success || !body.data) return env.ASSETS.fetch(request);

    const { content, author } = body.data;
    const firstSection = Object.values(content.sections || {})[0] as any;
    const desc = (firstSection?.summary || '').slice(0, 160);
    const baseUrl = env.BASE_URL || 'https://inchronicle.com';

    const ogTags = `
    <title>${esc(content.title)} | inchronicle</title>
    <meta property="og:title" content="${esc(`${content.title} — ${author.name}`)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${esc(`${baseUrl}/p/${shortCode}`)}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary" />
    <meta name="robots" content="noindex, nofollow">`;

    const assetRes = await env.ASSETS.fetch(new Request(new URL('/', request.url)));

    return new HTMLRewriter()
      .on('head', { element(el) { el.append(ogTags, { html: true }); } })
      .transform(new Response(assetRes.body, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=300',
          'Referrer-Policy': 'no-referrer',
        },
      }));
  } catch {
    return env.ASSETS.fetch(request);
  }
};
