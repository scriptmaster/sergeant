import { gray, green, red, yellow } from "https://deno.land/std@0.200.0/fmt/colors.ts";
import { dirname, extname, join, basename, resolve } from "https://deno.land/std@0.200.0/path/mod.ts";
import { existsSync } from "https://deno.land/std@0.200.0/fs/mod.ts";
import { ensureDir, ensureDirSync, } from "https://deno.land/std@0.173.0/fs/ensure_dir.ts";
import now from 'https://esm.sh/nano-time';

const { build, hostname } = Deno;

const OS = build.os;
const HOSTNAME = hostname();
const USER = Deno.env.get('USER') || 'root';

const WIN = OS == 'windows';
const NIX = OS == 'linux' || OS == 'darwin';
const MAC = OS == 'darwin';

//import it in sergeant.ts
const args = Deno.args;
const HOME = Deno.env.get('HOME') || '';
const DEV_MODE = args.includes('--dev');
const rcFiles = ['.bashrc', '.zshrc', '.config/fish/config.fish'];

export function install(arg1: string, version = "") {
  // const version = args[2] || "";
  // Kept flexible (not-optimized) so permissions/logic can be modified if required;
  switch (arg1) {
    case "vendor":
      shell(
        "deno",
        "install -A -f -n vendor https://cdn.jsdelivr.net/gh/scriptmaster/sergeant@master/vendor.ts"
      );
      break;
    case "unpm":
      shell(
        "deno",
        "install -A -f -n unpm https://cdn.jsdelivr.net/gh/scriptmaster/sergeant@master/unpm.mjs"
      );
      break;
    case "alosaur":
      shell(
        "deno",
        "install -A -f -n alosaur https://deno.land/x/alosaur/cli.ts"
      );
      break;
    case "prisma":
      shell("deno", "install -A -f -n prisma npm:prisma@^4.5")
      break;
    case "asdf":
      tool("asdf");
      break;
    case "scoop":
      tool("scoop");
      break;
    case "brew":
      tool("brew");
      break;
    case "choco":
      tool("choco");
      break;
    case "nvm":
      tool("nvm");
      break;
    case "rust": case "rustc":
      tool("rust");
      break;
    case "cargo":
      tool("cargo");
      break;
    case "golang": case "go": case "go-lang":
      console.log("golang");
      break;
    case "dotnet": case ".net": case ".net7":
      console.log("dotnet");
      break;
    case "crystal":
    case "crystal-lang": case "crystallang":
      console.log("crystal");
      tool('git');
      break;
    case "vlang":
      tool('vlang');
      break;
    case "git":
      tool('git');
      break;
    case "build-tools":
    case "build-essentials":
      tool('build-essentials');
      break;
    case "nessie":
      shell('deno', 'install -f -A -n nessie https://deno.land/x/nessie/cli.ts');
      break;
    case "typeorm":
      shell('deno', 'install -f -A -n typeorm https://deno.land/x/typeorm/cli.ts');
      break;
    case "prisma":
      console.log('prisma');
      break;
    case "ef": case "dotnet-ef": case "entity-framework":
      console.log('dotnet-ef');
      shell('dotnet', 'tool install --global dotnet-ef');
      break;
    case "soda":
      shell('go', 'install -tags sqlite github.com/gobuffalo/pop/v6/soda@latest');
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
          "\n\nPackage/Tool Not found.\n\n  Please create an issue to add this tool/package in this link:\n\n",
          green("https://github.com/scriptmaster/sergeant/issues\n")
        );
      } else {
        console.log("\n\nUsage: sergeant install <package/tool-name>\n");
      }
  }
}

export function tool(name: string, existsCmd = '') {
    if(WIN) {
        // find choco or scoop
        let o = sh('where', existsCmd || name);
        if(!o.error) return o;

        o = sh('where', 'choco');
        if(!o.error) return shell('choco', 'install ' + name);

        o = sh('where', 'scoop');
        if(!o.error) return shell('scoop', 'install ' + name);
    } else if (MAC) {
        // find brew
        let o = sh('which', existsCmd || name);
        if(!o.error) return o;

        o = sh('which', 'brew');
        if(!o.error) return shell('brew', 'install ' + name);

        console.error(red('brew not installed.'));
    } else {
        // nix
        let o = sh('which', existsCmd || name);
        if(!o.error) return o; // console.log('Already installed:', name);

        o = sh('which', 'nix');
        if (!o.error) return shell('sudo', ['nix', 'install ' + name]);

        o = sh('which', 'dnf');
        if (!o.error) return shell('sudo', ['dnf', 'install ' + name]);

        o = sh('which', 'apt');
        if (!o.error) {
            const o2 = sh('sudo', ['apt', 'install ' + name]);
            if(!o2.error) { console.log(o2); return o2; }
        }

        // try with linuxbrew?
        o = sh('which', 'brew');
        if (!o.error) return shell('sudo', ['brew', 'install ' + name]);

        console.error(red('error:'), o.code, o.stderr, o.stdout);
    }
}

export function shell(cmd: string, args: string | string[], cwd?: string) {
  const o = sh(cmd, args, cwd);
  console.log(o ? o.stdout || o.stderr || o.code : "");
}

export function sh(execPath: string, args: string | Array<string>, cwd?: string) {
  try {
    const shell = Deno.env.get("SHELL") || "sh";
    execPath =
      typeof execPath == "undefined" || execPath == "sh"
        ? shell
        : execPath == "" || execPath == "deno"
        ? Deno.execPath()
        : execPath;

    // ... // ... //
    const commandOptions: Deno.CommandOptions = {
      args: typeof args == "string" ? args.split(" ") : args,
    };
    if (cwd) commandOptions.cwd = cwd;

    const command = new Deno.Command(execPath || shell, commandOptions);

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
    const csv_header = 'user@host,time,todo,done\n';
    Deno.writeTextFileSync(f, csv_header);
  }
  const contents = [USER+'@'+HOSTNAME, now(), `"${task}"`, ''].join(',');
  Deno.writeTextFileSync(f, contents + '\n', { append: true });
  shell('tail', f);
}

export async function csv() {
  if ( !args[1] || !args[1].endsWith('.csv') ) {
    return console.log('Usage:', 'sir csv rps.csv');
  }
  const data=args.slice(2);
  congrats('data', data);

  const f = resolve(args[1].replace(/^~\//, HOME + '/'));
  congrats('csv', f);

  console.log(gray('File: '+f));
  if (args.includes('--head')) return head();

  if( ! existsSync(f)) {
    const csvHeaders = keepPrompting('Enter column:'); // only max 255 columns supported.
    if( !csvHeaders.includes('time') ) csvHeaders.unshift('time');
    if( !csvHeaders.includes('user@host') ) csvHeaders.unshift('user@host');
      Deno.writeTextFileSync(f, csvHeaders.join(',') + '\n');
  }

  const headerCols: string[] = [];
  await readLines(f, line => { line.split(',').map(col => headerCols.push(col)); return true }, 1);
  console.log(yellow('Enter new row value for each header column'));
  console.log('\n', headerCols, '\n');
  // const cols = 2 + data.length;

  const promptedData = [];
  for(const col of headerCols) {
    if (col == 'user@host') promptedData.push(USER+'@'+HOSTNAME);
    else if (col == 'by' || col == 'user') promptedData.push(USER);
    else if (col == 'host') promptedData.push(HOSTNAME);
    else if (col == 'time') promptedData.push(now());
    else {
      let p = prompt('Enter value ['+col+']:') || ''; // avoid || ?
      if (p.includes(',')) p = `"${p}"`; // p? includes
      promptedData.push( p );
    }
  }
  // 
  //const contents = [HOSTNAME, now(), ...data, ...promptedData].join(',');
  const contents = [...promptedData].join(',');
  Deno.writeTextFileSync(f, contents + '\n', { append: true });
  shell('tail', f);
}

export class ReadLineCallback {
  line = 0;

  callback(line: string) {
    console.log(gray(this.line + ':'), line);
    return true;
  }
}

export function head() {
  readLines(args[1], new ReadLineCallback().callback, parseInt(args[2], 10) || 10);
}

function keepPrompting(label: string) {
  const cols = [];
  while(cols.length < 255) {
    const colName = prompt(label + (label.endsWith(':')? '': ':'));
    // check colName
    if (!colName) break;
    //infering type

    // add to cols
    cols.push(colName);
  }

  return cols;
}

export async function readLines(filepath: string, cb: (line: string) => boolean, maxLines = 0) {
  //return await readBySplitter(filepath, /\n/, cb, maxLines);
  return await readBySplitter(filepath, new Uint8Array([10]), cb, maxLines);
}

export function congrats(...everyone: (string | number | object)[]) { if (DEV_MODE) console.debug(...everyone); }

export async function readBySplitter(filepath: string, splitter: Uint8Array, cb: (line: string) => boolean, maxLines = 0) {
  if (!existsSync(filepath)) {
    console.warn('cannot readLine from filepath:', filepath);
    return '';
  }

  let seek = 0;
  let linesRead = 0;
  const bufferLength = parseInt(Deno.env.get('READ_BUFFER_SIZE') || '4096', 0) || 4096; // whats a good disk size buffer 4k or 128k? //eklitzke.org/efficient-file-copying-on-linux
  const decoder = new TextDecoder();
  const spl = decoder.decode(splitter);
  congrats('splitter:', spl, 'splitter:', splitter);

  let lastReadChars = '';

  const file = await Deno.open(
    filepath,
    { read: true, write: true, truncate: false, create: false },
  );

  if(!file) {
    console.error('cannot open file:', file);
  }

  //try {
    while(maxLines <= 0 || linesRead <= maxLines) {
      const cursorPosition = await Deno.seek(file.rid, seek || 0, Deno.SeekMode.Start);
      congrats('reading from: ', cursorPosition);

      const buf = new Uint8Array(bufferLength);
      const numBytesRead = await file.read(buf) || 0;
      seek += numBytesRead;
      congrats('numBytesRead', numBytesRead, 'seek', seek);

      if (numBytesRead && numBytesRead > 0) {
        const text = decoder.decode(buf).substring(0, numBytesRead);
        congrats('text', text);

        const lines = text.split(spl);
        congrats('lines', lines, spl);

        if (lines.length == 0) {
          lastReadChars = text; // not ready for cb (yet);
        } else {
          lines[0] = lastReadChars + lines[0];
          lastReadChars = lines[lines.length-1];
          try {
            linesRead++;
            if (maxLines <= 0 || linesRead <= maxLines) {
              if ( cb.call({line: linesRead}, lines[0]) === false ) return;
              try {
                lines.slice(1,-1).map(line => {
                linesRead++;
                if (maxLines <= 0 || linesRead <= maxLines) {
                  if ( cb.call({line: linesRead}, line) === false ) throw new Error('cb: returned false at line:' + line);
                }
              }); } catch(e2) { throw e2; }
            }
          } catch(e) { throw e }
        }
      }

      if (maxLines > 0 && linesRead > maxLines) break;

      if (numBytesRead < bufferLength) { // reached eof?
        linesRead++;
        if (maxLines <= 0 || linesRead <= maxLines) {
          try { if(lastReadChars) cb.call({line: linesRead}, lastReadChars); } catch(e3) { console.error(e3); }
        }
        break;
      }

      //if (maxLines > 0 && linesRead > maxLines) break;
    }
  //} catch(e4) { console.log(e4); }

  file.close();
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
    'sir': "$(which sergeant)",
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

export function awsS3Deploy() {
  const appName = args[1] || prompt('Enter appName:') || '';
  shell('aws', 's3 ls');
  const s3BucketName = args[2] || prompt('Enter S3BucketName:') || '';
  if (existsSync('dist/' + appName)) {
    if (existsSync('dist/' + appName + '/static')) {
      shell(`aws`, `s3 sync dist/${appName}/static/ s3://${s3BucketName}/`);
    } else {
      shell(`aws`, `s3 sync dist/${appName}/ s3://${s3BucketName}/`);
    }
  }
}

export function nginx() {

  shell('nginx', '-t');

  const nginxDefaultPath = (MAC? '/opt/homebrew': '') + "/etc/nginx/nginx.conf";
  const nginxPath = existsSync(nginxDefaultPath)? nginxDefaultPath:
    prompt("Confirm nginx.conf path: ", nginxDefaultPath) || nginxDefaultPath;

  if (!existsSync(nginxPath)) {
    return console.error('nginx.conf not found:', nginxPath);
  }

  const nginxSitesDefaultPath = (MAC? '/opt/homebrew': '') + "/etc/nginx/sites-enabled";
  const nginxSitesPath = existsSync(nginxSitesDefaultPath)? nginxSitesDefaultPath:
    prompt("Confirm nginx sites path: ", nginxSitesDefaultPath) || nginxSitesDefaultPath;

  if (!existsSync(nginxSitesPath)) {
    ensureDirSync(nginxSitesPath);
    return console.error('nginx sites not found:', nginxSitesPath);
  }

  const nginxDir = dirname(nginxPath);
  ensureDirSync(join(nginxDir, 'sites-enabled'));

  const locals = {
    createSite: false
  };

  if (!args[1]) {
    locals.createSite = true; // (prompt('Do you want to create a new site? [Y/n]') || '').toLowerCase() == 'y';
  }

  const promptedSite = (prompt('Enter site/domain:') || '');
  const siteDefautPath = join(nginxDir, 'sites-enabled', promptedSite);
  console.log(siteDefautPath);
  const sitePath = existsSync(siteDefautPath)? siteDefautPath:
      prompt("Confirm nginx site/your domain: ", siteDefautPath) || '-';

  //ensureDirSync(join(nginxDir, 'sites-available'));

  if (!locals.createSite && sitePath == '-') {
    return console.error('need a sites-enabled/ .conf file');
  }

  const siteName = basename(sitePath);
  const proxyPort = prompt("Enter proxy port [8080]:", "8080") || "8080";

  Deno.writeTextFileSync(`${MAC? "": "/etc/nginx/sites-enabled/"}${siteName}`, getSiteContents(siteName, proxyPort));

  function getSiteContents(siteName: string, proxyPort: string) {
    return `
server {
	# root /var/www/html;
	# index index.html;

  server_name ${siteName}; # managed by Certbot

	location / {
    proxy_pass http://127.0.0.1:${proxyPort};
	}

  listen [::]:443 ssl; # managed by Certbot
  listen 443 ssl; # managed by Certbot
  ssl_certificate /etc/letsencrypt/live/ai.msheriff.com-0002/fullchain.pem; # managed by Certbot
  ssl_certificate_key /etc/letsencrypt/live/ai.msheriff.com-0002/privkey.pem; # managed by Certbot
  include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
  if ($host = ${siteName}) {
      return 301 https://$host$request_uri;
  } # managed by Certbot

  listen 80 ;
  listen [::]:80 ;
    server_name ${siteName};
    return 404; # managed by Certbot
  }
`
}

  console.log(green('\nnginx'));

}

export function service() {
  let servicePath = args[1] || prompt('Enter service executable (ExecStart)') || '';

  servicePath = resolve(servicePath);
  if (!existsSync(servicePath)) console.log('serviceExecutable does not exist', servicePath);

  console.log(servicePath);
  const serviceName = basename(servicePath);

  console.log(serviceName);
  Deno.writeTextFileSync(`${MAC? "": "/etc/systemd/system/"}${serviceName}.service`, getServiceContents(serviceName, servicePath));

  function getServiceContents(serviceName: string, servicePath: string) {
    return `[Unit]
Description=Service for ${serviceName}

[Service]
Environment="DENO_ENV=production"
Environment="NODE_ENV=production"
ExecStart="${servicePath}"
Restart=always

[Install]
WantedBy=multi-user.target
`;
  }

  console.log(green('\nservice installed'));

  shell('systemctl', 'daemon-reload');
  shell('systemctl', `enable ${serviceName}`);
  shell('systemctl', `start ${serviceName}`);
  shell('systemctl', `status ${serviceName}`);
}

export function certbot() {
    console.log(green('certbot'));
}

export function update() {
    //const installUrl = `https://cdn.jsdelivr.net/gh/scriptmaster/sergeant@nextof-${VERSION}/sergeant.ts` || 'https://cdn.jsdelivr.net/gh/scriptmaster/sergeant@master/sergeant.ts';
    const installUrl = `https://cdn.jsdelivr.net/gh/scriptmaster/sergeant@master/sergeant.ts`
    //const installUrl = `https://raw.githubusercontent.com/scriptmaster/sergeant/master/sergeant.ts`; // https://raw.githubusercontent.com/
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
        shell('git', ['stash']);
        shell('git', ['pull']);
        //shell('ls', ['-lah']);
        shell('deno', ['install', '-f', '-A', 'sergeant.ts']);
        Deno.chdir(pwd);
    }
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

