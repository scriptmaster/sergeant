import { green } from "https://deno.land/std@0.200.0/fmt/colors.ts";
import { dirname, extname, join, basename, resolve } from "https://deno.land/std@0.200.0/path/mod.ts";
import { existsSync } from "https://deno.land/std@0.200.0/fs/mod.ts";
import { ensureDir, ensureDirSync, } from "https://deno.land/std@0.173.0/fs/ensure_dir.ts";
import now from 'https://esm.sh/nano-time';

const { build, hostname } = Deno;

const OS = build.os;
const HOSTNAME = hostname();

const WIN = OS == 'windows';
const NIX = OS == 'linux' || OS == 'darwin';
const MAC = OS == 'darwin';

//import it in sergeant.ts
const args = Deno.args;
const HOME = Deno.env.get('HOME') || '';
const rcFiles = ['.bashrc', '.zshrc', '.config/fish/config.fish'];


export function install(arg1: string, version = "") {
  // const version = args[2] || "";
  // Kept flexible (not-optimized) so permissions/logic can be modified if required;
  switch (arg1) {
    case "vendor":
      shell(
        "deno",
        "install -A -f -n vendor https://denopkg.com/scriptmaster/sergeant/vendor.ts"
      );
      break;
    case "unpm":
      shell(
        "deno",
        "install -A -f -n unpm https://denopkg.com/scriptmaster/sergeant/unpm.mjs"
      );
      break;
    case "alosaur":
      shell(
        "deno",
        "install -A -f -n alosaur https://deno.land/x/alosaur/cli.ts"
      );
      break;
    case "asdf":
      console.log("asdf");
      break;
    case "scoop":
      console.log("scoop");
      break;
    case "brew":
      console.log("brew");
      break;
    case "choco":
      console.log("choco");
      break;
    case "nvm":
      console.log("nvm");
      break;
    case "rust":
      console.log("rust");
      break;
    case "cargo":
      console.log("cargo");
      break;
    case "golang":
      console.log("golang");
      break;
    case "dotnet":
      console.log("dotnet");
      break;
    case "crystal":
      console.log("crystal");
      break;
    case "vlang":
      console.log("vlang");
      break;
    case "build-tools":
      console.log("build-tools");
      break;
    case "emeraldcss":
    case "emerald":
      console.log("emeraldcss");
      install("vendor");
      shell("vendor", ["emeraldcss", version]);
      break;
    case "antd":
      console.log("antd");
      install("vendor");
      shell("vendor", ["antd", version]);
      break;
    case "directus":
      console.log("directus");
      install("vendor");
      shell("vendor", ["directus", version]);
      break;
    case "react":
      console.log("react", version);
      install("vendor");
      shell("vendor", ["react", version]);
      break;
    default:
      if (["react-dom", "preact"].includes(arg1)) {
        console.log(arg1);
        install("vendor");
        shell("vendor", [arg1, version]);
      } else if (arg1) {
        console.log(
          "\n\nPackage/Tool Not Available.\n\n  Please create an issue to add this tool/package: \n"
        );
      } else {
        console.log("\n\nUsage: sergeant install <package/tool-name>\n");
      }
  }
}

export function shell(a: string, b: string | string[]) {
  const o = sh(a, b);
  console.log(o ? o.stdout || o.stderr || o.code : "");
}

export function sh(execPath: string, args: string | Array<string>) {
  try {
    const shell = Deno.env.get("SHELL") || "sh";
    execPath =
      typeof execPath == "undefined"
        ? shell
        : execPath == "" || execPath == "deno"
        ? Deno.execPath()
        : execPath;
    const command = new Deno.Command(execPath || shell, {
      args: typeof args == "string" ? args.split(" ") : args,
    });

    const { code, stdout, stderr } = command.outputSync();
    return {
      code,
      stdout: decode(stdout),
      stderr: decode(stderr),
      error: false,
    };
  } catch (e) {
    console.error("sh:ERROR:", e);
    return { code: 0, stdout: "", stderr: e.toString(), error: true };
  }
}

function decode(ui8a: Uint8Array) { return new TextDecoder().decode(ui8a); }

export function todo() {
  if ( ! args[1] ) {
    return console.log('Usage:', 'sir todo yourtask');
  }
  const task=args.slice(1).join(' ');
  console.log(green('TODO'+':'), task);
  const f = join(HOME, 'todo.csv');
  if( ! existsSync(f)) {
    const csv_header = 'by,time,todo,done\n';
    Deno.writeTextFileSync(f, csv_header);
  }
  const contents = [HOSTNAME, now(), `"${task}"`, ''].join(',');
  Deno.writeTextFileSync(f, contents + '\n', { append: true });
  shell('tail', f);
}

export function source() {
  console.log(green('\nFor the changes to take effect, open a new shell, or in current shell:'));
  rcFiles.map(file => {
    const f = join(HOME, file);
    if ( ! existsSync(f)) return;
    console.log('\nDo:\n','source', f);
  });
}

export function alias() {
  console.log(green('aliasing'));
  const aliasMap: {[k: string]: string} = {
    'sir': "'$(which sir)'",
    'alo': "'alosaur'",
  };
  const a = args[2] || 'sir';
  const v = aliasMap[a]? aliasMap[a]: aliasMap['sir'];
  rcFiles.map(file => {
    const f = join(HOME, file);
    if ( ! existsSync(f)) return;
    console.log(f);
    const contents = Deno.readTextFileSync(f);
    if(contents.includes(`alias ${a}=`)) {
      const m = contents.match(new RegExp(`alias ${a}=(.+)`));
      return console.log(file, red('Already aliased:'), m? m[0]: '');
    }
    Deno.writeTextFileSync(f, `\nalias ${a}=${v}\n`, { append: true });
    // sh('echo', ['alias sir=$(which sergeant)', '>>', '~/.bashrc']);
    // sh('alias', ['sir=$(which sergeant)']);
    console.log(`alias alias ${a}=${v} >>`, file);
  });
  source();
}


export function nginx() {
    console.log(green('\nnginx'));
}

export function service() {
    console.log(green('\nservice'));
}

export function update() {
    //const installUrl = `https://cdn.jsdelivr.net/gh/scriptmaster/sergeant@nextof-${VERSION}/sergeant.ts` || 'https://denopkg.com/scriptmaster/sergeant/sergeant.ts';
    //const installUrl = `https://cdn.jsdelivr.net/gh/scriptmaster/sergeant@master/sergeant.ts` || 'https://denopkg.com/scriptmaster/sergeant/sergeant.ts';
    const installUrl = `https://raw.githubusercontent.com/scriptmaster/sergeant/master/sergeant.ts`; // https://raw.githubusercontent.com/
    console.log(green('installing from'), installUrl);
    shell('deno', `install -A -f -n sir ${installUrl}`);
    shell('rm', join(HOME, `/.deno/bin/sergeant`));
    shell('deno', `install -A -f -n sergeant ${installUrl}`);
    //shell('rm', `${HOME}/.deno/bin/sir`);
}

export function upgrade() {
    install('git');

    const dir=join(HOME, `/.deno/sergeant/`);
    if(!existsSync(dir)) {
        shell('git', ['clone', '--depth=1', 'https://github.com/scriptmaster/sergeant', dir]);
    } else {
        const pwd = Deno.cwd();
        Deno.chdir(dir);
        shell('git', ['pull']);
        //shell('ls', ['-lah']);
        shell('deno', ['install', '-f', '-A', 'sergeant.ts']);
        Deno.chdir(pwd);
    }
    return;
}


function migrate_csv() {
    //from = ['time', 'todo', 'done'];
    //to = ['by', 'time', 'todo', 'done'];
}

function correct_csv() {
    //from = ['time', 'todo', 'done'];
    //to = ['by', 'time', 'todo', 'done'];
}

function auto_shard_csv() {
    //shards by change in schema
    //from = ['time', 'todo', 'done'];
    //to = ['by', 'time', 'todo', 'done'];
}

function encrypt_csv() {
    //from = ['time', 'todo', 'done'];
    //to = ['by', 'time', 'todo', 'done'];
}

function index_csv() {
    // this is an auto-updating, auto-source-tracking-seeking fault-tolerant indexer
    //from = ['time', 'todo', 'done'];
    //to = ['by', 'time', 'todo', 'done'];
}

function raft_csv() {
    // this is an auto-updating, auto-source-tracking-seeking fault-tolerant indexer
    //from = ['time', 'todo', 'done'];
    //to = ['by', 'time', 'todo', 'done'];
}

