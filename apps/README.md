# apps/

One HTML file per game. Each is self-contained markup plus its own level generators, and
loads `../shared/theme.css` and `../shared/engine.js`.

Chapter 2 (straight lines and simultaneous equations): `line-lab`, `crossing`,
`two-equations`, `story-solver`, plus `daily-mix`, which draws rounds from every app.

Goes here: a playable game covering one algebra topic.
Does not go here: shared styling, shared helpers, or anything needing a build step.
