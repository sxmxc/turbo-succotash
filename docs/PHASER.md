# Phaser integration guardrails

Phaser owns the game surface. Vue owns surrounding DOM UI and communicates through the small `mountRoom` adapter.

Current Milestone 1 uses Phaser core for:

- Scene lifecycle and Loader/Tilemap creation.
- Keyboard and pointer/touch input, including pointer world coordinates.
- Game Objects and Containers for layered LPC players, labels and bubbles.
- AnimationManager/AnimationState for walking cycles.
- ScaleManager FIT/centering and pixel-art rendering.

Realtime, not Phaser or Vue, remains authoritative for movement and collision. The browser sends normalized intent or a world target and renders replicated state.

Before changing a Phaser subsystem, consult the applicable official [Phaser AI skill](https://github.com/phaserjs/phaser/tree/master/skills). Evaluate Phaser core before adding custom infrastructure. The [Rex plugin catalog](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/plugin-list/) was reviewed for this milestone; no plugin is currently adopted because core directly covers the required input, animation, containers, tilemaps and scaling. Re-evaluate Rex or another maintained plugin for a concrete missing capability such as advanced UI, pathfinding or specialized effects. Record its exact version, Phaser compatibility, license and reason before installation.
