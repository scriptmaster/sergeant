/*
    umpm - Universal Package Manager
*/
import fs from "fs";
import path from "path";

console.log('unpm - Universal(modules) node package manager, alternative to npm');

async function fetchCdn(name, version = 'latest') {
    if(name.indexOf('@') > -1) { [name, version] = name.split('@'); }
    version = version.replace(/^\^/, '');
    const tags = ['latest'];
    const versionOrLatest = version && tags.indexOf(version) == -1? [version, ...tags]: tags; // final
    const umdOrDist = ['umd', 'dist', 'dist/umd'];
    const nameOrIndex = [name, 'index'];
    const productionMin = ['.production.min', '.min', ''];
    const jsExt = ['js', 'mjs'];

    let import_map_text = '{}';
    if(fs.existsSync('unpm.import_map.json')) {
        import_map_text = fs.readFileSync('unpm.import_map.json');
    } else {
        const import_map_url = `https://raw.githubusercontent.com/scriptmaster/unpm/main/unpm.import_map.json`;

        console.log('Downloading unpm.import_map.json');
        const import_map_res = await fetch(import_map_url);
        import_map_text = await import_map_res.text();
        writeTextFileSync('unpm.import_map.json', import_map_text)
    }
    const import_map = JSON.parse(import_map_text) || {};

    const imports = import_map.imports || {};
    const packageMap = import_map.map || {};

    if (imports[name+'@'+version]) return fetchAndWrite(imports[name+'@'+version]);
    if (imports[name] && version != 'latest' && version.split('.').length < 3) { // not a semver
        const imp1 = Object.keys(imports).filter(i => i.indexOf('@') > -1 && i.split('@')[1].split('.')[0] == version);
        console.log('Matched version:', imp1);
        if (imp1[0] && imports[imp1[0]]) return fetchAndWrite(imports[imp1[0]]);
    }
    else if (imports[name]) return fetchAndWrite(imports[name]);

    const unpmGithubUrl = `https://raw.githubusercontent.com/scriptmaster/unpm/main/node_modules/@unpm/`;
    // `https://raw.githubusercontent.com/scriptmaster/unpm/main/node_modules/@unpm/${name}@{versionOrLatest}/${name}.min.js`;
    const cdnMap = {
        [unpmGithubUrl]: {
            umdOrDist: [''], nameOrIndex: [name], productionMin: ['.min'], jsExt: ['js'], singleDist: true,
        },
        'https://esm.run/': {
            umdOrDist: ['umd'], nameOrIndex: [name], productionMin: ['.production.min', '.min'], jsExt: ['js'] // this auto-puts a /+esm onto cdn.jsdelivr.net/npm/
        },
        'https://unpkg.com/': {}, // the default one
        // 'https://cdn.jsdelivr.net/npm/': {}, // same as esm.run/
        'https://esm.sh/': {},
    }
    // const mapper = (map1, map2, g1 = '', g2 = '') => map1.reduce((p, m1) => [...p, ...map2.map(m2 => `${m1}${g1}${m2}${g2}`)], []);
    const mapper = (map1, map2, g1 = '', g2 = '') => map1.reduce((p, m1) => p.concat(map2.map(m2 => `${m1}${g1}${m2}${g2}`)), []);

    const pMap = packageMap[name] || {};
    const cdns = pMap["cdn"] ?? Object.keys(cdnMap); // ['https://esm.run/', 'https://unpkg.com', 'https://cdn.jsdelivr.net/npm/', 'https://esm.sh', unpmGithubUrl];

    let urls = [];
    for(const cdn of cdns) {
        let map = [];
        const c = cdnMap[cdn];
        map = mapper([cdn], [name])
        map = mapper(map, versionOrLatest, '@');
        map = mapper(map, pMap['umd'] || c['umdOrDist'] || umdOrDist, '/', '/');
        map = mapper(map, pMap['name'] || c['nameOrIndex'] || nameOrIndex);
        map = mapper(map, pMap['production'] || c['productionMin'] || productionMin);
        map = mapper(map, pMap['extension'] || c['jsExt'] || jsExt, '.');
        urls = urls.concat(map);
    }

    console.log('urls:', urls);
    const eraseLine = '\x33[2K\r';

    for(const a in urls) {
        console.log(eraseLine+urls[a]);
        const result = await fetchAndWrite(urls[a]);
        if (result) return true;
    }

    async function fetchAndWrite(url) {
        // console.log('fetchAndWrite', url);
        const res = await fetch(url);
        if(res.status == 200) {
            await writeRes(res);
            return true;
        } else {
            console.log(res.status);
            return false
        }
    }

    async function writeRes(res) {
        const text = await res.text();
        writeTextFileSync(path.join('./node_modules/', name, '/index.unpm.js'), text);
        // console.log(text);
    }
}

function writeTextFileSync(filename, data) { fs.writeFileSync(filename, data, {encoding: 'utf8'}); }

async function main() {
    const args = process.argv;
    if (/unpm\.mjs$/.test(args[1]) || /unpm\/index\.mjs$/.test(args[1])) args.shift();

    if(!args[1] || args[1] == 'install' || args[1] == 'i') {
        console.log('Installing modules from package.json');
        const packageJson = json_parse(fs.readFileSync('package.json'));
        const deps = packageJson.dependencies || {};
        const devDeps = packageJson.devDependencies || {};
        for(const d of Object.keys(deps)) {
            console.log('dep: ', d);
            fetchCdn(d, deps[d].replace(/^\^/, '')); // parallel processing //
        }
        for(const d of Object.keys(devDeps)) {
            console.log('devDep: ', d);
            //fetchUnpkgUmd(d, devDeps[d].replace(/^\^/, ''));
        }
    } else if (args[1] == 'optimize') {
        // optimize existing node_modules bundles with esbuild and delete the previous ones // far-fetched :(
    } else {
        console.log('Installing '+args[1]);
        await fetchCdn(args[1])
    }
}

function json_parse(jsonText){ try { return JSON.parse(jsonText); } catch(e) { console.error('json_parse: ', e) } return {}; }

main();
