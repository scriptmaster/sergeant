/*
    umpm - Universal Package Manager
*/
import fs from "fs";
import path from "path";
import cp from "child_process";
import esbuild, { version } from "../esbuild_node/lib/main.js";
// import umdWrapper from "esbuild-plugin-umd-wrapper";

console.log(
  "unpm - [U]niversal [N]ode [P]ackage [M]anager, umd/esm alternative to npm",
);

if (process.version.split(".")[0].split("v")[1] < 18) {
  console.error(
    "Minimum node version required: node 18, current node version: ",
    process.version,
  );
  process.exit(0);
}

function getPackageNameWithNamespace(name) {
  return name[0] == "@" ? name : name.split("/")[0];
}
function getPackageFilename(name) {
  return name.replace(/\//, "-");
}

async function fetchCdn(name, version = "latest") {
  if (name.indexOf("@") > 0) {
    const specifier = name.split("@");
    if (!name[0]) specifier.shift();
    [name, version] = specifier;
  }
  version = version.replace(/^\^/, "");
  //return console.log(name, version);
  const tags = ["latest"];
  const versionOrLatest = version && tags.indexOf(version) == -1
    ? [version, ...tags]
    : tags; // final
  const umdOrDist = ["umd", "dist", "dist/umd"];
  // const nameOrIndex = [name, 'index'];
  const nameOrIndex = [name];
  const productionMin = [".production.min", ".min", ""];
  //const jsExt = ['js', 'mjs'];
  const jsExt = ["js"]; // .mjs can be specified at cdn/package level if required..

  const packageFullName = name;
  const packageName = getPackageNameWithNamespace(packageFullName);
  const packageFileName = getPackageFilename(packageFullName);

  const import_map = Store.instance.downloadImportMapJson();

  const imports = import_map.imports || {};
  const packageMap = import_map.map || {};

  if (imports[packageFullName + "@" + version]) {
    return fetchAndWrite(
      imports[packageFullName + "@" + version],
      packageFullName,
      version,
    );
  }
  if (
    imports[packageFullName] && version != "latest" &&
    version.split(".").length < 3
  ) { // not a semver
    const imp1 = Object.keys(imports).filter((i) =>
      i.indexOf("@") > -1 && i.split("@")[0] == packageFullName &&
      i.split("@")[1].split(".")[0] == version
    );
    console.log("Matched version:", imp1);
    if (imp1[0] && imports[imp1[0]]) {
      return fetchAndWrite(imports[imp1[0]], packageFullName, version);
    }
  } else if (imports[packageFullName]) {
    return fetchAndWrite(imports[packageFullName], packageFullName, version);
  }

  const unpmGithubUrl =
    `https://cdn.jsdelivr.net/gh/scriptmaster/unpm/node_modules/@unpm/`;
  // `https://raw.githubusercontent.com/scriptmaster/unpm/main/node_modules/@unpm/${name}@{versionOrLatest}/${name}.min.js`;
  const cdnMap = {
    [unpmGithubUrl]: {
      umdOrDist: [""],
      nameOrIndex: [packageFileName],
      productionMin: [".min"],
      jsExt: ["js"],
      singleDist: true,
    },
    "https://unpkg.com/": {
      umdOrDist: ["umd", "dist", "dist/umd"],
      nameOrIndex: [packageFileName],
      productionMin: [".production", ".browser.production"],
      jsExt: ["min.js", "js"],
    }, // the default one
    "https://esm.run/": {
      umdOrDist: ["umd"],
      nameOrIndex: [packageFileName],
      productionMin: [".production", ".browser.production"],
      jsExt: ["min.js"], // this auto-puts a /+esm onto cdn.jsdelivr.net/npm/
    },
    "https://esm.sh/": {}, // deno/esm only, Pfft
    // 'https://cdn.jsdelivr.net/npm/': {}, // same as esm.run/
  };
  // const mapper = (map1, map2, g1 = '', g2 = '') => map1.reduce((p, m1) => [...p, ...map2.map(m2 => `${m1}${g1}${m2}${g2}`)], []);
  const mapper = (map1, map2, g1 = "", g2 = "") =>
    map1.reduce(
      (p, m1) =>
        p.concat(map2.map((m2) => m2 ? `${m1}${g1}${m2}${g2}` : `${m1}${g1}`)),
      [],
    );

  const pMap = packageMap[name] || {};
  const cdns = pMap["cdn"] ?? Object.keys(cdnMap); // ['https://esm.run/', 'https://unpkg.com', 'https://cdn.jsdelivr.net/npm/', 'https://esm.sh', unpmGithubUrl];

  let urls = [];
  for (const cdn of cdns) {
    let map = [];
    const c = cdnMap[cdn];
    const packageNameResolved = (packageName[0] == "@" ||
        (pMap[packageName] && pMap[packageName].fullName))
      ? packageFullName
      : packageName;
    map = mapper([cdn], [packageNameResolved]);
    map = mapper(map, versionOrLatest, "@");
    map = mapper(map, pMap["umd"] || c["umdOrDist"] || umdOrDist, "/", "/");
    map = mapper(map, pMap["file"] || c["nameOrIndex"] || nameOrIndex);
    map = mapper(
      map,
      pMap["production"] || c["productionMin"] || productionMin,
    );
    map = mapper(map, pMap["extension"] || c["jsExt"] || jsExt, ".");
    urls = urls.concat(map);
  }

  // console.log('urls:', urls);
  const eraseLine = "\x33[2K\r";

  console.log(name, version);
  for (const a in urls) {
    //console.log(yellow('.'))
    console.log(eraseLine + urls[a]);
    const result = await fetchAndWrite(urls[a], name, version);
    if (result) return true;
  }

  async function fetchAndWrite(url, name, version) {
    const res = await fetch(url, { method: "HEAD" });
    if (res.status == 200) {
      const found = await fetch(url);
      console.log(200, found.url);

      const specificVersion = getVersionFromUrl(
        getPackageNameWithNamespace(name),
        version,
        found.url,
      );
      await writeRes(found, name, specificVersion);

      writeImportMap(name, specificVersion, found.url);
      return true;
    } else {
      //console.log(res.status);
      return false;
    }
  }

  async function writeRes(res, name, version) {
    const text = await res.text();
    if (!fs.existsSync("./node_modules/" + name)) {
      fs.mkdirSync("./node_modules/" + name, { recursive: true });
    }
    writeTextFileSync(path.join("./node_modules/", name, "/index.js"), text);

    console.log("writing module package.json for: ", name, version);
    writeTextFileSync(path.join("./node_modules/", name, "/package.json"), JSON.stringify({
      name,
      version,
      type: "module",
      source: res.url,
    }, null, 2));

    updatePackageJson(name, version);
  }

  // // // 
  function writeImportMap(name, version, url) {
    if (!import_map.imports) import_map.imports = {};
    import_map.imports[name + "@" + version] = url;
    writeTextFileSync(
      "unpm.import_map.json",
      JSON.stringify(import_map, null, 2),
    );
  }
  // // // 

}

function writeTextFileSync(filename, data) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, data, { encoding: "utf8" });
}

function updatePackageJson(name, version) {
  if ( ! fs.existsSync("package.json")) return;
  console.log('Updating package.json');
  const packageJson = json_parse(fs.readFileSync("package.json"));
  if (packageJson.dependencies) {
    if (!packageJson.dependencies[name]) {
      // console.log("updating package.json in cwd:", name, "^" + version);
      packageJson.dependencies[name] = "^" + (version.replace(/^\@\^/, ""));
      writeTextFileSync("package.json", JSON.stringify(packageJson, null, 2));
    }
  }
}

function installBinaries(name, version) {
  const rootDir = '.';
  const entries = Store.get('node_modules/.bin/' + name) || [];
  // console.log('Install binaries: ', path.join(rootDir, 'node_modules/.bin/', name), entries);
  entries.forEach((v, i) => {
    const binPath = path.join(rootDir, 'node_modules/.bin/');
    const newLinkFile = path.join(binPath, v.binary);
    // fs.symlink(existingTargetFile, newLinkFile);
    const targetPath = path.join(rootDir, 'node_modules', name, v.file);
    //console.log(targetPath, '<--', newLinkFile);
    const relativeTargetPath = path.relative(binPath, targetPath);
    //console.log(newLinkFile, '-->', relativeTargetPath);
    if (fs.existsSync(newLinkFile)) {
      // console.log('Deleting file: ', newLinkFile);
      fs.unlinkSync(newLinkFile);
    }
    fs.mkdirSync(path.dirname(newLinkFile), {recursive: true});
    if (fs.existsSync(targetPath)) {
      console.log(green('Symlink:'), cyan(newLinkFile), '-->', targetPath);
      fs.symlinkSync(relativeTargetPath, newLinkFile, 'file', console.log.bind(console));
    }
  });
}

function getVersionFromUrl(name, version, url) {
  //if(version == 'latest' || version.split('.').length < 3) {
  const m = url.match(new RegExp("\\/" + name + "\\@" + "([\\d\\.]+)\\/"));
  if (m && m[1]) return m[1];
  // }
  return version;
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
    if (this.importMapJson) return this.importMapJson;

    const filename = "unpm.import_map.json";
    const url =
      `https://cdn.jsdelivr.net/gh/scriptmaster/unpm/unpm.import_map.json`;

    this.importMapJson = JSON.parse(await this.getOrDownload(filename, url)) ||
      {};
  }

  readCache = {};
  async getOrDownload(filepath, remoteUrl, text = "", refetch = false) {
    if (this.readCache[filepath]) return this.readCache[filepath];

    if (!refetch && fs.existsSync(filepath)) {
      text = fs.readFileSync(filepath);
    } else {
      fs.mkdirSync(path.dirname(filepath), { recursive: true });

      console.log("Downloading to " + filepath);
      const res = await fetch(remoteUrl);
      text = await res.text();

      writeTextFileSync(filepath, text);
    }

    this.readCache[filepath] = text;
    return text;
  }

  readFile(filepath, refetch = false, text = "") {
    if (this.readCache[filepath]) return this.readCache[filepath];

    if (!refetch && fs.existsSync(filepath)) {
      text = fs.readFileSync(filepath);
    }

    this.readCache[filepath] = text;
    return text;
  }

  static async download(filepath, remoteUrl, overwrite = true) {
    if (fs.existsSync(filepath) && !overwrite) {
      // File already exists
      console.log("File already exists");
    } else {
      fs.mkdirSync(path.dirname(filepath), { recursive: true });

      console.log("Downloading to " + filepath);
      const res = await fetch(remoteUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(filepath, buffer);

      return true;
    }

    return false;
  }

  readPackageJson(prefix = '') {
    const packageJson = json_parse(this.readFile(path.join(prefix, "package.json")));
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    return [packageJson, deps, devDeps];
  }

  parsedCommandInputs = null;
  parseCommandInputs(argv = null) {
    if (this.parsedCommandInputs) return parsedCommandInputs;

    const args = argv || process.argv;
    if (/unpm\.mjs$/.test(args[1]) || /unpm\/index\.mjs$/.test(args[1])) {
      args.shift();
    }

    this.parsedCommandInputs = args.reduce((p, a) => {
      if (a.startsWith("--")) {
        p[1].push(a);
      } else {
        p[0].push(a);
      }
      return p;
    }, [[], []]);

    return this.parsedCommandInputs;
  }

  static createCacheFolder() {
    const cacheDir = ".cache/unpm/node_modules/";
    let cacheFolder = path.join(process.env.HOME, cacheDir);

    try {
      if (process.env.HOME && fs.existsSync(process.env.HOME)) {
        fs.mkdirSync(cacheFolder, { recursive: true });
      }
    } catch (e) {
      cacheFolder = path.resolve(cacheDir);
      fs.mkdirSync(cacheFolder, { recursive: true });
    }
    return cacheFolder;
  }
}

async function main() {
  const [args, options] = Store.instance.parseCommandInputs();
  Store.set("options", options);

  if (args[1] == "install" || args[1] == "i") {
    const params = args.slice(2);
    if (!params.length) await installFromPackageJson();
    else {
      params.map(async p => installPackage(p.split('@')[0], p.split('@')[1]));
    }
  } else if (args[1] == "optimize") {
    // optimize existing node_modules bundles with esbuild and delete the previous ones // far-fetched :(
  } else {
    const params = args.slice(1);
    if (!params.length) await installFromPackageJson();
    else {
      params.map(async p => installPackage(p.split('@')[0], p.split('@')[1]));
    }
  }

  async function installPackage(d, v = "") {
    const version = v.replace(/^\^/, "");
    if (options.includes("--cdn")) {
      await fetchCdn(d, version); // skip await for parallel processing //
    } else {
      if (options.includes("--npm")) {
        await downloadPackageFromRegistryTarball(d, version);
      } else if (options.includes("--esbuild")) {
        await downloadIndexForEsBuildResolution(d, version);
      } else {
        await downloadPackageFromRegistryTarball(
          d,
          version,
          options.includes("--no-esbuild") ? false : true,
        );
      }
    }
  } // /fetchOrDownload

  async function installFromPackageJson() {
    if(!fs.existsSync('package.json')) {
      return showHelp();
    }
    console.log("Installing modules from package.json");
    const [packageJson, deps, devDeps] = Store.instance.readPackageJson();

    await Store.instance.downloadImportMapJson();

    if (options.includes("--devdeps") || options.includes("--dev-dep") || options.includes("--dev-deps")) {
      for (const d of Object.keys(devDeps)) {
        console.log("\ndevDep:", d);
        installPackage(d, devDeps[d].replace(/^\^/, ""));
      }
    }

    for (const d of Object.keys(deps)) {
      console.log("\ndep:", d);
      await installPackage(d, deps[d]);
    }
  }// /installFromPackageJson

  // /main
}

function showHelp() {
  console.log(yellow('Usage: '))
  console.log('  unpm install            installs package.json packages');
  console.log('  unpm i react            installs package react (latest version)');
  console.log('  unpm i react@latest');
  console.log('  unpm i react@18.2.0');
  console.log('  unpm i --dev-deps    install devDependencies also from package.json');
  console.log('  unpm i react --cdn   install prebuilt packages from cdns (unpkg.com or custom cdn) instead.');
}


function json_parse(jsonText) {
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("json_parse: ", e);
  }
  return {};
}

async function downloadIndexForEsBuildResolution(name, version) {
  // download from jsdeliver browse package.json and index file
  const n = getPackageNameWithNamespace(name);

  const cdn = "https://cdn.jsdelivr.net/npm";
  //const cdn = 'https://unpkg.com';

  const packageDir = `./node_modules/${name}`;
  fs.mkdirSync(packageDir, { recursive: true });

  if (!version) version = "latest";
  const url = `${cdn}/${n}@${version}/`;

  const jsonText = await Store.instance.getOrDownload(
    packageDir + "/package.json",
    path.join(url, "package.json"),
  );
  const packageJson = json_parse(jsonText);

  const packageName = getPackageNameWithNamespace(name);

  const subPath =
    (name[0] != "@" && name.includes("/")
      ? name.substr(packageName.length)
      : ".") || ".";
  if (subPath != ".") console.log("subPath found:", name, version, subPath);

  const files = {};
  const download = async (fileRelPath) => {
    const localFile = path.join(packageDir, fileRelPath);
    const remoteFile = path.join(url, fileRelPath);
    // ... // ... // ... // ...
    files[localFile] = remoteFile;
    await Store.instance.getOrDownload(localFile, remoteFile);
  };

  // install bin files
  console.log('packageJson["bin"]', packageJson["bin"]);
  if (packageJson["bin"]) await download(packageJson["bin"]);

  if (packageJson["main:umd"]) await download(packageJson["main:umd"]);
  else if (packageJson["main"]) await download(packageJson["main"]);
  else if (
    packageJson["exports"] &&
    packageJson["exports"][subPath]
  ) {
    const exp = packageJson["exports"][subPath];
    if (exp["default"]) {
      if (typeof exp["default"] == "string") await download(exp["default"]);
      else if (exp["default"]["."]) await download(exp["default"]["."]);
      else if (exp["default"]["cjs"]) await download(exp["default"]["cjs"]);
    } else if (exp["require"]) {
      if (typeof exp["require"] == "string") await download(exp["require"]);
      else if (exp["require"]["default"]) {
        await download(exp["require"]["default"]);
      } else if (exp["require"]["."]) await download(exp["require"]["."]);
      else if (exp["require"]["cjs"]) await download(exp["require"]["cjs"]);
    }
  }

  // check the build size
  console.log("filesDownloaded:", files);

  const excludedPackagesFromBundling = ["esbuild"];

  if (!excludedPackagesFromBundling.includes(name)) {
    Object.keys(files).map(async (f) => {
      await createUmdBuild(f);
    });
  }

  // createUmdBuild from esbuild, if --bundle option;
  // createUmdBuild()

  // const options = Store.get('options');
}

async function sh(cmd) {
  return new Promise((resolve, reject) =>
    cp.exec(cmd, function (err) {
      if (err) {
        console.error("exec: ", cmd, err);
        reject(err);
      } else resolve();
    })
  );
}

function isValidVersion(version) {
  return version && version != "latest" && version.split(".").length == 3;
}

async function downloadPackageFromRegistryTarball(
  name,
  version,
  esbuild = true,
) {
  console.log(" ", "npm registry:", name, version, esbuild ? "+esbuild" : "");
  const cacheDir = Store.createCacheFolder();
  const validVersion = isValidVersion(version);

  //const packageDir = `${name}/${version}`;
  const packageDir = path.join(cacheDir, name);

  // console.log(validVersion, version);

  const registryFile = path.join(packageDir, "./registry.json");
  const url = "https://registry.npmjs.org/" + name;
  if (!validVersion) {
    const registryJson = json_parse(
      await Store.instance.getOrDownload(registryFile, url, "", true),
    );
    version = registryJson["dist-tags"]["latest"]; // (validVersion? registryJson['dist-tags']['latest']: version);
  }

  const versionDir = path.join(packageDir, version);
  if (!fs.existsSync(versionDir)) {
    const registryJson = json_parse(
      await Store.instance.getOrDownload(registryFile, url, "", false),
    );
    const versionJson = registryJson["versions"][version];
    const tarballUrl = versionJson["dist"]["tarball"];
    if (tarballUrl && tarballUrl.startsWith("https://")) {
      const tarFile = path.join(packageDir, path.basename(tarballUrl));
      // console.log(tarFile, tarballUrl);
      const downloadResult = await Store.download(tarFile, tarballUrl);

      await sh(`tar -xf ${tarFile} -C ${packageDir}`);

      const renamed = path.join(packageDir, version + ".renamed");
      const versioned = path.join(packageDir, version);

      if (fs.existsSync(renamed)) fs.rmdirSync(renamed);
      if (fs.existsSync(versioned)) fs.renameSync(versioned, renamed);
      const extractedDir = path.join(
        packageDir,
        (name + "@types/package").split("@types/")[1],
      );
      console.log("  extractedDir: ", extractedDir);
      fs.renameSync(extractedDir, versioned);
    } else {
      console.error("Cannout find a https:// tarball-url for " + name);
    }
  }

  const preBuiltPackages = ["esbuild", "@esbuild"];
  let installFrom = versionDir;
  if (esbuild && !preBuiltPackages.includes(name.split("/")[0])) {
    // console.log("debug: esbuild");
    const installFromEsbuild = path.join(versionDir, ".esbuild");
    fs.mkdirSync(installFromEsbuild, { recursive: true });

    fs.copyFileSync(
      path.join(versionDir, "package.json"),
      path.join(installFromEsbuild, "package.json"),
    );

    const [entries, isPrebuilt] = getEntriesFromPackageDir(versionDir, name);
    if (isPrebuilt) {
      console.log("  ", yellow("Package has a pre-built:"), entries);

      fs.mkdirSync(path.join(installFromEsbuild, path.dirname(entries)), {
        recursive: true,
      });
      fs.copyFileSync(
        path.join(versionDir, entries),
        path.join(installFromEsbuild, entries),
      );
      //installFrom = installFromEsbuild;
    } else {
      const builtEntries = [];
      for (const entry of entries) {
        const extname = path.extname(entry);

        const entryFile = path.join(versionDir, entry);
        const outfile = path.join(installFromEsbuild, entry);

        if (builtEntries.includes(entryFile)) {
          console.log(blue("   Found newly built:"), cyan(entry), '=>', blue(outfile));
          continue;
        }
        builtEntries.push(entryFile);

        switch (extname) {
          case ".js":
            console.log(blue("   Creating new build:"), cyan(entry), '=>', blue(outfile));
            try {
              await createUmdBuild(entryFile, outfile);
              //installFrom = installFromEsbuild;
            } catch (err) {
              console.error("Error building", name, "with esbuild", err);
            }
            break;
          default:
            fs.mkdirSync(path.join(installFromEsbuild, path.dirname(entry)), {
              recursive: true,
            });
            fs.copyFileSync(
              path.join(versionDir, entry),
              path.join(installFromEsbuild, entry),
            );
            //installFrom = installFromEsbuild;
            break;
        }
      }
    }
  }

  if (fs.existsSync(installFrom)) {
    console.log(green("Installing:"), installFrom);
    fs.cpSync(installFrom, path.join("./node_modules", name), {
      recursive: true,
    }); // install local package :)
    // update package.json :)
    installBinaries(name, version);
    updatePackageJson(name, version);
  }
}

function writeBinEntriesFromPackageJson(packageJson, name) {
  // // ... 
  const entryFiles = [];
  const binPath = path.join('.', 'node_modules/.bin/');
  // // ... 
  if ( packageJson["bin"] ) {
    for (const k in packageJson["bin"]) {
      if (k && !entryFiles.includes(packageJson["bin"][k])) {
        const file = packageJson["bin"][k];
        entryFiles.push({
          binary: k,
          file,
          // path: targetPath,
        });
      }
    }
  }

  // // ... 
  const binEntries = Store.get('node_modules/.bin/'+name) || [];
  Store.set('node_modules/.bin/'+name, [...binEntries, ...entryFiles]);
  // // ...
}

function getEntriesFromPackageDir(versionDir, name) {
  const [packageJson] = Store.instance.readPackageJson(versionDir);
  if (packageJson["unpkg"]) return [packageJson["unpkg"], true];
  if (packageJson["umd"]) return [packageJson["umd"], true];
  if (packageJson["production"]) return [packageJson["production"], true];

  const entryFiles = [];
  if (packageJson["main"]) pushEntry(packageJson["main"]);
  if (packageJson["module"] && !entryFiles.includes(packageJson["module"])) {
    pushEntry(packageJson["module"]);
  }
  if (packageJson["types"] && !entryFiles.includes(packageJson["types"])) {
    pushEntry(packageJson["types"]);
  }

  // install bin files
  // console.log('packageJson["bin"]', packageJson["bin"]);
  if ( packageJson["bin"] ) {
    for (const k in packageJson["bin"]) {
      if (k && !entryFiles.includes(packageJson["bin"][k])) {
        pushEntry(packageJson["bin"][k]);
      }
    }
    // // ...
    writeBinEntriesFromPackageJson(packageJson, name);
  }

  if (packageJson["exports"] && typeof packageJson["exports"] == "object") {
    const exports = packageJson["exports"];
    for (const k in exports) {
      if (exports[k] && !entryFiles.includes(exports[k])) {
        pushEntry(exports[k]);
      }
    }
  }

  function pushEntry(v) {
    if (typeof v == "string") entryFiles.push(v);
    else if (typeof v == "object") {
      const umd = v["default"] || v["node"] || v["require"] || v["umd"] ||
        v["cjs"] || v["browser"];
      if (!entryFiles.includes(umd)) {
        pushEntry(umd);
      }
    }
  }

  return [entryFiles, false];
}

const knownLibExternals = ["esbuild"];

//const esbuild = require("esbuild");
//const umdWrapper = require("esbuild-plugin-umd-wrapper");
async function createUmdBuild(entryFile, outfile) {
  const cacheDir = Store.createCacheFolder();

  // console.log("entryFile:", path.resolve(entryFile));
  entryFile = path.resolve(entryFile);
  if (!fs.existsSync(entryFile)) {
    return console.error("No such file: ", entryFile);
  }

  const external = [...knownLibExternals, ...((process.env.EXTERNAL || '').split(","))];
  //console.log("external", external, process.env.EXTERNAL);

  const prevCwd = process.cwd();
  process.chdir(path.dirname(entryFile));
  const result = await esbuild
    .build({
      entryPoints: [entryFile],
      // outdir: outdir || (path.join(path.dirname(entryFile), './.esbuild/')),
      outfile,
      format: "iife",
      platform: "node",
      bundle: true,
      minify: true,
      plugins: [unpm_esbuild({
        cacheDir
      })],
      external,
    });
  // .then((result) => console.log(result))
  // .catch(() => process.exit(1));
  result;
  process.chdir(prevCwd);
}

const unpmDefaultOptions = {
  cacheDir: '.',
};

function unpm_esbuild(customOptions) {
  const options = { ...unpmDefaultOptions, ...customOptions };
  const plugin = {
    name: "unpm",
    setup(build) {
      //console.log("esbuild: setup:", build, options);
      let nodeModulesPaths = {}; // : Set<string>;
      let cache = new Map();

      build.onStart(async function onStart() {
        nodeModulesPaths = {};
        // console.log('build.onStart:', args);
      });

      build.onResolve({ filter: /.*/ }, function onResolve(args) {
        // console.log("build.onResolve:", args.pluginData, args.importer, args);
        console.log("build.onResolve:", args);
        /*
        if (args.pluginData === IN_NODE_MODULES_RESOLVED) return args;
        if (args.pluginData === IN_NODE_MODULES) return undefined;

        if (
          args.path.startsWith("https://") || args.path.startsWith("http://")
        ) {
          //
        } else if (args.namespace == "file") {
          const p = path.resolve(args.resolveDir, args.path);
          if (fs.existsSync(p)) {
            return { path: p, pluginData: IN_NODE_MODULES_RESOLVED };
          } else {
            // 3 ways to include a file:
            if (
              args.path.startsWith("./") || args.path.startsWith("../") ||
              args.path.startsWith("@/")
            ) {
              return {
                namespace: "unpm-file",
                path: args.path,
                resolveDir: args.resolveDir,
              };
            } else {
              return {
                namespace: "unpm-http",
                path: args.path,
                resolveDir: args.resolveDir,
              };
            }
          }
          // const res = await build.resolve(args.path, {
          //     importer: args.importer,
          //     namespace: args.namespace,
          //     kind: args.kind,
          //     resolveDir: args.resolveDir,
          //     pluginData: IN_NODE_MODULES,
          // });
        }

        if (nodeModulesPaths[args.importer]) {
          //
          console.log("has:", build.resolve);
          console.log("resolve result:", res);
          // if (!res.external) nodeModulesPaths.add(res.path);
          // return res;
        }
        */
      });

      build.onLoad({ filter: /.+$/ }, async (args) => {
        console.log('build.onLoad:', args);
      });

      // build.onLoad({ filter: /\.example$/ }, async (args) => {
      //   // ...
      // });

      // build.onLoad();
    },
  };

  return plugin;
}
const IN_NODE_MODULES = Symbol("IN_NODE_MODULES");
const IN_NODE_MODULES_RESOLVED = Symbol("IN_NODE_MODULES_RESOLVED");

export const ANSIColors = {
  "red": 91,
  "green": 92,
  "yellow": 93,
  "blue": 94,
  "cyan": 96,
};
export const colorify = (color, msg) => {
  return `\x1b\[${ANSIColors[color] || 93}m${msg}\x1b[0m`;
};
export function log(color, ...msg) {
  console.log.apply(console, msg.map((m) => colorify(color, m)));
}
export const red = (m) => colorify("red", m);
export const green = (m) => colorify("green", m);
export const yellow = (m) => colorify("yellow", m);
export const blue = (m) => colorify("blue", m);
export const cyan = (m) => colorify("cyan", m);
export const colors = { red, green, yellow, blue, cyan };

main();
