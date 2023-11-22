import brain from "https://esm.sh/brain.js";
import m from "https://esm.sh/mithril";
import colorGuesser from "./mithril/color-guesser.js";

import "./main.css";

const nn = new brain.NeuralNetwork({
    //hiddenLayers: [4]
});

console.log(nn);

const data = localStorage.colorGuessData? JSON.parse(localStorage.colorGuessData): [
    {
        input: { r: 0, g: 0, b: 0 },
        output: [1]
    },
    {
        input: { r: 1, g: 1, b: 1 },
        output: [0]
    }
];

nn.train(data);

function main() {
    console.log(colorGuesser);
    m.render(window.document.body, colorGuesser());
    return;

    const diagramEl = document.getElementById('nn-diagram');
    if (diagramEl) {
        diagramEl.innerHTML = brain.utilities.toSVG(nn);
    }

    const colorEl = document.getElementById('color');
    const guessEl = document.getElementById('ai-guess');
    const trainingSizeEl = document.getElementById('training-size');

    const whiteButton = document.getElementById('train-white');
    const blackButton = document.getElementById('train-black');
    const nextButton = document.getElementById('guess-next');


    let color = {
        r: Math.random(),
        g: Math.random(),
        b: Math.random(),
    };
    setRandomColor();

    if (whiteButton) whiteButton.addEventListener('click', () => {
        chooseColor(1);
    });

    if (blackButton) blackButton.addEventListener('click', () => {
        chooseColor(0);
    });

    if (nextButton) nextButton.addEventListener('click', () => {
        setRandomColor()
    });

    function chooseColor(v: number) {
        data.push({
            input: color,
            output: [v]
        })

        localStorage.setItem('colorGuessData', JSON.stringify(data));

        setRandomColor();
    }

    function setRandomColor() {
        color = {
            r: Math.random(),
            g: Math.random(),
            b: Math.random(),
        }

        const result = nn.run(color) as Array<number>;
        const guess = result[0]; // // result && (0 in result)? result[0]: 0;

        if (guessEl) guessEl.style.color = guess >= 0.5? '#fff': '#000';
        if (colorEl) colorEl.style.backgroundColor = `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;
        if (trainingSizeEl) trainingSizeEl.innerText = data.length;
    }
    

    // console.log(nn.run([0, 0]))
    console.log(nn.run( { r: 1, g: 1, b: 0 } ))
}

main()



