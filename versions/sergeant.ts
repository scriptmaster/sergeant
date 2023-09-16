import { isPathSeparator } from "https://deno.land/std@0.173.0/path/_util.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.19.2/mod.js";
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.8.1/mod.ts";
import { join } from "https://deno.land/std@0.200.0/path/mod.ts";
import { existsSync } from "https://deno.land/std@0.200.0/fs/mod.ts";
import { ensureDir } from "https://deno.land/std@0.173.0/fs/ensure_dir.ts";
import { bgBlue, bgRgb24, bgRgb8, bold, italic, red, rgb24, rgb8, yellow, brightGreen, cyan} from "https://deno.land/std@0.200.0/fmt/colors.ts";
import { Application } from "https://deno.land/x/oak/mod.ts";
// import LiveReload from 'https://deno.land/x/livereload@0.1.0/src/mod.ts';
// import { opine } from "https://deno.land/x/opine@1.3.2/mod.ts";
// import denoliver from 'https://deno.land/x/denoliver/mod.ts'
import { refresh } from "https://deno.land/x/refresh/mod.ts";
import { serve } from "https://deno.land/std/http/server.ts";
import { lookup } from "https://deno.land/x/media_types/mod.ts";

// import { ServerRequest } from "https://deno.land/std@0.61.0/http/mod.ts";

// ... ... ...... .........
// apps folder not found
//  there is no other app in the apps folder, create one?
// either way, this looks like the first time you are trying in this directory with sergeant
//   also if ur using vscode, try to add .vscode/settings.json {"deno.enable": true}
// .. .. ..
// ... ... ...... ............

const appsDir = './apps';

printASCII();

const isReadableDir = existsSync(appsDir, {
  isReadable: true,
  isDirectory: true
});

// // // //
if(!isReadableDir) {
  console.log('Looks like this is the first time you are using sergeant');
  ensureDir(appsDir);
  //ensureDir(join(appsDir, "common"));
  create();
} else {
  const args = Deno.args;
  const command = args[0];

  switch(true) {
    case /build/i.test(command):
      await build();
      break;
    case /serve/i.test(command):
      await serveApps();
      break;
    default:
      await build();
  }
}

async function build() {
  console.log('Discovering all apps...');

  for await (const dirEntry of Deno.readDir(appsDir)) {
    if (dirEntry.isDirectory && dirEntry.name[0] != '.') {
      const appDir = join(appsDir, dirEntry.name);
      await buildApp(appDir);
    }
  }

  console.log(brightGreen('Done'));

  esbuild.stop();
}

async function serveApps() {
  console.log('Serving all apps...');

  const portRangeStart = 3000;
  let servers = 0;
  for await (const dirEntry of Deno.readDir(appsDir)) {
    if (dirEntry.isDirectory && dirEntry.name[0] != '.') {
      const appDir = join(appsDir, dirEntry.name);
      await serveRefresh(appDir, portRangeStart + servers);
      // await serveApp(appDir, portRangeStart + servers);
      // await serveDenoliver(appDir, portRangeStart + servers);
      servers++;
    }
  }

  console.log(servers, brightGreen('servers started'));
}

async function buildApp(dir: string) {
  const mainEntry = join(dir, "./main.tsx");
  if(!existsSync(mainEntry)) {
    return;
    // console.log('main.tsx not found in this dir', dir);
  }

  const outfile = join(dir, './dist/main.js');

  console.log(bgRgb8(rgb8('Building:', 0), 6), dir);

  const result = await esbuild.build({
    plugins: [...denoPlugins()],
    entryPoints: [mainEntry],
    outfile,
    bundle: true,
    platform: 'node',
    format: "esm",
    treeShaking: true,
    //define: { 'process.env.NODE_ENV': '"production"' },
    minify: true,
  });

  console.log(outfile, Math.round(Deno.statSync(outfile).size/1024), 'KB', (result.errors && result.errors.length? 'Errors: ' + result.errors: ''));
}

function create() {
  // 
}

function writeReact() {
  // 
}

function writeReact18() {
  // 
}

function writePreact() {
  // 
}

//const refreshInjeectScript='\n<script src="https://deno.land/x/refresh/client.js"></script>\n';
const refreshInjeectScriptMinified='\n<script>(e=>{let n,t;function o(e){console.info("[refresh] ",e)}function i(){e.reload()}function r(c){n&&n.close(),(n=new WebSocket(`${e.origin.replace("http","ws")}/_r`)).addEventListener("open",c),n.addEventListener("message",()=>{o("reloading..."),i()}),n.addEventListener("close",()=>{o("connection lost - reconnecting..."),clearTimeout(t),t=setTimeout(()=>r(i),1e3)})}r()})(location);</script>\n';

// https://dev.to/craigmorten/how-to-code-live-browser-refresh-in-deno-309o
function serveRefresh(dir: string, port: number) {
  console.log('serveRefresh:', dir);

  const root = join(Deno.cwd(), dir, 'dist');

  // Create refresh middleware
  const middleware = refresh();

  serve(async (req) => {
    const res = middleware(req);
    if (res) return res;

    const pathname = new URL(req.url).pathname;
    const filePath = join(root, pathname);

    if(/\.\w+$/.test(pathname)) {
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
          "content-type": lookup(filePath) || "application/octet-stream",
        },
      });
    }

    const htmlFileName = 'index.html';
    const html = Deno.readTextFileSync(join(root, htmlFileName));

    return new Response(html.replace('</body>', refreshInjeectScriptMinified+'</body>'),{
      headers: {
        "content-type": lookup(htmlFileName) || "application/octet-stream"
      }
    });
  }, {
    port
  });

  // console.log(root, ' in: http://localhost:'+port);
}

async function serveApp(dir: string, port: number) {
  console.log('serveApp:', dir);

  const dist = join(Deno.cwd(), dir, 'dist');
  const app = new Application();

  // Create refresh middleware
  const middleware = refresh();

  app.use(async (context, next) => {
    const res = middleware(new ServerRequest({
      url: context.request.url,
  }));
  
    if (res) return res;

    await next();
  });

  app.use(async (context, next) => {
    try {
      await context.send({
        //root: `${Deno.cwd()}/`,
        root: dist,
        index: "index.html",
      });
    } catch {
      await next();
    }
  });

  app.listen({ port: port });
  console.log(dist, ' in: http://localhost:'+port);
}


async function serveDenoliver(dir: string, port: number) {
  const root = join(Deno.cwd(), dir, 'dist');

  const server = denoliver({
    root,
    port,
    cors: true,
  });

  console.log(root, ' in: http://localhost:'+port);
  console.log(server);
}

/*
await function serveLiveReload(dir: string, port: number) {
  const app = opine();

  const live = new LiveReload({
    base: dir,
    exclude: ['*.css'],
    serve: false,
    port
  });

  app.all("*", live.handle)

  app.listen({ port });
  live.watch();
}
*/

function printASCII() {
  console.log("✨ Sergeant 🫡     ", 'A front-end microservices framework!', "\n",
cyan(
`
███████╗███████╗██████╗  ██████╗ ███████╗ █████╗ ███╗   ██╗████████╗
██╔════╝██╔════╝██╔══██╗██╔════╝ ██╔════╝██╔══██╗████╗  ██║╚══██╔══╝
███████╗█████╗  ██████╔╝██║  ███╗█████╗  ███████║██╔██╗ ██║   ██║   
╚════██║██╔══╝  ██╔══██╗██║   ██║██╔══╝  ██╔══██║██║╚██╗██║   ██║   
███████║███████╗██║  ██║╚██████╔╝███████╗██║  ██║██║ ╚████║   ██║   
╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   
`), rgb8(`
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
`, 11)
  );
}
