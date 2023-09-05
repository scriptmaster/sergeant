import * as esbuild from "https://deno.land/x/esbuild@v0.19.2/mod.js";
//import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.8.1/mod.ts";
import { denoPlugins } from "https://esm.sh/gh/scriptmaster/esbuild_deno_loader@0.8.2/mod.ts";
import { dirname, join, extname } from "https://deno.land/std@0.200.0/path/mod.ts";
import { existsSync } from "https://deno.land/std@0.200.0/fs/mod.ts";
import {
  ensureDir,
  ensureDirSync,
} from "https://deno.land/std@0.173.0/fs/ensure_dir.ts";

import { bgRgb8, brightGreen, cyan, rgb8, } from "https://deno.land/std@0.200.0/fmt/colors.ts";
import { refresh } from "https://deno.land/x/refresh@1.0.0/mod.ts";
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { contentType } from "https://deno.land/std@0.201.0/media_types/content_type.ts";

// To get started:
// deno install -A -f sergeant.ts; sergeant serve

const portRangeStart = 3000;

printASCII();

const cwd = Deno.cwd();

const appsDir = existsSync(join(cwd, "src")) ? "src" : "apps";
const distDir = existsSync(join(cwd, "assets/js/")) ? "assets/js/" : "dist";

const args = Deno.args;
const command = args[0];
const DEV_MODE = Deno.args.includes("--dev");

const app = (appName: string) => join(cwd, appsDir, appName);
const dist = (appName: string) => join(cwd, distDir, appName);

if (!existsSync(appsDir, { isDirectory: true })) {
  console.log("Looks like this is the first time you are using sergeant");
  ensureDir(appsDir);
  create(args[1] || "builder", args[2] || "app_builder");
} else {
  switch (true) {
    case /^build$/i.test(command):
      await buildApps(args[1] || "");
      break;
    case /^serve/i.test(command):
      await serveApps(args[1] || "");
      break;
    case /^(scaffold|create)$/i.test(command):
      create(args[1] || "builder", args[2] || "app_builder");
      break;
    default:
      await buildApps(args[0] || "");
  }
}

async function buildApps(appName = "") {
  if (appName && appName[0] != "-") { //do not mistake for a flag like --dev
    if (!existsSync(app(appName))) {
      return console.log("No such app: ", app(appName));
    }
    await buildApp(appName);
  } else {
    console.log("Building all enabled apps:");

    for await (const dirEntry of Deno.readDir(appsDir)) {
      if (dirEntry.isDirectory && dirEntry.name[0] != ".") {
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

async function buildApp(appName: string) {
  const entryFile = "main.tsx";
  const appDir = app(appName);
  const mainEntry = join(appDir, entryFile);
  if (!existsSync(mainEntry)) {
    console.error("main.tsx not found in this dir", appDir);
    return;
  }

  // const outfile = join(dist(appName), 'app-esbuild.esm.js');
  const outdir = dist(appName);
  const outfile = join(dist(appName), entryFile.replace(/\.ts[x]?$/, ".js"));

  console.log(bgRgb8(rgb8("Building:", 0), 6), appName);

  // const restoreCwd = join(Deno.cwd(), "./");
  //Deno.chdir(dir);
  const denoPluginOpts: { configPath?: string } = {};
  const denoJsonFile = join(appDir, "deno.json");

  // console.log('denoJsonFile: ', denoJsonFile);
  if (existsSync(denoJsonFile)) {
    denoPluginOpts.configPath = denoJsonFile;
  } else if (existsSync(join(cwd, "deno.json"))) {
    denoPluginOpts.configPath = join(cwd, "deno.json");
  }

  const entryPoints = [];
  entryPoints.push(mainEntry);

  const plugins = [...denoPlugins(denoPluginOpts)];

  const esopts = {
    plugins,
    entryPoints,
    outdir,
    bundle: true,
    platform: "node",
    format: "esm",
    treeShaking: true,
    //define: { 'process.env.NODE_ENV': '"production"' },
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
        }
        if (co.jsxFragment) {
          esopts.jsxFragment = co.jsxFragment;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  let result = { errors: [] };
  try {
    result = await esbuild.build(esopts);
  } catch (e) {
    console.error(e);
  }

  const publicDir = join(appDir, "public");
  if (existsSync(publicDir)) copyFiles(publicDir, dist(appName));

  // Deno.chdir(restoreCwd);

  console.log(
    outfile,
    Math.ceil(Deno.statSync(outfile).size / 1024),
    "KB",
    result.errors && result.errors.length ? "Errors: " + result.errors : "",
  );
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
  const shouldBuildWatcher = Deno.watchFs(appDir, {
    recursive: true,
  });

  const excludes = [
    join(appDir, "dist"),
  ];

  for await (const event of shouldBuildWatcher) {
    for (const p of event.paths) {
      const dn = dirname(p);
      // console.debug(dn, excludes.includes(dn));
      if (!excludes.includes(dn)) {
        debounce(dn, () => {
          console.log("buildApp", dn);
          buildApp(appName);
        });
      }
    }
  }
}

//const refreshInjeectScript='\n<script src="https://deno.land/x/refresh/client.js"></script>\n';
const refreshInjeectScriptMinified =
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

  serve(async (req) => {
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
          "content-type": contentType(extname(filePath)) || "application/octet-stream",
        },
      });
    }

    const htmlFileName = "index.html";
    const htmlPath = join(root, htmlFileName);
    const html = existsSync(htmlPath) ? Deno.readTextFileSync(htmlPath) : "";

    return new Response(
      html.replace("</body>", refreshInjeectScriptMinified + "</body>"),
      {
        headers: {
          "content-type": contentType(extname(htmlFileName)) || "application/octet-stream",
        },
      },
    );
  }, {
    port,
  });
}

function create(appType: string, appName: string) {
  //git clone branch ${appType} from https://github.com/scriptmaster/sergeant_create_app  to  appName
  console.log("Scaffolding ...");
  try {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "git",
        "clone",
        "--depth=1",
        "-b",
        `app_${appType}`,
        "https://github.com/scriptmaster/sergeant_create_app",
        appsDir + "/" + appName,
      ],
    });

    const { code, stdout, stderr } = command.outputSync();
    console.log(code, stdout, stderr);
  } catch (e) {
    console.error(e);
    scaffold(join(Deno.cwd(), "apps/app_builder"));
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
