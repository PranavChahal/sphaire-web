/**
 * Replicad execution backend.
 *
 * Replicad is a mature, well-documented, fluent OCCT-over-JS API (sketch → extrude /
 * revolve / loft / sweep / fillet / shell). Because it's popular and documented, LLMs
 * generate it far more reliably than Sphaire's hand-rolled `occ.*` wrapper, and it
 * covers the operations the wrapper's own docs admit are missing.
 *
 * This executor lazy-loads replicad + its dedicated OCCT wasm, runs user code in a
 * Function sandbox, and returns mesh data in the same `{positions, indices}` shape
 * the rest of the app already consumes.
 */

export interface ReplicadMesh {
  positions: Float32Array;
  indices: Uint32Array;
  name: string;
}

class ReplicadExecutor {
  private replicad: any = null;
  private initPromise: Promise<void> | null = null;

  /** Public path to replicad's OCCT wasm. Copy it here in your build (see scripts). */
  public wasmPath = '/replicad/replicad_single.wasm';

  async initialize(): Promise<void> {
    if (this.replicad) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    // Dynamic imports keep replicad out of the main bundle until first use.
    const replicad = await import('replicad');
    // @ts-ignore - the single-file build has no bundled types
    const ocFactory: any = (await import('replicad-opencascadejs/src/replicad_single.js')).default;

    const OC = await ocFactory({
      locateFile: () => this.wasmPath,
    });
    replicad.setOC(OC);
    this.replicad = replicad;
    console.log('[REPLICAD] initialized');
  }

  isReady(): boolean {
    return this.replicad !== null;
  }

  /**
   * Execute replicad code. The code body should `return` a replicad Shape (or an
   * array of `{ shape, name }`). Meshing tolerances are conservative for quality.
   */
  async executeCode(code: string): Promise<ReplicadMesh[]> {
    if (!this.replicad) await this.initialize();
    const replicad = this.replicad;

    const cleaned = stripFences(code);

    // Expose the whole namespace plus the most-used constructors as bare names,
    // matching how replicad examples are written.
    const api = {
      replicad,
      draw: replicad.draw,
      drawCircle: replicad.drawCircle,
      drawRectangle: replicad.drawRectangle,
      drawRoundedRectangle: replicad.drawRoundedRectangle,
      drawPolysides: replicad.drawPolysides,
      drawText: replicad.drawText,
      sketchCircle: replicad.sketchCircle,
      sketchRectangle: replicad.sketchRectangle,
      makeCylinder: replicad.makeCylinder,
      makeSphere: replicad.makeSphere,
      makeBox: replicad.makeBox,
      makeBaseBox: replicad.makeBaseBox,
      makePlane: replicad.makePlane,
      Vector: replicad.Vector,
      compoundShapes: replicad.compoundShapes,
    };

    const fn = new Function(...Object.keys(api), `"use strict";\n${cleaned}`);
    const result = fn(...Object.values(api));

    if (!result) throw new Error('Replicad code returned nothing');

    const items: Array<{ shape: any; name: string }> = Array.isArray(result)
      ? result.map((r: any, i: number) =>
          r && r.shape ? { shape: r.shape, name: r.name || `part_${i}` } : { shape: r, name: `part_${i}` }
        )
      : [{ shape: result, name: 'ReplicadShape' }];

    return items.map(({ shape, name }) => this.meshShape(shape, name));
  }

  private meshShape(shape: any, name: string): ReplicadMesh {
    if (!shape || typeof shape.mesh !== 'function') {
      throw new Error(`"${name}" is not a replicad Shape`);
    }
    const m = shape.mesh({ tolerance: 0.05, angularTolerance: 0.3 });
    // replicad returns flat vertices [x,y,z,...] and flat triangles (indices).
    return {
      positions: new Float32Array(m.vertices),
      indices: new Uint32Array(m.triangles),
      name,
    };
  }
}

function stripFences(code: string): string {
  let c = code.trim();
  if (c.startsWith('```')) {
    const nl = c.indexOf('\n');
    if (nl !== -1) c = c.slice(nl + 1);
  }
  if (c.endsWith('```')) c = c.slice(0, c.lastIndexOf('```'));
  return c.trim();
}

export const replicadExecutor = new ReplicadExecutor();
