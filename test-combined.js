// Combined Strudel + Hydra test file
// The extension should intelligently provide completions for both

// === STRUDEL SECTION ===
// These should show Strudel completions:

note("c d e f g a b")
  .scale("major")
  .sound("piano")
  .gain(0.8)
  .fast(2)
  .delay(0.2)

stack(
  sequence("bd", "hh", "sd", "hh"),
  note("c3 e3 g3").slow(2)
)

// === HYDRA SECTION ===
// These should show Hydra completions:

osc(10, 0.1, 1.2)
  .rotate(0, 0.1)
  .color(0.9, 0.7, 0.8)
  .kaleid(4)
  .out(o0)

noise(2, 0.1)
  .mult(
    gradient()
      .rotate(() => time * 0.1)
  )
  .out(o1)

// === MIXED CONTEXT ===
// This should show both based on content patterns

// When typing here after Strudel patterns, should show Strudel functions:
// note().

// When typing here after Hydra patterns, should show Hydra functions:
// osc().