# Five example prompts

These prompts are starting points for the command bar. Results outside verified
recipes depend on the configured model and backend, so inspect the generated code and
geometry before manufacturing.

## 1. Spur gear

```text
Create a 24-tooth spur gear.
```

Why this is useful: Sphaire recognizes common gear language and uses a deterministic
recipe with an editable tooth-count parameter. Try another integer tooth count to
exercise regeneration.

Review: bore size, module/pitch assumptions, backlash, tooth profile, and your target
printer or machining process. The current recipe is a practical geometric gear, not a
certified involute transmission design.

## 2. Mounting bracket

```text
Create an L-shaped mounting bracket, 60 mm wide and 40 mm tall, with 4 mm thickness, two 5 mm holes on the base, and two 5 mm holes on the upright.
```

Why this is useful: it combines exact dimensions, booleans, and repeated mounting
features.

Iteration prompt:

```text
Keep the hole layout, increase the thickness to 6 mm, and add a 10 mm triangular gusset on each side.
```

Review: hole-edge distance, gusset union, unsupported overhangs, and load direction.

## 3. Phone stand

```text
Create a phone stand with a 70-degree backrest, a 12 mm front retaining lip, a 14 mm cable opening, and a 90 mm wide base.
```

Why this is useful: it tests proportions and user-facing intent rather than a single
primitive.

Iteration prompt:

```text
Round the exposed edges and make the base 15 mm deeper without changing the backrest angle.
```

Review: center of gravity, lip clearance, cable access, and edge comfort.

## 4. Six-hole flange

```text
Create a circular flange with an 80 mm outer diameter, a 30 mm center bore, 8 mm thickness, and six evenly spaced 6 mm bolt holes on a 58 mm bolt circle.
```

Why this is useful: it exercises concentric geometry and circular patterns.

Iteration prompt:

```text
Add a 2 mm chamfer to both outside circular edges and keep every hole dimension unchanged.
```

Review: bolt-circle interpretation, hole count, bore diameter, edge distance, and
whether chamfers survived regeneration.

## 5. Electronics enclosure

```text
Create a two-part electronics enclosure, 100 × 70 × 30 mm overall, with 2 mm walls, four 5 mm corner mounting posts, side ventilation slots, and a removable lid.
```

Why this is useful: it tests multi-part intent and fabrication constraints.

Iteration prompt:

```text
Keep the enclosure dimensions, move all ventilation to the left side, and add a centered 12 mm cable opening on the rear wall.
```

Review: separate body count, lid clearance, wall thickness, post placement, ventilation
bridging, and cable-opening position.

## Prompting tips

- Use millimeters explicitly.
- State counts, diameters, thicknesses, and center-to-center spacing.
- Describe one primary part before asking for refinements.
- Ask to preserve dimensions that must not change.
- Prefer a short correction prompt over repeating an ambiguous original request.
- Treat DFM and visual-review findings as guidance, then verify in your downstream CAD
  or slicer workflow.
