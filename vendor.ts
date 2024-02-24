#!deno
// import * as esbuild from 'https://esm.sh/esbuild'
import * as path from "https://deno.land/std@0.201.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.201.0/fs/mod.ts";
import { existsSync, ensureDirSync } from "https://deno.land/std@0.200.0/fs/mod.ts";

import * as esbuild from "https://deno.land/x/esbuild@v0.19.2/mod.js";
import { denoPlugins } from "./plugins/esbuild_deno_loader/mod.ts";
import pluginVue from "https://esm.sh/esbuild-plugin-vue-next";

import { brightGreen } from "https://deno.land/std@0.200.0/fmt/colors.ts";
import { green, red, yellow } from "https://deno.land/std@0.140.0/fmt/colors.ts";
import { join } from "https://deno.land/std@0.201.0/path/join.ts";

const args = Deno.args;
const packageName = args[0];
const packageVersion = args[1] || '';
const cwd = Deno.cwd();

const env = (key: string) => Deno.env.get(key);
const outdir = '.vendor';

const cdnUrl = env('ESM_CDN') || env('CDN_URL') || env('ESM_CDN_URL') || 'https://esm.sh';
const cdn = (name: string, version = '') => cdnUrl.replace('/\/$/', '') + '/' + name + (version? '@'+version: '');
const latestVersions: Dict<string> = {};

export interface Dict<T> { [Key: string]: T; }
export interface PackageJson { name: string, type?: string, dependencies?: Dict<string>, devDependencies?: Dict<string>, exports?: Dict<string> }

if(!packageName) {
    let packageJson: PackageJson = { name: '' };
    try {
        if (existsSync( join(cwd, 'package.vendor.json') )) {
            packageJson = JSON.parse( Deno.readTextFileSync( join(cwd, 'package.vendor.json') ) );
        } else if (existsSync( join(cwd, 'package.json') )) {
            packageJson = JSON.parse( Deno.readTextFileSync( join(cwd, 'package.json') ) );
            const packageVendorJson = JSON.stringify(Object.assign({},{about: "package.vendor.json is same as package.json to vendor, except you can edit in this file and still keep track of package names in package.json"},
                packageJson), null, 4);

            Deno.writeTextFileSync(join(cwd, 'package.vendor.json'), packageVendorJson)
        }
    } catch(e) {
        console.error('JSON parse package.json:', e);
    }

    // console.log(packageJson);
    const deps = packageJson.dependencies || ({} as Dict<string>)
    const devDeps = packageJson.devDependencies || ({} as Dict<string>)

    for(const d in deps) {
        if(d && deps[d]) {
            await install(d, deps[d].replace(/^\D/, ''));
        }
    }

    for(const d in devDeps) {
        if(d && devDeps[d]) {
            ///await install(d, devDeps[d].replace(/^\D/, ''));
            await install(d, '');
        }
    }

    // console.log(red('Require file or package name. Usage: vendor react'));
    // Deno.exit();
} else {
    await install(packageName, packageVersion || 'latest', true);
}

// const dirname = path.resolve(path.dirname(installName)) || cwd;
// const outdir = path.join(cwd, 'vendor_modules');
// const outdir = path.join(cwd, 'vendor/modules/');

async function install(packageName: string, version = '', checkFile = false) {
    if (packageName.includes('@')) { [packageName, version] = packageName.split('@') }
    const isFile = checkFile && existsSync(path.join(cwd, packageName)) && /\.[cm]?[jt]sx?$/.test(packageName);
    let filePackageName = '';
    if (isFile) {
        filePackageName = path.basename(cwd) + '-' + path.basename(packageName); // keep the ext :)

        console.log('file:', filePackageName);
        const pluginOpts = getDenoOpts(''); //
        const entry = packageName;

        try {
            const output = await build(entry, filePackageName, version, pluginOpts);
            printOutSize(output);
        } catch(e) { console.error(e); }
    
        createPackageJson(filePackageName, version);
    } else {
        const name = getInstallName(packageName);
        const npmVersion = await getNpmVersion(name, version);
        const denoPluginOpts = getDenoOpts(name);
        const entry = prepareInstallPackage(name, npmVersion);

        try {
            const output = await build(entry, name, npmVersion, denoPluginOpts);
            printOutSize(output);
        } catch(e) { console.error(e); }

        createPackageJson(name, version);
    }

    try {
        const modulesDir = env('MODULES_DIR') || 'node_modules';
        if (modulesDir && !/\w+_modules$/.test(modulesDir)) {
            return console.error('MODULES_DIR should have pattern <name>_modules');
        } else {
            console.log(brightGreen('Moving installed modules to:'), modulesDir);
            const renameTo = path.join(cwd, modulesDir);

            if (!existsSync(renameTo)) fs.ensureDir(renameTo);

            for await (const dirEntry of Deno.readDir(outdir)) {
                if (dirEntry.isDirectory) {
                    const dirTo = join(renameTo, dirEntry.name)
                    if (existsSync(dirTo)) {
                        Deno.removeSync(dirTo, {recursive: true});
                    }
                    Deno.renameSync(join(outdir, dirEntry.name), dirTo);
                }
            }
        }
        Deno.removeSync(outdir, {recursive: true});
    } catch(e) { console.log(e); }

}

function getInstallName(packageName: string) {
    const name = packageName;
    console.log(`Installing ${packageName} to: ${outdir} from ${green(cdn(name))}`);
    return name;
}

function getDenoOpts(name: string) {
    const denoJson = env('DENO_JSON') ?? "deno.json";
    const denoPluginOpts: DenoPluginOpts = { context: new Object };
    const denoJsonFile = path.join(cwd, denoJson);

    if (existsSync(denoJsonFile)) {
        denoPluginOpts.configPath = denoJsonFile;
        // console.log('deno.json: ', denoPluginOpts.configPath);
    } else if (existsSync(path.join(cwd, denoJson))) {
        denoPluginOpts.configPath = path.join(cwd, denoJson);
        // console.log('deno.json: ', denoPluginOpts.configPath);
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

function prepareInstallPackage(name: string, version: string) {
    //console.log('prepare', name, version);
    ensureDirSync(path.join(outdir, `${name}`));

    const inFile = path.join(outdir, `${name}/export.js`);
    Deno.writeTextFileSync(inFile, `export * from "${cdn(name, version)}";`);

    const indexFile = path.join(outdir, `${name}/index.js`);
    Deno.writeTextFileSync(indexFile, `export * from "./${version}.js";`);

    return inFile;
}

async function getNpmVersion(name: string, version: string) {
    if(!version || version == 'latest') {
        if (!latestVersions[name]) {
            const npmResponse = (await (await fetch(`https://registry.npmjs.org/${name}`)).json());
            // console.log(Object.keys(npmResponse));
            latestVersions[name] = npmResponse.version || npmResponse['dist-tags']['latest'] || 'latest';
        }
        return latestVersions[name] || 'latest';
    } else {
        return version;
    }
}

async function build(entry: string, name: string, version: string, denoPluginOpts: DenoPluginOpts) {
    // version = await getNpmVersion(name, version);
    // console.log('getLatestVersion:', version);
    const outfile = `${outdir}/${name}/${version}.js`;
    // console.log('outfile:', outfile);

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

function createPackageJson(name: string, version: string) {
    const packageJson: PackageJson = {
        name,
        type: 'module',
        exports: {
            '.': `./${version}.js`,
            [version]: `./${version}.js`
        }
    };

    const packageJsonFile = `${outdir}/${name}/package.json`;

    // console.log('packageJsonFile', packageJsonFile);
    if (existsSync(packageJsonFile)) {
        const packageJsonRead = JSON.parse(Deno.readTextFileSync(packageJsonFile));
        console.log(packageJsonRead.exports);
        for(const e in packageJsonRead.exports) {
            //console.log('read.exports', e);
            packageJson.exports = Object.assign(packageJsonRead.exports, packageJson.exports);
        }
    }
    // loop through existing dirs and update exports
    // ...
    // // // // //

    // finally write
    Deno.writeTextFileSync(packageJsonFile, JSON.stringify(packageJson, null, 4))
    return true;
}

esbuild.stop();
console.log(brightGreen("Done"));


interface DenoPluginOpts {
    configPath?: string
    context?: object
};
