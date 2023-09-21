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

*/
// import * as esbuild from 'https://esm.sh/esbuild' 
import * as path from "https://deno.land/std@0.201.0/path/mod.ts";
import { existsSync, ensureDirSync } from "https://deno.land/std@0.200.0/fs/mod.ts";

import * as esbuild from "https://deno.land/x/esbuild@v0.19.2/mod.js";
import { denoPlugins } from "./plugins/esbuild_deno_loader/mod.ts";
import pluginVue from "https://esm.sh/esbuild-plugin-vue-next";

import { brightGreen } from "https://deno.land/std@0.200.0/fmt/colors.ts";
import { green, red, yellow } from "https://deno.land/std@0.140.0/fmt/colors.ts";

const args = Deno.args;

// console.log(args);

if(!args[0]) {
    console.log(red('Require file or package name. Usage: vendor react'));
    Deno.exit();
}

const cwd = Deno.cwd();
// const dirname = path.resolve(path.dirname(args[0])) || cwd;
// const outdir = path.join(cwd, 'vendor_modules');
// const outdir = path.join(cwd, 'vendor/modules/');

const env = (key: string) => Deno.env.get(key);
const outdir = path.join(cwd, env('MODULES_DIR') || 'node_modules');

const cdnUrl = env('ESM_CDN') || env('CDN_URL') || env('ESM_CDN_URL') || 'https://esm.sh';
const cdn = (name: string) => cdnUrl.replace('/\/$/', '') + '/' + name;

async function main() {
    let isFile = false;
    let filePackageName = '';
    if (existsSync(path.join(cwd, args[0])) && /\.[cm]?[jt]sx?$/.test(args[0])) {
        isFile = true;
        filePackageName = path.basename(cwd) + '-' + path.basename(args[0]); // keep the ext :)

        console.log('name:', filePackageName);
        const pluginOpts = getDenoOpts(''); //
        const entry = args[0];

        printOutSize(await build(entry, filePackageName, pluginOpts));
        
        createPackagejson(filePackageName);
    } else {
        const name = getInstallName();
        const denoPluginOpts = getDenoOpts(name);
        const entry = prepareInstallPackage(name);

        printOutSize(await build(entry, name, denoPluginOpts));

        createPackagejson(name);
    }
}

function getInstallName() {
    console.log('Installing to:', outdir);
    const name = args[0];
    console.log(green(cdn(name)));

    return name;
}

function getDenoOpts(name: string) {
    const denoJson = env('DENO_JSON') ?? "deno.json";
    const denoPluginOpts: DenoPluginOpts = { context: new Object };
    const denoJsonFile = path.join(cwd, denoJson);

    if (existsSync(denoJsonFile)) {
        denoPluginOpts.configPath = denoJsonFile;
        console.log('deno.json: ', denoPluginOpts.configPath);
    } else if (existsSync(path.join(cwd, denoJson))) {
        denoPluginOpts.configPath = path.join(cwd, denoJson);
        console.log('deno.json: ', denoPluginOpts.configPath);
    } else {
        denoPluginOpts.configPath = path.join(cwd, 'deno.json');
        Deno.writeTextFileSync(denoPluginOpts.configPath, '{}');
    }

    if (existsSync(denoPluginOpts.configPath) && name) {
        let configJson: {imports?: any} = {};
        try { configJson = JSON.parse(Deno.readTextFileSync(denoPluginOpts.configPath)); } catch(e){ console.error(e) }
        if (!configJson) configJson = {};
        if (!configJson.imports) configJson.imports = {}
        if (!configJson.imports[name]) configJson.imports[name] = cdn(name);

        Deno.writeTextFileSync(denoPluginOpts.configPath, JSON.stringify(configJson, null, 4));
    }
    
    return denoPluginOpts;
}

function prepareInstallPackage(name: string) {
    ensureDirSync(path.join(outdir, `${name}`));
    const inFile = path.join(outdir, `${name}/export.js`);
    Deno.writeTextFileSync(inFile, `export * from "${name}";`);
    return inFile;
}

async function build(entry: string, name: string, denoPluginOpts: DenoPluginOpts) {
    const outfile = `${outdir}/${name}/index.js`;

    const result = await esbuild.build({
        entryPoints: [entry],
        outfile, // package naming convention
        bundle: true,
        treeShaking: env('ESBUILD_MINIFY') || false,
        format: env('ESBUILD_FORMAT') || 'esm',
        minify: env('ESBUILD_MINIFY') || true,
        platform: env('ESBUILD_PLATFORM') || 'node',
        //platform: 'node',
        external: (env('ESBUILD_EXTERNAL')? (env('ESBUILD_EXTERNAL')||'').split(','): ['require', 'fs', 'path']),

        plugins: [
            // pluginVue({
            //     templateOptions: 'compile',
            // }),
            ...denoPlugins(denoPluginOpts),
            // usemin({
            //     read_only: false,
            //     file_types: ['html', 'php', 'cshtml', 'hbs'],
            //     outdir: outdir,
            // })
        ]
    });

    if (result.outputFiles) console.log(result.outputFiles.map(o => o.text.toString()));

    return outfile;
}

function printOutSize(file: string) {
    if (!existsSync(file)) return;

    const sz = Deno.statSync(file).size;
    console.log(
        file,
        sz < 2048
        ? yellow(sz + "") + " bytes"
        : yellow((Math.ceil(sz / 10) / 100) + "") + " KB"
    );
};

function createPackagejson(name: string) {
    console.log(outdir);
    const packageJson = {
        name: name,
        type: 'module',
        exports: {
            '.': './index.js'
        }
    };
    // loop through existing dirs and update exports
    // ...
    // // // // //

    // finally write
    Deno.writeTextFileSync(`${outdir}/${name}/package.json`, JSON.stringify(packageJson, null, 4))
    return true;
}

await main();

esbuild.stop();

console.log(brightGreen("Done"));


interface DenoPluginOpts {
    configPath?: string
    context?: object
};
