/*

esbuild plugin: https://github.com/oliverkuchies/esbuild-usemin

https://esm.sh/usemin@0.6.0

https://esm.sh/usemin-cli@0.6.0

https://github.com/nelsyeung/usemin

var defaults = {
	output: false, // HTML output path. If false, it will be printed to the console (string)
	configFile: false, // config file path for UglifyJS, CleanCSS and HTML minifier (string)
	config: false, // UglifyJS, CleanCSS and HTML minifier configs,
	               // similar format to the config file (object)
	htmlmin: false, // Whether to minify the input HTML file (Boolean)
	noprocess: false, // Do not process files, just replace references (Boolean)
	removeLivereload: false, // Remove livereload script (Boolean)
};

var html = usemin('src/index.html', 'dist');
usemin('src/index.html', 'dist', {
	output: 'dist/index.html',
	htmlmin: true,
	removeLivereload: true,
});



*/
// import * as esbuild from 'https://esm.sh/esbuild' 
import * as path from "https://deno.land/std@0.201.0/path/mod.ts";
import { existsSync } from "https://deno.land/std@0.200.0/fs/mod.ts";

import * as esbuild from "https://deno.land/x/esbuild@v0.19.2/mod.js";
import usemin from 'https://esm.sh/gh/oliverkuchies/esbuild-usemin'; 
import { denoPlugins } from "./plugins/esbuild_deno_loader/mod.ts";
import pluginVue from "https://esm.sh/esbuild-plugin-vue-next";

import { brightGreen } from "https://deno.land/std@0.200.0/fmt/colors.ts";

const args = Deno.args;

if(!args[0] || !existsSync(args[0])) {
    throw new Error('Require file name. Usage: usemind index.html');
}

const cwd = Deno.cwd();
const dirname = path.resolve(path.dirname(args[0])) || cwd;
const outdir = path.join(dirname, 'dist');

console.log('esbuildOpt.outdir:', outdir);

const denoJson = Deno.env.get('DENO_JSON') ?? "deno.json";
const denoPluginOpts: DenoPluginOpts = { context: new Object };
const denoJsonFile = path.join(dirname, denoJson);

if (existsSync(denoJsonFile)) {
  denoPluginOpts.configPath = denoJsonFile;
  console.log('deno.json: ', denoPluginOpts.configPath);
} else if (existsSync(path.join(cwd, denoJson))) {
  denoPluginOpts.configPath = path.join(cwd, denoJson);
  console.log('deno.json: ', denoPluginOpts.configPath);
}


const result = await esbuild.build({
    entryPoints: [
        {
            out: 'dist',
            in: args[0] || '.'
        }
    ],

    // write: false,

    outdir: outdir, 
    bundle: true,
    format: 'esm',
    splitting: true,
    platform: 'neutral',
    external: ['require', 'fs', 'path'],

    plugins: [
        pluginVue({
            templateOptions: 'compile',
        }),
        ...denoPlugins(denoPluginOpts),
        usemin({
            read_only: false,
            file_types: ['html', 'php', 'cshtml', 'hbs'],
            outdir: outdir,
        })
    ]
});

if (result.outputFiles) console.log(result.outputFiles.map(o => o.text.toString()));
//console.log(result);

esbuild.stop();

console.log(brightGreen("Done"));

/*
await esbuild.build({
entryPoints: [ 
    {
        out: 'sample.dist', 
        in: 'test/sample/sample.php' 
    }, 
], 
    outdir: outdir, 
    bundle: true, 
    platform: 'node',
    external: ['require', 'fs', 'path'],
    plugins: [ 
        usemin({ 
            read_only: false, 
            file_types: ['php', 'html'], 
            outdir: outdir,
        })
    ], 
    format: 'iife', 
    minify: true, 
    target: ['es2022'] 
});
*/



interface DenoPluginOpts {
    configPath?: string
    context?: object
  };
  