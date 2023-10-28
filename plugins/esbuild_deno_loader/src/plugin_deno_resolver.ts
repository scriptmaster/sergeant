import { yellow, green, red } from "https://deno.land/std@0.140.0/fmt/colors.ts";
import {
  esbuild,
  ImportMap,
  resolveImportMap,
  resolveModuleSpecifier,
  Scopes,
  SpecifierMap,
  toFileUrl,
  join,
  dirname
} from "../deps.ts";
import { readDenoConfig, urlToEsbuildResolution } from "./shared.ts";
import { existsSync } from "https://deno.land/std@0.83.0/fs/exists.ts";
import { stripTrailingSeparators } from "https://deno.land/std@0.200.0/path/_util.ts";
import { basename } from "https://deno.land/std@0.173.0/path/win32.ts";

export type { ImportMap, Scopes, SpecifierMap };

export interface DenoResolverPluginOptions {
  /**
   * Specify the path to a deno.json config file to use. This is equivalent to
   * the `--config` flag to the Deno executable. This path must be absolute.
   */
  configPath?: string;
  /**
   * Specify a URL to an import map file to use when resolving import
   * specifiers. This is equivalent to the `--import-map` flag to the Deno
   * executable. This URL may be remote or a local file URL.
   *
   * If this option is not specified, the deno.json config file is consulted to
   * determine what import map to use, if any.
   */
  importMapURL?: string;
}

export const IN_NODE_MODULES = Symbol("IN_NODE_MODULES");
export const IN_NODE_MODULES_RESOLVED = Symbol("IN_NODE_MODULES_RESOLVED");

const LOG_DEBUG = Deno.env.get('LOG') == 'DEBUG';

/**
 * The Deno resolver plugin performs relative->absolute specifier resolution
 * and import map resolution.
 *
 * If using the {@link denoLoaderPlugin}, this plugin must be used before the
 * loader plugin.
 */
export function denoResolverPlugin(
  options: DenoResolverPluginOptions = {},
): esbuild.Plugin {
  return {
    name: "deno-resolver",
    setup(build) {
      let importMap: ImportMap | null = null;
      let nodeModulesPaths: Set<string>;

      build.onStart(async function onStart() {
        nodeModulesPaths = new Set<string>();

        let importMapURL: string | undefined;

        // If no import map URL is specified, and a config is specified, we try
        // to get an import map from the config.
        if (
          options.importMapURL === undefined && options.configPath !== undefined
        ) {
          const config = await readDenoConfig(options.configPath);
          // If `imports` or `scopes` are specified, use the config file as the
          // import map directly.
          if (config.imports !== undefined || config.scopes !== undefined) {
            const configImportMap = {
              imports: config.imports,
              scopes: config.scopes,
            } as ImportMap;
            importMap = resolveImportMap(
              configImportMap,
              toFileUrl(options.configPath),
            );
          } else if (config.importMap !== undefined) {
            // Otherwise, use the import map URL specified in the config file
            importMapURL =
              new URL(config.importMap, toFileUrl(options.configPath)).href;
          }
        } else if (options.importMapURL !== undefined) {
          importMapURL = options.importMapURL;
        }

        // If we have an import map URL, fetch it and parse it.
        if (importMapURL) {
          const resp = await fetch(importMapURL);
          const data = await resp.json();
          importMap = resolveImportMap(data, new URL(resp.url));
        }

        if (LOG_DEBUG) {
          console.log('importMap: ', importMap);
        }
      });

      // build.onResolve({ filter: /.*/, namespace: 'node'}, async function(args) {
      //   // ... 
      //   console.log('resolving node:', args.path, nodePolyfillsLibs.get(args.path));
      //   return { path: nodePolyfillsLibs.get(args.path), namespace: 'https' };
      // });

      build.onResolve({ filter: /.*/ }, async function onResolve(args) {
        // If this is a node_modules internal resolution, just pass it through.
        // Internal resolution is detected by either the "IN_NODE_MODULES" flag
        // being set on the resolve args through the pluginData field, or by
        // the importer being in the nodeModulesPaths set.
        if (args.pluginData === IN_NODE_MODULES_RESOLVED) return {};
        if (args.pluginData === IN_NODE_MODULES) return undefined;
        if (nodeModulesPaths.has(args.importer)) {
          const res = await build.resolve(args.path, {
            importer: args.importer,
            namespace: args.namespace,
            kind: args.kind,
            resolveDir: args.resolveDir,
            pluginData: IN_NODE_MODULES,
          });
          if (!res.external) nodeModulesPaths.add(res.path);
          return res;
        }

        if (/\./.test(args.path) && !/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(args.path) && !/\:/.test(args.path)) {

          if (args.namespace=='file') {
            if (Deno.env.get('LOG')=='DEBUG') console.log('TO FILE resolver:', args.path, args.namespace);
            return { path: join(args.resolveDir, args.path) }
          } else if (args.namespace=='https' || args.namespace=='http') {
            // is css ?
            if (/\.s?css$/.test(args.path)) {
              if (LOG_DEBUG) console.log('return css as resolved', args.path, args.namespace, args.importer);
              if (args.importer && args.importer.startsWith('//') && !args.path.startsWith('//')) {
                const fromImportedPath = new URL(fixPrefixNamespacePath(args.namespace, args.path),
                  fixPrefixNamespacePath(args.namespace, args.importer)).toString();
                console.log('====fromImportedPath', fromImportedPath);

                return { path: fromImportedPath, namespace: args.namespace };
              }
              return { path: args.path, namespace: args.namespace };
            } else if (/\.(woff|woff2|eot|otf|ttf|svg|png|jpe?g)$/.test(args.path)) {
              if (args.importer.endsWith('.css')) {
                if (LOG_DEBUG) console.log('=====css :external:', args.importer);
                console.log('=====css external[1]:', args.path, 'importer:', args.importer);
                return { path: args.path, namespace: args.namespace, external: true };
              }
              console.log('======= args.importer:', args.importer, basename(args.importer));

              const fromImportedPath = new URL(fixPrefixNamespacePath(args.namespace, args.path),
                fixPrefixNamespacePath(args.namespace, args.importer)).toString();
              console.log('====fromImportedPath', fromImportedPath);

              return { path: fromImportedPath, namespace: args.namespace };
            } else {
              if (args.importer.endsWith('.css')) {
                console.log('=====css external[2]:', args.path, 'importer:', args.importer);
                return { path: args.path, namespace: args.namespace, external: true };
              }
              //console.log('===========https://  .raw', args.path, args.namespace);
              //return { path: args.namespace + ':' + args.path, namespace: 'http-url-raw' };
            }
          }
        }
        if (Deno.env.get('LOG')=='DEBUG') console.log('TO ESM resolver:', args.path, args.namespace);
        // WHATS ESM resolver? 
        /*
          sends to esm.sh and also to esbuild resolution
        */

        // The first pass resolver performs synchronous resolution. This
        // includes relative to absolute specifier resolution and import map
        // resolution.

        // We have to first determine the referrer URL to use when resolving
        // the specifier. This is either the importer URL, or the resolveDir
        // URL if the importer is not specified (ie if the specifier is at the
        // root).
        let referrer: URL;
        if (args.importer !== "") {
          if (args.namespace === "") {
            throw new Error("[assert] namespace is empty");
          }
          referrer = new URL(`${args.namespace}:${args.importer}`);
        } else if (args.resolveDir !== "") {
          referrer = new URL(`${toFileUrl(args.resolveDir).href}/`);
        } else {
          // ???
          if (LOG_DEBUG) console.log('??? undefined ???')
          return undefined;
        }

        //console.log('referrer set:', referrer.href);

        // We can then resolve the specifier relative to the referrer URL. If
        // an import map is specified, we use that to resolve the specifier.
        let resolved: URL;
        if (importMap !== null) {
          if (LOG_DEBUG) console.log('RESOLVING WITH IMPORTMAP', args.path);

          if (referrer.protocol == 'file:' && !(/https?\:/.test(args.path)) && !/[\/\.]/.test(args.path[0]) &&
                  !existsSync(args.path) && importMap.imports && !importMap.imports[args.path]) {
            console.log('unmapped import', args.path, 'specifier:', referrer.protocol, referrer.pathname);

            let localPath = '';

            //if (args.path[0] == '/' || args.path[0] == '.') {
            const localResolution = ['./$1/index.js', './$1/mod.ts', 'src/$1/index.js', 'src/$1/mod.ts',
              'vendor/$1/index.js', 'vendor/$1/mod.ts',
              'node_modules/$1/index.js', 'node_modules/$1/index.cjs', 'node_modules/$1/index.mjs'];

            const refdir = dirname(referrer.pathname);
            for (const lr of localResolution) {
              const lrp = join(refdir, lr.replace('$1', args.path));
              //console.log(refdir, lr, args.path, lrp);
              if (existsSync(lrp)) {
                localPath = lrp;
                console.log('resolved to localPath:', localPath);
                break;
              }
            }
            //}

            if (!localPath) {
              // define in the imports: { "cdnurl": "https://cdn.skypack.dev/" }
              const defaultCdn = 'https://esm.sh';
              const getCdnUrl = (importMap: ImportMap) => (importMap?.imports? importMap?.imports['cdnurl'] ?? defaultCdn: defaultCdn);
              const mappedUrl = getCdnUrl(importMap) + (args.path[0] == '/'? '': '/') + args.path;

              const stripTrailingSlashes = (s: string) => stripTrailingSeparators(s, c => c == '/'.charCodeAt(0));

              const aPath = stripTrailingSlashes(args.path);
              const mappedUrl2 = stripTrailingSlashes(mappedUrl);

              importMap.imports[aPath] = mappedUrl2;
              importMap.imports[aPath + '/'] = mappedUrl2 + '/';

              Deno.writeTextFileSync("deno.imports.lock.json", JSON.stringify({
                "imports": importMap.imports
              }, null, 2));

              console.log(green('mapped:'), yellow(args.path), '=', green(mappedUrl));
            } else {
              // console.log(red('bare file: specifier unresolved'), args.path, args, referrer);
              console.log(green('checking:'), yellow(args.path));
            }
          }

          const res = resolveModuleSpecifier(
            args.path,
            importMap,
            new URL(referrer),
          );
          resolved = new URL(res);
        } else {
          resolved = new URL(args.path, referrer);
        }

        //console.log('====@urlToEsbuildResolution(resolved', resolved);
        // Now pass the resolved specifier back into the resolver, for a second
        // pass. Now plugins can perform any resolution they want on the fully
        // resolved specifier.
        const { path, namespace } = urlToEsbuildResolution(resolved);
        if (LOG_DEBUG) console.log('====@build.resolve(path', path, namespace, args.kind);
        const res = await build.resolve(path, {
          namespace,
          kind: args.kind,
        });


        if (res.errors.length) {
          if (LOG_DEBUG) console.log('======ERROR RESOLVING========', res);
          // WE HAVE ERROR!!!
          //   Error: Expected a JavaScript or TypeScript module, but identified a Unknown module. Importing these types of modules is currently not supported.
          // Can we simple choose between external versus raw loader??
          const specRgx = /Specifier: (.+)/;
          const specifier = res.errors.filter(err => err.text.includes('Unknown module') && specRgx.test(err.text))
            .map(e => (e.text.match(specRgx) || ['', ''])[1])[0];
            //.filter(e => e != null)[0];
          if (specifier) {
            return { path: specifier, namespace: specifier.includes(':')? specifier.split(':')[0]: 'file' };
          }
          // console.log('=====a', error, '=====b', res.errors[0], '=====c', error.detail, '=====d', error.specifier ?? '', '=====e', error.detail.specifier ?? '', '======f');
        }

        if (res.pluginData === IN_NODE_MODULES) nodeModulesPaths.add(res.path);
        return res;
      });

    },
  };
}

function fixPrefixNamespacePath(namespace: string, path: string) {
  return path.startsWith('//')? namespace + ':' + path: path;
}

