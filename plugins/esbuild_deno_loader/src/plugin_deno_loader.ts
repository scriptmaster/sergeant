import { existsSync } from "https://deno.land/std@0.83.0/fs/exists.ts";
import { esbuild, join, dirname, sass } from "../deps.ts";
import { NativeLoader } from "./loader_native.ts";
import { PortableLoader } from "./loader_portable.ts";
import {
  IN_NODE_MODULES,
  IN_NODE_MODULES_RESOLVED,
} from "./plugin_deno_resolver.ts";
import {
  esbuildResolutionToURL,
  Loader,
  urlToEsbuildResolution,
} from "./shared.ts";
import { green, yellow } from "https://deno.land/std@0.140.0/fmt/colors.ts";

export interface DenoLoaderPluginOptions {
  /**
   * Specify which loader to use. By default this will use the `native` loader,
   * unless the `--allow-run` permission has not been given.
   *
   * See {@link denoLoaderPlugin} for more information on the different loaders.
   */
  loader?: "native" | "portable";

  /**
   * Specify the path to a deno.json config file to use. This is equivalent to
   * the `--config` flag to the Deno executable. This path must be absolute.
   *
   * NOTE: Import maps in the config file are not used to inform resolution, as
   * this has already been done by the `denoResolverPlugin`. This option is only
   * used when specifying `loader: "native"` to more efficiently load modules
   * from the cache. When specifying `loader: "native"`, this option must be in
   * sync with the `configPath` option for `denoResolverPlugin`.
   */
  configPath?: string;
  /**
   * Specify a URL to an import map file to use when resolving import
   * specifiers. This is equivalent to the `--import-map` flag to the Deno
   * executable. This URL may be remote or a local file URL.
   *
   * If this option is not specified, the deno.json config file is consulted to
   * determine what import map to use, if any.
   *
   * NOTE: Import maps in the config file are not used to inform resolution, as
   * this has already been done by the `denoResolverPlugin`. This option is only
   * used when specifying `loader: "native"` to more efficiently load modules
   * from the cache. When specifying `loader: "native"`, this option must be in
   * sync with the `importMapURL` option for `denoResolverPlugin`.
   */
  importMapURL?: string;
  // TODO(lucacasonato): https://github.com/denoland/deno/issues/18159
  // /**
  //  * Specify the path to a lock file to use. This is equivalent to the `--lock`
  //  * flag to the Deno executable. This path must be absolute.
  //  *
  //  * If this option is not specified, the deno.json config file is consulted to
  //  * determine what import map to use, if any.
  //  *
  //  * NOTE: when using `loader: "portable"`, lock checks are not performed for
  //  * ESM modules.
  //  */
  // lockPath?: string;
  /**
   * Specify whether to generate and use a local `node_modules` directory when
   * using the `native` loader. This is equivalent to the `--node-modules-dir`
   * flag to the Deno executable.
   *
   * This option is ignored when using the `portable` loader, as the portable
   * loader always uses a local `node_modules` directory.
   */
  nodeModulesDir?: boolean;

  context?: object;
}

const LOADERS = ["native", "portable"] as const;

/** The default loader to use. */
export const DEFAULT_LOADER: typeof LOADERS[number] =
  await Deno.permissions.query({ name: "run" })
      .then((res) => res.state !== "granted")
    ? "portable"
    : "native";

/**
 * The Deno loader plugin for esbuild. This plugin will load fully qualified
 * `file`, `http`, `https`, and `data` URLs.
 *
 * **Note** that this plugin does not do relative->absolute specifier
 * resolution, or import map resolution. You must use the `denoResolverPlugin`
 * _before_ the `denoLoaderPlugin` to do that.
 *
 * This plugin can be backed by two different loaders, the `native` loader and
 * the `portable` loader.
 *
 * ### Native Loader
 *
 * The native loader shells out to the Deno executable under the hood to load
 * files. Requires `--allow-read` and `--allow-run`. In this mode the download
 * cache is shared with the Deno executable. This mode respects deno.lock,
 * DENO_DIR, DENO_AUTH_TOKENS, and all similar loading configuration. Files are
 * cached on disk in the same Deno cache as the Deno executable, and will not be
 * re-downloaded on subsequent builds.
 *
 * NPM specifiers can be used in the native loader without requiring a local
 * `node_modules` directory. NPM packages are resolved, downloaded, cached, and
 * loaded in the same way as the Deno executable does.
 *
 * ### Portable Loader
 *
 * The portable loader does module downloading and caching with only Web APIs.
 * Requires `--allow-read` and/or `--allow-net`. This mode does not respect
 * deno.lock, DENO_DIR, DENO_AUTH_TOKENS, or any other loading configuration. It
 * does not cache downloaded files. It will re-download files on every build.
 *
 * NPM specifiers can be used in the portable loader, but require a local
 * `node_modules` directory. The `node_modules` directory must be created prior
 * using Deno's `--node-modules-dir` flag.
 */
export function denoLoaderPlugin(
  options: DenoLoaderPluginOptions = {},
): esbuild.Plugin {
  const loader = options.loader ?? DEFAULT_LOADER;
  if (LOADERS.indexOf(loader) === -1) {
    throw new Error(`Invalid loader: ${loader}`);
  }
  return {
    name: "deno-loader",
    setup(build: esbuild.PluginBuild) {
      const cwd = build.initialOptions.absWorkingDir ?? Deno.cwd();

      let nodeModulesDir: string | null = null;
      if (options.nodeModulesDir) {
        nodeModulesDir = join(cwd, "node_modules");
      }

      let loaderImpl: Loader;

      const packageIdMapping = new Map<string, string>();

      build.onStart(function onStart() {
        packageIdMapping.clear();
        switch (loader) {
          case "native":
            loaderImpl = new NativeLoader({
              infoOptions: {
                cwd,
                config: options.configPath,
                importMap: options.importMapURL,
                // TODO(lucacasonato): https://github.com/denoland/deno/issues/18159
                // lock: options.lockPath,
                nodeModulesDir: options.nodeModulesDir,
              },
            });
            break;
          case "portable":
            loaderImpl = new PortableLoader();
        }
      });

      async function resolveInNodeModules(
        path: string,
        packageId: string,
        kind: esbuild.ImportKind,
        resolveDir: string,
        importer: string,
        namespace: string,
      ): Promise<esbuild.OnResolveResult> {
        const result = await build.resolve(path, {
          kind,
          resolveDir,
          importer,
          namespace,
          pluginData: IN_NODE_MODULES_RESOLVED,
        });
        result.pluginData = IN_NODE_MODULES;
        packageIdMapping.set(result.path, packageId);
        return result;
      }

      async function onResolve(
        args: esbuild.OnResolveArgs,
      ): Promise<esbuild.OnResolveResult | null | undefined> {
        //console.log('====loader:onResolve', args.path);

        if (args.namespace === "file" && args.pluginData === IN_NODE_MODULES) {
          if (nodeModulesDir) {
            const result = await build.resolve(args.path, {
              kind: args.kind,
              resolveDir: args.resolveDir,
              importer: args.importer,
              namespace: args.namespace,
              pluginData: IN_NODE_MODULES_RESOLVED,
            });
            result.pluginData = IN_NODE_MODULES;
            return result;
          } else if (
            loaderImpl.nodeModulesDirForPackage &&
            loaderImpl.packageIdFromNameInPackage
          ) {
            const parentPackageId = packageIdMapping.get(args.importer);
            if (!parentPackageId) {
              throw new Error(
                `Could not find package ID for importer: ${args.importer}`,
              );
            }
            if (args.path.startsWith(".")) {
              return resolveInNodeModules(
                args.path,
                parentPackageId,
                args.kind,
                args.resolveDir,
                args.importer,
                args.namespace,
              );
            } else {
              let packageName: string;
              let pathParts: string[];
              if (args.path.startsWith("@")) {
                const [scope, name, ...rest] = args.path.split("/");
                packageName = `${scope}/${name}`;
                pathParts = rest;
              } else {
                const [name, ...rest] = args.path.split("/");
                packageName = name;
                pathParts = rest;
              }
              const packageId = loaderImpl.packageIdFromNameInPackage(
                packageName,
                parentPackageId,
              );
              const resolveDir = await loaderImpl.nodeModulesDirForPackage(
                packageId,
              );
              const path = [packageName, ...pathParts].join("/");
              return resolveInNodeModules(
                path,
                parentPackageId,
                args.kind,
                resolveDir,
                args.importer,
                args.namespace,
              );
            }
          } else {
            throw new Error(
              `To use "npm:" specifiers, you must specify "nodeModulesDir: true", or use "loader: native".`,
            );
          }
        }

        const specifier = esbuildResolutionToURL(args);

        // Once we have an absolute path, let the loader resolver figure out
        // what to do with it.
        const res = await loaderImpl.resolve(specifier);

        switch (res.kind) {
          case "esm": {
            const { specifier } = res;
            return urlToEsbuildResolution(specifier);
          }
          case "npm": {
            let resolveDir: string;
            if (nodeModulesDir) {
              resolveDir = nodeModulesDir;
            } else if (loaderImpl.nodeModulesDirForPackage) {
              resolveDir = await loaderImpl.nodeModulesDirForPackage(
                res.packageId,
              );
            } else {
              throw new Error(
                `To use "npm:" specifiers, you must specify "nodeModulesDir: true", or use "loader: native".`,
              );
            }
            const path = `${res.packageName}${res.path ?? ""}`;
            return resolveInNodeModules(
              path,
              res.packageId,
              args.kind,
              resolveDir,
              args.importer,
              args.namespace,
            );
          }
          case "node": {
            const p = res.path.split('node:')[1] || '';
            console.log('node:', green(p), 'https:'+nodePolyfillsLibs.get(p));
            return {
              path: nodePolyfillsLibs.get(p),
              namespace: 'https',
              // external: true,
            };
          }
        }
      }
      build.onResolve({ filter: /.*/, namespace: "file" }, onResolve);
      build.onResolve({ filter: /.*/, namespace: "http" }, onResolve);
      build.onResolve({ filter: /.*/, namespace: "https" }, onResolve);
      build.onResolve({ filter: /.*/, namespace: "data" }, onResolve);
      build.onResolve({ filter: /.*/, namespace: "npm" }, onResolve);
      build.onResolve({ filter: /.*/, namespace: "node" }, onResolve);

      async function onLoad(
        args: esbuild.OnLoadArgs,
      ): Promise<esbuild.OnLoadResult | null> {
        //if (/\.css$/.test(args.path))
        //console.log('======== onLoad ======', args);// return { loader: 'file', contents: '' };
        if (args.namespace === "file" && args.pluginData === IN_NODE_MODULES) {
          const contents = await Deno.readFile(args.path);
          return { loader: "js", contents };
        }
        if (Deno.env.get('LOG')=='DEBUG') console.log('Loader::', args.path, args.namespace, !/(\.(tsx|ts|jsx|js)?)$/.test(args.path));
        if(/\.s?css$/.test(args.path)) {
          if (Deno.env.get('LOG')=='DEBUG') console.log('CSS Loader:', args.path);
          const contents = await getLocalOrRemoteFileContents(args);
          if(/\.scss$/.test(args.path)) {
            if (Deno.env.get('LOG')=='DEBUG') console.log('SCSS Loader:', args.path);
            const css = sass(contents, { load_paths: [dirname(args.path)] }).to_string("compressed")
            // const css = sass(contents).to_string("compressed")
            return { loader: 'css', contents: css.toString() }
          }
          return { loader: 'css', contents };
          // } else if (args.namespace=='file' && /(\.(vue|vuex))$/.test(args.path)) {
          //   debug('vue:', args.path);

          //   const loader = new VueLoader(options.context as CompilerContext);
          //   const contents = await loader.vue(args.path);

          //   return { loader: 'tsx', contents };
        } else if (args.namespace=='file' && !/(\.(tsx|ts|jsx|js))$/.test(args.path)) {
          if (Deno.env.get('LOG')=='DEBUG') console.log('CHECK FILE::', args.path);
          if(existsSync(args.path)) {
            if (Deno.env.get('LOG')=='DEBUG') console.log('FILE EXISTS::', args.path);
            const contents = await Deno.readTextFile(args.path);
            // console.log('plugin_deno_loader::File Contents: ', contents);
 
            return { loader: 'file', contents };
          } else {
            if (Deno.env.get('LOG')=='DEBUG') console.log('FILE NOT EXISTS::', args.path);
            if (existsSync(args.path + '.ts')) {
              args.path += '.ts';
            } else if (existsSync(args.path + '.tsx')) {
              args.path += '.tsx';
            } else if (existsSync(args.path + '.js')) {
              args.path += '.js';
            } else if (existsSync(args.path + '.jsx')) {
              args.path += '.jsx';
            }
          }
        }

        const specifier = esbuildResolutionToURL(args);
        if (Deno.env.get('LOG') == 'DEBUG') console.log('SPECIFIER:', specifier.href);
        return loaderImpl.loadEsm(specifier);
      }
      // TODO(lucacasonato): once https://github.com/evanw/esbuild/pull/2968 is fixed, remove the catch all "file" handler
      build.onLoad({ filter: /.*/, namespace: "file" }, onLoad);
      build.onLoad({ filter: /.*/, namespace: "http" }, onLoad);
      build.onLoad({ filter: /.*/, namespace: "https" }, onLoad);
      build.onLoad({ filter: /.*/, namespace: "data" }, onLoad);
    },
  };
}


function fixPrefixNamespacePath(namespace: string, path: string) {
  return path.startsWith('//')? namespace + ':' + path: path;
}

async function getLocalOrRemoteFileContents(args: esbuild.OnLoadArgs) {
  if (args.namespace == 'file') {
    return await Deno.readTextFile(args.path);
  } else if (args.namespace == 'https' || args.namespace == 'http') {
    const url = fixPrefixNamespacePath(args.namespace, args.path);
    console.log(yellow('Downloading:'), url);
    const res = await fetch(url);
    if (res.status != 200) return '';
    return await res.text();
  } else {
    return '';
  }
}

//@ts-ignore args can be any given to console
function debug(...a: any[]) {
  if (Deno.env.get('LOG')=='DEBUG') console.log.apply(console, a);
}

type vueLoaderFn = (path: string) => string | Promise<string>;



class VueLoader {
  context?: VueCompilerContext;

  constructor(context: VueCompilerContext) {
    this.context = context;
  }

  async vue(path: string) {
    if(!this.context) {
      throw new Error('vue(path, ctx), ctx is required: {}');
    }

    console.log('vue compiler: path:', path);

    if (!this.context.vueCompiler) {
      this.context.vueCompiler = (path: string) => path;

      const { Loader } = await import('../../vue_loader/mod.ts');
      const loader = new Loader();
      this.context.vueCompiler = loader.vueCompiler.bind(loader);
    }

    let contents = '';

    const restoreCwd = Deno.cwd();
    Deno.chdir(join(dirname(path)));

    console.log('vue compiler: path2:', path);
    contents = await this.context.vueCompiler(path);

    Deno.chdir(restoreCwd);
    
    return contents;
  }

}

export interface VueCompilerContext {
  vueCompiler?: vueLoaderFn
}

export type CompilerContext = VueCompilerContext | object;





const require = {
  resolve: function(path: string) {
    return '//esm.sh/' + path;
  }
}

const EMPTY_PATH = require.resolve(
  'rollup-plugin-node-polyfills/polyfills/empty.js',
)


export function builtinsPolyfills() {
  const libs = new Map()

  libs.set(
      'process',
      require.resolve('rollup-plugin-node-polyfills/polyfills/process-es6'),
  )
  libs.set(
      'buffer',
      require.resolve('rollup-plugin-node-polyfills/polyfills/buffer-es6'),
  )
  libs.set(
      'util',
      require.resolve('rollup-plugin-node-polyfills/polyfills/util'),
  )
  libs.set('sys', libs.get('util'))
  libs.set(
      'events',
      require.resolve('rollup-plugin-node-polyfills/polyfills/events'),
  )
  libs.set(
      'stream',
      require.resolve('rollup-plugin-node-polyfills/polyfills/stream'),
  )
  libs.set(
      'path',
      require.resolve('rollup-plugin-node-polyfills/polyfills/path'),
  )
  libs.set(
      'querystring',
      require.resolve('rollup-plugin-node-polyfills/polyfills/qs'),
  )
  libs.set(
      'punycode',
      require.resolve('rollup-plugin-node-polyfills/polyfills/punycode'),
  )
  libs.set(
      'url',
      require.resolve('rollup-plugin-node-polyfills/polyfills/url'),
  )
  libs.set(
      'string_decoder',
      require.resolve(
          'rollup-plugin-node-polyfills/polyfills/string-decoder',
      ),
  )
  libs.set(
      'http',
      require.resolve('rollup-plugin-node-polyfills/polyfills/http'),
  )
  libs.set(
      'https',
      require.resolve('rollup-plugin-node-polyfills/polyfills/http'),
  )
  libs.set('os', require.resolve('rollup-plugin-node-polyfills/polyfills/os'))
  libs.set(
      'assert',
      require.resolve('rollup-plugin-node-polyfills/polyfills/assert'),
  )
  libs.set(
      'constants',
      require.resolve('rollup-plugin-node-polyfills/polyfills/constants'),
  )
  libs.set(
      '_stream_duplex',
      require.resolve(
          'rollup-plugin-node-polyfills/polyfills/readable-stream/duplex',
      ),
  )
  libs.set(
      '_stream_passthrough',
      require.resolve(
          'rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough',
      ),
  )
  libs.set(
      '_stream_readable',
      require.resolve(
          'rollup-plugin-node-polyfills/polyfills/readable-stream/readable',
      ),
  )
  libs.set(
      '_stream_writable',
      require.resolve(
          'rollup-plugin-node-polyfills/polyfills/readable-stream/writable',
      ),
  )
  libs.set(
      '_stream_transform',
      require.resolve(
          'rollup-plugin-node-polyfills/polyfills/readable-stream/transform',
      ),
  )
  libs.set(
      'timers',
      require.resolve('rollup-plugin-node-polyfills/polyfills/timers'),
  )
  libs.set(
      'console',
      require.resolve('rollup-plugin-node-polyfills/polyfills/console'),
  )
  libs.set('vm', require.resolve('rollup-plugin-node-polyfills/polyfills/vm'))
  libs.set(
      'zlib',
      require.resolve('rollup-plugin-node-polyfills/polyfills/zlib'),
  )
  libs.set(
      'tty',
      require.resolve('rollup-plugin-node-polyfills/polyfills/tty'),
  )
  libs.set(
      'domain',
      require.resolve('rollup-plugin-node-polyfills/polyfills/domain'),
  )

  // not shimmed
  libs.set('dns', EMPTY_PATH)
  libs.set('dgram', EMPTY_PATH)
  libs.set('child_process', EMPTY_PATH)
  libs.set('cluster', EMPTY_PATH)
  libs.set('module', EMPTY_PATH)
  libs.set('net', EMPTY_PATH)
  libs.set('readline', EMPTY_PATH)
  libs.set('repl', EMPTY_PATH)
  libs.set('tls', EMPTY_PATH)
  libs.set('fs', EMPTY_PATH)
  libs.set('crypto', EMPTY_PATH)

  // libs.set(
  //     'fs',
  //     require.resolve('rollup-plugin-node-polyfills/polyfills/browserify-fs'),
  // )

  // TODO enable crypto and fs https://github.com/ionic-team/rollup-plugin-node-polyfills/issues/20
  // libs.set(
  //     'crypto',
  //     require.resolve(
  //         'rollup-plugin-node-polyfills/polyfills/crypto-browserify',
  //     ),
  // )

  return libs
}

const nodePolyfillsLibs = builtinsPolyfills();


