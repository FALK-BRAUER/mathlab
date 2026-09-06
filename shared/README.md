# shared/

Code every app depends on. `theme.css` holds the design tokens and component styles;
`engine.js` holds the `MathLab` global — random helpers, the algebra term parser, the quiz
shell and score persistence.

Goes here: anything two or more apps need.
Does not go here: topic-specific question generators — those live with their app.
