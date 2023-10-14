import * as esbuild from "https://deno.land/x/esbuild@v0.19.2/mod.js";
//import { denoPlugins } from "https://esm.sh/gh/scriptmaster/esbuild_deno_loader@0.8.4/mod.ts";
import { denoPlugins } from "./plugins/esbuild_deno_loader/mod.ts";
import pluginVue from "https://esm.sh/esbuild-plugin-vue-next";

import {
  dirname,
  extname,
  join,
  basename
} from "https://deno.land/std@0.200.0/path/mod.ts";
import { existsSync } from "https://deno.land/std@0.200.0/fs/mod.ts";
import {
  ensureDir,
  ensureDirSync,
} from "https://deno.land/std@0.173.0/fs/ensure_dir.ts";

import {
  bgRgb8,
  brightGreen,
  cyan,
  rgb8,
  yellow,
} from "https://deno.land/std@0.200.0/fmt/colors.ts";
import { refresh } from "https://deno.land/x/refresh@1.0.0/mod.ts";
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { contentType } from "https://deno.land/std@0.201.0/media_types/content_type.ts";
import { importString } from './plugins/import/mod.ts';
//import type { Dictionary } from 'https://deno.land/x/ts_essentials/mod.ts'

// To get started:
// deno install -A -f sergeant.ts; sergeant serve

const portRangeStart = 3000;

printASCII();

const cwd = Deno.cwd();

const appsDir = existsSync(join(cwd, "src")) ? "src" : "apps";
const distDir = existsSync(join(cwd, "assets/js/")) ? "assets/js/" : existsSync(join(cwd, "static/"))? "static/": "dist";

const args = Deno.args;
const command = args[0];
const DEV_MODE = Deno.args.includes("--dev");

const app = (appName: string) => join(cwd, appsDir, appName);
const dist = (appName: string) => join(cwd, distDir, appName);

const createRegex = /^(scaffold|create|new|n)$/i;

if (!existsSync(appsDir, { isDirectory: true }) && !createRegex.test(command)) {
  console.log("No src or apps dir found, Looks like this is the first time you are using sergeant");
  ls_remote();
} else {
  switch (true) {
    case /^build$/i.test(command):
      await buildApps(args[1] || "");
      break;
    case /^serve/i.test(command):
      await serveApps(args[1] || "");
      break;
    case createRegex.test(command):
      create(args[1] || "builder", args[2] || "app_builder");
      break;
    case /^(ls|list|ls-remote|ls_remote|scaffolds)$/i.test(command):
      ls_remote(command);
      break;
    default:
      await buildApps(args[0] || "");
  }
}

function decode(ui8a: Uint8Array) { return new TextDecoder().decode(ui8a); }

function list_remote_apps(command?: string): Array<string> {
  const ls_remote = 'ls-remote https://github.com/scriptmaster/sergeant_create_app';
  const {code, stdout, stderr, error } = sh('git', ls_remote);
  const ref = 'refs/heads/app_';
  const scaffoldApps = stdout.split('\n').filter(l => l.includes(ref)).map(l => (l.split(ref)[1] || '').toLowerCase());
  return scaffoldApps;
}

function ls_remote(command?: string): Array<string> {
  console.log('Available scaffolds:');
  const scaffoldApps = list_remote_apps(command);
  scaffoldApps.map(s => console.log('\tsergeant create', s, 'my_'+s+'_app'));

  const builderApp =  (prompt('Create a builder app? [y/N/scaffoldName]', 'N') || 'N').toLowerCase();
  if (builderApp == 'y') {
    ensureDir(appsDir);
    create(args[1] || "builder", args[2] || 'my_builder_app');
  } else if (builderApp.length > 1 && scaffoldApps.includes(builderApp)) {
    create(builderApp, 'my_' + builderApp + '_app');
  }

  return scaffoldApps;
}

async function buildApps(appName = "") {
  if(appsDir == 'src') {
    await buildApp('.');
  } else if (appName && appName[0] != "-") { //do not mistake for a flag like --dev
    if (!existsSync(app(appName))) {
      return console.log("No such app: ", app(appName));
    }
    await buildApp(appName);
  } else {
    console.log("Building all enabled apps:");

    for await (const dirEntry of Deno.readDir(appsDir)) {
      if ((dirEntry.isDirectory || dirEntry.isSymlink) && dirEntry.name[0] != ".") {
        await buildApp(dirEntry.name);
      }
    }
  }

  console.log(brightGreen("Done"));

  esbuild.stop();
}

async function serveApps(appName: string) {
  if (appName && appName[0] != "-") { //do not mistake for a flag like: --dev
    if (!existsSync(app(appName))) {
      return console.log("No such app: ", app(appName));
    }
    return await serveRefresh(appName, portRangeStart);
  }

  console.log("Serving all apps...");

  let servers = 0;
  for await (const dirEntry of Deno.readDir(appsDir)) {
    if (dirEntry.isDirectory && dirEntry.name[0] != ".") {
      // const appDir = join(appsDir, dirEntry.name);
      await serveRefresh(dirEntry.name, portRangeStart + servers);
      servers++;
    }
  }

  console.log(servers, brightGreen("servers started"));
}

interface DenoPluginOpts {
  configPath?: string
  context?: object
}



function getDenoJsonFile(appDir: string) {
  const denoJson = Deno.env.get('DENO_JSON') ?? "deno.json";
  const denoJsonFile = join(appDir, denoJson);
  // // //
  if (existsSync(denoJsonFile)) {
    return denoJsonFile;
  } else if (existsSync(join(cwd, denoJson))) {
    return join(cwd, denoJson);
  }
  // // //
}

async function buildApp(appName: string) {
  const appDir = app(appName);

  let entryFile = "main";
  let mainEntry = join(appDir, entryFile);
  if (existsSync(join(appDir, entryFile) + '.ts')) {
    entryFile += '.ts';
    mainEntry += '.ts';
  } else if (existsSync(join(appDir, entryFile) + '.tsx')) {
    entryFile += '.ts';
    mainEntry += '.tsx';
  } else {
    console.error("main entry not found in this dir", appDir);
    return;
  }

  const outdir = dist(appName);
  const outfile = join(dist(appName), entryFile.replace(/\.ts[x]?$/, ".js"));
  const outfile2 = join(dist(appName), entryFile.replace(/\.ts[x]?$/, ".css"));

  console.log(bgRgb8(rgb8("Building:", 0), 6), appName);

  const denoPluginOpts: DenoPluginOpts = { context: new Object };

  const denoJsonFile = getDenoJsonFile(appDir);
  if (denoJsonFile) denoPluginOpts.configPath = denoJsonFile;

  const entryPoints = [];
  entryPoints.push(mainEntry);

  const p: esbuild.Plugin[] = [];

  const esopts = {
    plugins: p,
    entryPoints,
    outdir,
    bundle: true,
    platform: "node",
    format: "esm",
    splitting: true,
    //chunkNames: '[name]',
    treeShaking: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    minify: !DEV_MODE,
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
  };

  if (denoPluginOpts.configPath) {
    try {
      const text = Deno.readTextFileSync(denoPluginOpts.configPath);
      const jsonConfig = JSON.parse(text);
      if (jsonConfig && jsonConfig.compilerOptions) {
        const co = jsonConfig.compilerOptions;
        if (co.jsx == "preact") {
          esopts.jsxFactory = "h";
          esopts.jsxFragment = "Fragment";
        }
        if (co.jsxFactory) {
          esopts.jsxFactory = co.jsxFactory;
          if (co.jsxFactory == "h" && !co.jsxFragmentFactory) {
            co.jsxFragmentFactory = "Fragment";
          }
        }
        if (co.jsxFragmentFactory) {
          esopts.jsxFragment = co.jsxFragmentFactory;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  const plugins = getPlugins(denoPluginOpts);
  esopts.plugins = plugins;

  let result = { errors: [] };
  try {
    result = await esbuild.build(esopts);
  } catch (e) {
    console.error(e);
  }

  const publicDir = join(appDir, "public");
  if (existsSync(publicDir)) copyFiles(publicDir, dist(appName));

  const printOutSize = (file = "") => {
    if (!existsSync(file)) return;

    const sz = Deno.statSync(file).size;
    console.log(
      file,
      sz < 2048
        ? yellow(sz + "") + " bytes"
        : yellow((Math.ceil(sz / 10) / 100) + "") + " KB",
      result.errors && result.errors.length ? "Errors: " + result.errors : "",
    );
  };
  printOutSize(outfile);
  printOutSize(outfile2);

  try {
    const result = await staticRender(appName, esopts, denoPluginOpts);
    if (result) {
      const staticDir = join(dist(appName), 'static');
      const copyStaticFile = (file: string) => { if (existsSync(file)) Deno.copyFileSync(file, join(staticDir, basename(file))); }

      copyStaticFile(outfile)
      copyStaticFile(outfile2)
    }
  } catch(e) {
    console.error(e);
  }
}

function getPlugins(denoPluginOpts: DenoPluginOpts): esbuild.Plugin[] {
  return [
    pluginVue({ templateOptions: 'compiler' }),
    ...denoPlugins(denoPluginOpts), 
  ];
}


interface RenderRoute {
  path: string;
  state: object;
  output?: string;
  title: string;
  metas: Meta[];

  layout: string;
  routes?: RenderRoute[];

  app?: string;
  component?: string;
  context?: object;
}
type Meta = {name: string, content: string};


//@ts-ignore ignore esopts
async function staticRender(appName: string, esopts: any, denoPluginOpts: DenoPluginOpts) {
  const appDir = app(appName);
  const distDir = dist(appName);
  const routesFile = join(appDir, "routes.json");
  if(!existsSync(routesFile)) {
    return console.log(yellow("[Static Gen] No routes file:"), routesFile);
  }
  const routesJson = JSON.parse(Deno.readTextFileSync(routesFile));
  // console.log(routes);

  if (routesJson.disabled === true) {
    return console.log(yellow('Static Generation disabled:'), routesFile);
  }

  const staticFile = routesJson.file ?? "static.tsx";
  const staticRenderFile = join(appDir, staticFile);
  if(!existsSync(staticRenderFile)) {
    return console.log(`Missing "file": "${staticFile}" from `, routesFile);
  }

  const denoPluginOptsStatic: DenoPluginOpts = {
    configPath: denoPluginOpts.configPath,
    context: new Object
  };

  const staticOpts = Object.assign({}, esopts, {
    plugins: getPlugins(denoPluginOptsStatic),
    entryPoints: [staticRenderFile],
    write: false,
    minify: false, // minification is not required
    format: 'esm',
    platform: 'neutral',
    keepNames: true,
    define: {
      __VUE_OPTIONS_API__: 'true',
    }
  });

  let result: {
    outputFiles?: [{text: ''}]
  } = {};

  try {
    result = await esbuild.build(staticOpts);
  } catch(e) {
    console.error(e);
  }

  if (result && result.outputFiles && result.outputFiles[0] && result.outputFiles[0].text) {
    // the entire bundle is available here:
    const text = result.outputFiles[0].text;

    //console.log(text);

    try {
      const ssg = await importString(text);
      if (ssg) {
        const routeFn = ssg.renderRoutes || ssg.renderToString || ssg.renderToStatickMarkup || ssg.render;
        const shellFn = ssg.shell || ssg.HTMLShell || ssg.HtmlShell || ssg.layout || ssg.HtmlLayout || getDefaultHtmlShellFn();
        if (!routeFn) {
          return console.log('No route function found: render(routes) or renderRoutes(routes)');
        }

        const staticDir = join(distDir, 'static');
        ensureDirSync(staticDir);
        console.log(brightGreen('SSG: ' + staticDir));

        await renderOutput(staticDir, routesJson.routes, routeFn, shellFn, appDir);
      }
    } catch(e) {
      console.log(e);
    }
  }

  return result;
}

type ReturningArrayFunc<T> = (o: T[]) => T[]
type RouteFn = ReturningArrayFunc<RenderRoute>;
type ShellFn = (appHtml: string, ...o2: object[]) => ''

async function renderOutput(distDir: string, routes: RenderRoute[], routeFn: RouteFn, shellFn: ShellFn | string, appDir: string): void {
  const outputs = await routeFn(routes || []);
  if (outputs) {
    outputs.map(async (o: RenderRoute) => {
      if (o.routes) {
        return await renderOutput(distDir, o.routes, routeFn, shellFn, appDir);
      }
      const file = join(o.path, 'index.html');
      console.log("Writing: ", o.path, '=>', file);

      if (o.layout) {
        shellFn = o.layout
      }

      if (typeof shellFn == 'string') {
        // this is a file name;
        const layoutFile = join(appDir, shellFn as string);
        if(existsSync(layoutFile)) {
          const layout = Deno.readTextFileSync(layoutFile);
          //4 regex: title, metas, html, script
          o.output = getHtmlShellByLayout(layout, o.output || '', o.state || {}, o.title || '', o.metas || [])
        }
      }

      // it could be re-used:
      if (typeof shellFn == 'function') {
        o.output = (shellFn as ShellFn)(o.output || '');
      }

      ensureDirSync(join(distDir, o.path));
      Deno.writeTextFileSync(join(distDir, file), o.output || '');
    });
  }
}

function getHtmlShellByLayout(layout: string, appHtml: string, state: object, title?: string, metas?: Meta[]) {
  return layout
    .replace(/\<title\>(.*?)\<\/title\>/, (_, dTitle) => `<title>${title || dTitle}</title>`)
    .replace(/\<\!\-\-(app|html|app-html)\-\-\>/i, appHtml)
    .replace(/\<\!\-\-(state|scripts)\-\-\>/, `<script>window.__STATE__=${JSON.stringify(state).replace(/<|>/g, '')}</script>`)
    .replace(/\<\!\-\-metas?\-\-\>/, getMetas(metas))
}

function getDefaultHtmlShellFn() {
  const HTMLShellFn = (appHtml: string, state: object, title?: string, metas?: Meta[]) => `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.6.2/css/bulma.min.css">
        <title>${title}</title>
        ${getMetas(metas)}
    </head>
    <body>
        <div id="app">${appHtml}</div>
        <script>window.__STATE__=${JSON.stringify(state).replace(/<|>/g, '')}</script>
        <script src="./app.js"></script>
    </body>
</html>
`
  return HTMLShellFn;
}

function getMetas(metas?: Meta[]): string {
  return metas?.map(m => `<meta name="${m.name}" content="${m.content}" />`).join('') ?? '';
}





function copyFiles(from: string, to: string) {
  if (existsSync(from)) ensureDirSync(to);
  for (const dirEntry of Deno.readDirSync(from)) {
    if (dirEntry.name[0] == ".") continue;
    if (dirEntry.isDirectory) {
      copyFiles(join(from, dirEntry.name), join(to, dirEntry.name));
    } else if (dirEntry.isFile) {
      Deno.copyFileSync(join(from, dirEntry.name), join(to, dirEntry.name));
    } else {
      console.log("skipped: ", dirEntry.name);
    }
  }
}

const debeounces: Record<string, number | undefined> = {};
const DEFAULT_DEBOUT_TIMEOUT = 30;

type VoidFn = () => void;

function debounce(
  key: string,
  fn: VoidFn,
  timeout: number = DEFAULT_DEBOUT_TIMEOUT,
) {
  const t = debeounces[key];
  if (t) {
    debeounces[key] = undefined;
    clearTimeout(t);
  }
  debeounces[key] = setTimeout(fn, timeout);
}

async function watchForBuild(appName: string) {
  // second watcher is to do the build :D BRILLIANT!
  const appDir = app(appName);
  console.log("\tWatching:", appDir);

  const recursiveOption = { recursive: true };
  const mainAppWatcher = Deno.watchFs(appDir, recursiveOption);

  const excludes = [
    join(appDir, "dist"),
  ];

  // const extraDir = ["watch", "symlinks", "links", "plugins", "deps"];
  //const watchFilesystems = [mainAppWatcher].concat(getFirstLevelSymlinks(appDir).map(symLinkDir => Deno.watchFs(symLinkDir, recursiveOption)));
  const extraWatcherDirs = getExtraWatcheDirs(appDir);
  extraWatcherDirs.map((d: string) => console.log("\tWatching: [Extra]", d));

  const extraWatchFs = extraWatcherDirs.map((w: string) => Deno.watchFs(w, recursiveOption));
  const symLinks = getFirstLevelSymlinks(appDir).map(symLinkDir => Deno.watchFs(symLinkDir, recursiveOption));
  const watchFilesystems = [mainAppWatcher].concat(extraWatchFs).concat(symLinks);

  for(const watchFs of watchFilesystems) {
    setupWatch(watchFs); // parallel watcher
  }

  async function setupWatch(watchFs: Deno.FsWatcher) {
    for await (const event of watchFs) {
      for (const p of event.paths) {
        const dn = dirname(p);
        if (!excludes.includes(dn)) {
          debounce(appName, () => {
            console.log("buildApp", dn);
            buildApp(appName);
          });
        }
      }
    }
  }
}

function json_parse(filepath: string) {
  try {
    return JSON.parse(Deno.readTextFileSync(filepath));
  } catch(e) { console.error('Error in json_parse', e); }
}

function getExtraWatcheDirs(appDir: string) {
  const watchDirs: string[] = [];
  try {
    const denoJsonFile = getDenoJsonFile(appDir);
    if (!denoJsonFile) return watchDirs;
    const denoJson = json_parse(denoJsonFile);
    if(denoJson.watch) {
      let watches = (denoJson.watch || [])
      if (typeof watches == 'string') watches = [watches];

      // join(1param) returns the dir without /
      return watches.map((p: string) => join(app(p)) + '/')
        .filter(existsSync);
    }
  } catch(e) { console.error('e:', e); }
  return watchDirs;
}

function getFirstLevelSymlinks(dir: string) {
  const symLinks: string[] = [];
  try {
    // 
    for (const dirEntry of Deno.readDirSync(dir)) {
      if(dirEntry.isSymlink) {
        // console.log('dirEntry:', dirEntry.name, dirEntry.isDirectory);
      } else if (dirEntry.isDirectory) {
        const dirEntryPath = join(dir, dirEntry.name);
        for (const firstLevelDir of Deno.readDirSync(dirEntryPath)) {
          if(firstLevelDir.isSymlink) {
            // console.log('First-level symlink:', firstLevelDir.name, dirEntryPath);
            symLinks.push(dirEntryPath + '/');
          }
        }
      }
    }
  } catch(e) { console.error(e); }
  return symLinks;
}

//const refreshInjectScript='\n<script src="https://deno.land/x/refresh/client.js"></script>\n';
const refreshInjectScriptMinified =
  '\n<script>(e=>{let n,t;function o(e){console.info("[refresh] ",e)}function i(){e.reload()}function r(c){n&&n.close(),(n=new WebSocket(`${e.origin.replace("http","ws")}/_r`)).addEventListener("open",c),n.addEventListener("message",()=>{o("reloading..."),i()}),n.addEventListener("close",()=>{o("connection lost - reconnecting..."),clearTimeout(t),t=setTimeout(()=>r(i),1e3)})}r()})(location);</script>\n';

// https://dev.to/craigmorten/how-to-code-live-browser-refresh-in-deno-309o
async function serveRefresh(appName: string, port: number) {
  // console.log('serveRefresh:', dir);

  const root = dist(appName);

  ensureDirSync(root);

  Deno.chdir(root);
  // first watcher is to push whenever dist changes :D
  const middleware = refresh({
    paths: [root],
    debounce: 200,
  });
  Deno.chdir(cwd);

  await buildApp(appName);
  watchForBuild(appName);

  const tryServe = (port: number) => Deno.serve({port}, async (req) => {
    const res = middleware(req);
    if (res) {
      return res;
    }

    const pathname = new URL(req.url).pathname;
    const filePath = join(root, pathname);

    if (/\.\w+$/.test(pathname)) {
      let fileSize;
      try {
        fileSize = (await Deno.stat(filePath)).size;
      } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
          return new Response(null, { status: 404 });
        }
        return new Response(null, { status: 500 });
      }
      const body = (await Deno.open(filePath)).readable;
      return new Response(body, {
        headers: {
          "content-length": fileSize.toString(),
          "content-type": contentType(extname(filePath)) ||
            "application/octet-stream",
        },
      });
    }

    const htmlFileName = "index.html";
    const htmlPath = join(root, htmlFileName);
    const html = existsSync(htmlPath) ? Deno.readTextFileSync(htmlPath) : "";

    return new Response(
      html.replace("</body>", refreshInjectScriptMinified + "</body>"),
      {
        headers: {
          "content-type": contentType(extname(htmlFileName)) ||
            "application/octet-stream",
        },
      },
    );
  });

  while(true) {
    try { tryServe(port); break; } catch(e) {
      if (e.toString().includes('Address already in use')) {
        port += 50;
      } else {
        console.error(e.toString(), e);
      }
    }
  }

}

function sh(execPath: string, args: string | Array<string>) {
  try {
    const shell = Deno.env.get('SHELL') || 'sh';
    execPath = typeof execPath == 'undefined'? shell: (execPath == '' || execPath == 'deno'? Deno.execPath(): execPath);
    const command = new Deno.Command(execPath || shell, {
      args: typeof args == 'string'? args.split(' '): args,
    });

    const { code, stdout, stderr } = command.outputSync();
    return { code, stdout: decode(stdout), stderr: decode(stderr), error: false };
  } catch (e) {
    console.error('sh:ERROR:', e);
    return { code: 0, stdout: '', stderr: e.toString(), error: true }
  }
}

function create(appType: string, appName?: string) {
  //git clone branch ${appType} from https://github.com/scriptmaster/sergeant_create_app  to  appName
  console.log("Scaffolding ...", appType, appName);

  if(!appName) appName = 'app_' + appType;
  try {
    const { code, stdout, stderr } = sh('git', [
      "clone",
      "--depth=1",
      "-b",
      `app_${appType}`,
      "https://github.com/scriptmaster/sergeant_create_app",
      appsDir + "/" + appName,
    ]);
    console.log(stdout, stderr);
  } catch (e) {
    console.error(e);
    // scaffold(join(Deno.cwd(), "apps/app_builder"));
  }
}

function scaffold(dir: string) {
  const mainFileContents = `import { h, render } from 'preact';
import App from 'https://esm.sh/gh/scriptmaster/sergeant/apps/app_builder/App.tsx';
render(<App />, document.body);`;
  Deno.writeTextFileSync(join(dir, "main.tsx"), mainFileContents);
}

function printASCII() {
  console.log(
    "✨ Sergeant 🫡     ",
    "A front-end microservices framework!",
    "\n",
    cyan(
      `
███████╗███████╗██████╗  ██████╗ ███████╗ █████╗ ███╗   ██╗████████╗
██╔════╝██╔════╝██╔══██╗██╔════╝ ██╔════╝██╔══██╗████╗  ██║╚══██╔══╝
███████╗█████╗  ██████╔╝██║  ███╗█████╗  ███████║██╔██╗ ██║   ██║   
╚════██║██╔══╝  ██╔══██╗██║   ██║██╔══╝  ██╔══██║██║╚██╗██║   ██║   
███████║███████╗██║  ██║╚██████╔╝███████╗██║  ██║██║ ╚████║   ██║   
╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   
`,
    ),
    rgb8(
      `
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃⠀⠀⠘⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠏⠀⢀⣾⣷⡀⠀⠹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠁⠀⣰⣿⡟⢻⣿⣆⠀⠈⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⡿⠟⠁⠀⣠⣾⣿⠋⠀⠀⠙⣿⣷⣄⠀⠈⠻⢿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⠀⠀⣠⣾⣿⠟⠁⢀⣴⣦⡀⠈⠻⣿⣷⣄⡀⠀⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣴⣿⣿⡿⠋⠀⣠⣾⡿⢿⣷⣄⠀⠙⢿⣿⣿⣦⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⠟⠋⠀⢀⣼⣿⠟⠀⠀⠻⣿⣷⡀⠀⠙⠻⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⠁⠀⣠⣴⣿⡿⠁⠀⣠⣄⠀⠘⢿⣿⣶⣄⠀⠈⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣤⣾⣿⡿⠋⠀⢀⣾⣿⣿⣷⡀⠀⠙⢿⣿⣷⣤⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⢀⣴⣿⣿⣿⣿⣿⣿⣦⡀⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⠉⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠀⠉⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣠⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣄⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
`,
      11,
    ),
  );
}
