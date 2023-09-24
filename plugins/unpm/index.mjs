/*
    umpm - Universal Package Manager
*/
import fs, { read } from "fs";
import path from "path";
import esbuild from "../esbuild_node/lib/main.js"
// import umdWrapper from "esbuild-plugin-umd-wrapper";

console.log('unpm - [U]niversal [N]ode [P]ackage [M]anager, umd/esm alternative to npm');

function getPackageNameWithNamespace(name){ return name[0] == '@'? name: name.split('/')[0]}
function getPackageFilename(name){ return name.replace(/\//, '-'); }

async function fetchCdn(name, version = 'latest') {
    if(name.indexOf('@') > 0) {
        const specifier = name.split('@');
        if(!name[0]) specifier.shift();
        [name, version] = specifier;
    }
    version = version.replace(/^\^/, '');
    //return console.log(name, version);
    const tags = ['latest'];
    const versionOrLatest = version && tags.indexOf(version) == -1? [version, ...tags]: tags; // final
    const umdOrDist = ['umd', 'dist', 'dist/umd'];
    // const nameOrIndex = [name, 'index'];
    const nameOrIndex = [name];
    const productionMin = ['.production.min', '.min', ''];
    //const jsExt = ['js', 'mjs'];
    const jsExt = ['js']; // .mjs can be specified at cdn/package level if required..

    const packageFullName = name;
    const packageName = getPackageNameWithNamespace(packageFullName);
    const packageFileName = getPackageFilename(packageFullName);

    const import_map = Store.instance.downloadImportMapJson();

    const imports = import_map.imports || {};
    const packageMap = import_map.map || {};

    if (imports[packageFullName+'@'+version]) return fetchAndWrite(imports[packageFullName+'@'+version], packageFullName, version);
    if (imports[packageFullName] && version != 'latest' && version.split('.').length < 3) { // not a semver
        const imp1 = Object.keys(imports).filter(i => i.indexOf('@') > -1 && i.split('@')[0] == packageFullName && i.split('@')[1].split('.')[0] == version);
        console.log('Matched version:', imp1);
        if (imp1[0] && imports[imp1[0]]) return fetchAndWrite(imports[imp1[0]], packageFullName, version);
    }
    else if (imports[packageFullName]) return fetchAndWrite(imports[packageFullName], packageFullName, version);

    const unpmGithubUrl = `https://cdn.jsdelivr.net/gh/scriptmaster/unpm/node_modules/@unpm/`;
    // `https://raw.githubusercontent.com/scriptmaster/unpm/main/node_modules/@unpm/${name}@{versionOrLatest}/${name}.min.js`;
    const cdnMap = {
        [unpmGithubUrl]: {
            umdOrDist: [''], nameOrIndex: [packageFileName], productionMin: ['.min'], jsExt: ['js'], singleDist: true,
        },
        'https://unpkg.com/': {umdOrDist: ['umd', 'dist', 'dist/umd'], nameOrIndex: [packageFileName], productionMin: ['.production', '.browser.production'], jsExt: ['min.js', 'js'] }, // the default one
        'https://esm.run/': {
            umdOrDist: ['umd'], nameOrIndex: [packageFileName], productionMin: ['.production', '.browser.production'], jsExt: ['min.js'] // this auto-puts a /+esm onto cdn.jsdelivr.net/npm/
        },
        'https://esm.sh/': {}, // deno/esm only, Pfft
        // 'https://cdn.jsdelivr.net/npm/': {}, // same as esm.run/
    }
    // const mapper = (map1, map2, g1 = '', g2 = '') => map1.reduce((p, m1) => [...p, ...map2.map(m2 => `${m1}${g1}${m2}${g2}`)], []);
    const mapper = (map1, map2, g1 = '', g2 = '') => map1.reduce((p, m1) => p.concat(map2.map(m2 => m2? `${m1}${g1}${m2}${g2}`: `${m1}${g1}`)), []);

    const pMap = packageMap[name] || {};
    const cdns = pMap["cdn"] ?? Object.keys(cdnMap); // ['https://esm.run/', 'https://unpkg.com', 'https://cdn.jsdelivr.net/npm/', 'https://esm.sh', unpmGithubUrl];

    let urls = [];
    for(const cdn of cdns) {
        let map = [];
        const c = cdnMap[cdn];
        const packageNameResolved = (packageName[0] == '@' || (pMap[packageName] && pMap[packageName].fullName))? packageFullName: packageName;
        map = mapper([cdn], [packageNameResolved])
        map = mapper(map, versionOrLatest, '@');
        map = mapper(map, pMap['umd'] || c['umdOrDist'] || umdOrDist, '/', '/');
        map = mapper(map, pMap['file'] || c['nameOrIndex'] || nameOrIndex);
        map = mapper(map, pMap['production'] || c['productionMin'] || productionMin);
        map = mapper(map, pMap['extension'] || c['jsExt'] || jsExt, '.');
        urls = urls.concat(map);
    }

    // console.log('urls:', urls);
    const eraseLine = '\x33[2K\r';

    console.log(name, version);
    for(const a in urls) {
        //console.log(yellow('.'))
        console.log(eraseLine+urls[a]);
        const result = await fetchAndWrite(urls[a], name, version);
        if (result) return true;
    }

    async function fetchAndWrite(url, name, version) {
        const res = await fetch(url, { method: 'HEAD' });
        if(res.status == 200) {
            const found = await fetch(url);
            console.log(200, found.url);

            const specificVersion = getVersionFromUrl(getPackageName(name), version, found.url);
            await writeRes(found, name, specificVersion);

            writeImportMap(name, specificVersion, found.url);
            return true;
        } else {
            //console.log(res.status);
            return false
        }
    }

    async function writeRes(res, name, version) {
        const text = await res.text();
        if(!fs.existsSync('./node_modules/'+name)) fs.mkdirSync('./node_modules/'+name, {recursive: true});
        writeTextFileSync(path.join('./node_modules/', name, '/index.js'), text);
        // console.log(text);
        writePackageJson(name, version);
    }

    function writePackageJson(name, version) {
        const packageJson = json_parse(fs.readFileSync('package.json'));
        if(packageJson.dependencies) {
            if(!packageJson.dependencies[name]) {
                console.log('updating package.json in cwd:', name, '^'+version);
                packageJson.dependencies[name] = '^'+(version.replace(/^\@\^/, ''));
                writeTextFileSync('package.json', JSON.stringify(packageJson, null, 2));
            }
        }
        console.log('writing module package.json for: ', name, version);
    }

    function getVersionFromUrl(name, version, url) {
        //if(version == 'latest' || version.split('.').length < 3) {
        const m = url.match(new RegExp('\\/'+name+'\\@'+'([\\d\\.]+)\\/'));
        if (m && m[1]) return m[1];
        // }
        return version;
    }

    function writeImportMap(name, version, url) {
        if(!import_map.imports) import_map.imports = {}
        import_map.imports[name+'@'+version] = url;
        writeTextFileSync('unpm.import_map.json', JSON.stringify(import_map, null, 2))
    }
}

function writeTextFileSync(filename, data) {
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    fs.writeFileSync(filename, data, {encoding: 'utf8'});
}

export class Store {

    // pattern-1
    static _cache = {};
    static get(key) {
        return this._cache[key];
    }
    static set(key, value) {
        return this._cache[key] = value;
    }

    // pattern-2
    static instance = new Store();

    importMapJson = null;
    async downloadImportMapJson() {
        if(this.importMapJson) return this.importMapJson;

        const filename = 'unpm.import_map.json';
        const url = `https://cdn.jsdelivr.net/gh/scriptmaster/unpm/unpm.import_map.json`;

        this.importMapJson = JSON.parse(await this.getOrDownload(filename, url)) || {};
    }

    readCache = {};
    async getOrDownload(filepath, remoteUrl, text = '') {
        if(this.readCache[filepath]) return this.readCache[filepath];

        if(fs.existsSync(filepath)) {
            text = fs.readFileSync(filepath);
        } else {
            console.log('Downloading to '+filepath);
            const res = await fetch(remoteUrl);
            text = await res.text();

            writeTextFileSync(filepath, text);
        }

        this.readCache[filepath] = text;
        return text;
    }

    readPackageJson() {
        const packageJson = json_parse(fs.readFileSync('package.json'));
        const deps = packageJson.dependencies || {};
        const devDeps = packageJson.devDependencies || {};
        return [packageJson, deps, devDeps];
    }

    parsedCommandInputs = null;
    parseCommandInputs(argv = null) {
        if (this.parsedCommandInputs) return parsedCommandInputs;

        const args = argv || process.argv;
        if (/unpm\.mjs$/.test(args[1]) || /unpm\/index\.mjs$/.test(args[1])) args.shift();

        this.parsedCommandInputs = args.reduce((p, a) => {
            if(a.startsWith('--')) {
                p[1].push(a);
            } else {
                p[0].push(a);
            }
            return p;
        }, [[], []]);

        return this.parsedCommandInputs;
    }

}

async function main() {
    const [args, options] = Store.instance.parseCommandInputs();
    Store.set('options', options);

    // if(process.env.HOME && fs.existsSync(process.env.HOME)) {
    //     fs.mkdirSync(path.join(process.env.HOME, '.cache/unpm/'), {recursive: true});
    // }

    if(!args[1] || args[1] == 'install' || args[1] == 'i') {
        console.log('Installing modules from package.json');
        const [packageJson, deps, devDeps] = Store.instance.readPackageJson();

        await Store.instance.downloadImportMapJson();

        for(const d of Object.keys(deps)) {
            console.log('dep: ', d);
            await fetchOrDownload(d, deps[d]);
        }

        for(const d of Object.keys(devDeps)) {
            //console.log('devDep: ', d);
            //fetchUnpkgUmd(d, devDeps[d].replace(/^\^/, ''));
        }
    } else if (args[1] == 'optimize') {
        // optimize existing node_modules bundles with esbuild and delete the previous ones // far-fetched :(
    } else {
        console.log('Installing '+args[1]);
        await fetchOrDownload(args[1]);
    }

    async function fetchOrDownload(d, e = '') {
        if(options.includes('--cdn')) {
            await fetchCdn(d, e.replace(/^\^/, '')); // parallel processing //
        } else {
            if(options.includes('--npm')) {
                await downloadPackageFromRegistryTarball(d, e.replace(/^\^/, ''));
            } else {
                await downloadPackageFiles(d, e.replace(/^\^/, ''));
            }
        }
    }
}

function json_parse(jsonText){ try { return JSON.parse(jsonText); } catch(e) { console.error('json_parse: ', e) } return {}; }

main();


async function downloadPackageFiles(name, version) {
    // download from jsdeliver browse package.json and index file
    const n = getPackageNameWithNamespace(name);

    const cdn = 'https://cdn.jsdelivr.net/npm';
    //const cdn = 'https://unpkg.com';

    const packageDir = `./node_modules/${name}`;
    fs.mkdirSync(packageDir, {recursive: true});

    if(!version) version = 'latest';
    const url = `${cdn}/${n}@${version}/`;

    const jsonText = await Store.instance.getOrDownload(packageDir+'/package.json', path.join(url, 'package.json'));
    const packageJson = json_parse(jsonText);

    const packageName = getPackageNameWithNamespace(name);

    const subPath = (name[0] != '@' && name.includes('/')? name.substr(packageName.length) : '.') || '.';
    if (subPath != '.') console.log('subPath found:', name, version, subPath);

    const files = {};
    const download = async (fileRelPath) => {
        const localFile = path.join(packageDir, fileRelPath);
        const remoteFile = path.join(url, fileRelPath);
        // ... // ... // ... // ...
        files[localFile] = remoteFile;
        await Store.instance.getOrDownload(localFile, remoteFile);
    }
    if(packageJson['main:umd']) await download(packageJson['main:umd']);
    if(packageJson['main']) await download(packageJson['main']);
    if(packageJson['exports'] && 
        packageJson['exports'][subPath]) {
            const exp = packageJson['exports'][subPath];
            if(exp['default']) {
                if (typeof exp['default'] == 'string') await download(exp['default']);
                else if (exp['default']['.']) await download(exp['default']['.']);
                else if (exp['default']['cjs']) await download(exp['default']['cjs']);
            }
            if(exp['require']) {
                if (typeof exp['require'] == 'string') await download(exp['require']);
                if (exp['require']['default']) await download(exp['require']['default']);
                else if (exp['require']['.']) await download(exp['require']['.']);
                else if (exp['require']['cjs']) await download(exp['require']['cjs']);
            }
        }

    // check the build size
    console.log('filesDownloaded:', files);
    
    const excludedPackagesFromBundling = ['esbuild'];

    if( ! excludedPackagesFromBundling.includes(name)) {
        Object.keys(files).map(async (f) => {
            //await createUmdBuild(f);
        });
    }

    // createUmdBuild from esbuild, if --bundle option;
    // createUmdBuild()

    // const options = Store.get('options');
}


async function downloadPackageFromRegistryTarball(name, version) {
    // 
}

//const esbuild = require("esbuild");
//const umdWrapper = require("esbuild-plugin-umd-wrapper");
async function createUmdBuild(entryFile) {

    console.log('entryFile:', path.resolve(entryFile));
    entryFile = path.resolve(entryFile);

    return await esbuild
        .build({
            entryPoints: [entryFile],
            outdir: "public",
            format: "iife",
            bundle: true,
            //plugins: [unpm_esbuild()],
            // external: ['esbuild'],
        });
    // .then((result) => console.log(result))
    // .catch(() => process.exit(1));
}

const unpmDefaultOptions = {};
export function unpm_esbuild(customOptions) {
    let options = { ...unpmDefaultOptions, ...customOptions };
    const plugin = {
        name: 'unpm',
        setup(build) {
            console.log('esbuild: setup:', build, options);
        }
    }

    return plugin;
}


export const ANSIColors = {
    'red': 91,
    'green': 92,
    'yellow': 93,
    'blue': 94,
    'cyan': 96,
};
export const colorify = (color, msg) => { return `\x1b\[${ANSIColors[color] || 93}m${msg}\x1b[0m`; }
export function log(color, ...msg) {
    console.log.apply(console, msg.map(m => colorify(color, m)))
}
export const red = m => colorify('red', m)
export const green = m => colorify('green', m)
export const yellow = m => colorify('yellow', m)
export const blue = m => colorify('blue', m)
export const cyan = m => colorify('cyan', m)
export const colors = { red, green, yellow, blue, cyan };
