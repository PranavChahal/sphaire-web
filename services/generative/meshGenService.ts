/**
 * Text/image -> 3D mesh generation (client side).
 *
 * For organic/artistic prompts that a CAD kernel can't express. Delegates to a
 * server route that runs an open image-to-3D model (TRELLIS / Hunyuan3D-2 / Stable
 * Fast 3D via Replicate, or a self-hosted endpoint). The pipeline is:
 *   prompt -> (optional) image -> image-to-3D -> GLB
 *
 * Returns a GLB the existing model-import path can load as a `ModelShape`. Degrades
 * with a clear message when no mesh-gen provider is configured.
 */

export interface MeshGenResult {
  ok: boolean;
  /** GLB as a data URL, ready to hand to the model loader. */
  glbDataUrl?: string;
  format?: 'glb';
  error?: string;
  /** True when no provider is configured — caller should tell the user how to enable it. */
  notConfigured?: boolean;
}

export interface MeshGenOptions {
  /** Provider API token (BYO). If omitted, the server env token is used. */
  apiToken?: string;
  /** Override the model/provider (e.g. 'replicate:trellis'). */
  model?: string;
}

export async function generateMesh(prompt: string, opts: MeshGenOptions = {}): Promise<MeshGenResult> {
  try {
    const res = await fetch('/api/generate-mesh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, apiToken: opts.apiToken, model: opts.model }),
    });

    if (res.status === 501) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        notConfigured: true,
        error: data.error || 'Mesh generation is not configured on this server.',
      };
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || `Mesh generation failed (${res.status})` };
    }

    const data = await res.json();
    return { ok: true, glbDataUrl: data.glbDataUrl, format: 'glb' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Mesh generation request failed' };
  }
}
