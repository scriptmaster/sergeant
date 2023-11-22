export default function(m, Fragment) { return m("[", null, m("div", {
  id: "color"
}, m("div", {
  class: "text-white"
}, "How Static White Text Looks Like"), m("div", {
  class: "text-black"
}, "How Static Black Text Looks Like"), m("div", {
  id: "ai-guess"
}, "The Color AI Guessed/Recommended")), m("section", {
  class: "container"
}, m("button", {
  class: "btn btn-light btn-sm",
  id: "train-white"
}, "White"), m("button", {
  class: "btn btn-dark btn-sm",
  id: "train-black"
}, "Black"), m("span", {
  id: "training-size"
}, "0"), m("button", {
  class: "btn btn-primary btn-sm",
  id: "guess-next"
}, "Guess Next")), m("div", {
  id: "nn-diagram"
}));
}
