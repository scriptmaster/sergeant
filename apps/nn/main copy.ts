import brain from "https://esm.sh/brain.js";

const nn = new brain.NeuralNetwork({
    //hiddenLayers: [4]
});

console.log(nn);

nn.train([
    {
        input: [0, 0],
        output: [0]
    },
    {
        input: [1, 0],
        output: [1]
    },
    {
        input: [0, 1],
        output: [1]
    },
    {
        input: [1, 1],
        output: [0]
    }
]);

const diagramEl = document.getElementById('nn-diagram');
if (diagramEl) {
    diagramEl.innerHTML = brain.utilities.toSVG(nn);
}

console.log(nn.run([0, 0]))
