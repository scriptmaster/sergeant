# About Sergeant

A lightweight micro-services producing deno-[p]react SSG-first SEO-friendly framework.

+ Produces bundles within seconds for 100s of apps.
+ Cross-compile from multiple projects
+ Supports scss
+ Scaffolding
+ Has livereload
+ denocacheusage: 10MB only, bundle sizes less than 20KB (if u use preact), and 200KB for react.

Compare this with 200MB-400MB node_modules for a react hello world project.

# Sergeant is production ready from Day-1

✨ Sergeant 🫡      A front-end microservices framework! 

```
███████╗███████╗██████╗  ██████╗ ███████╗ █████╗ ███╗   ██╗████████╗
██╔════╝██╔════╝██╔══██╗██╔════╝ ██╔════╝██╔══██╗████╗  ██║╚══██╔══╝
███████╗█████╗  ██████╔╝██║  ███╗█████╗  ███████║██╔██╗ ██║   ██║   
╚════██║██╔══╝  ██╔══██╗██║   ██║██╔══╝  ██╔══██║██║╚██╗██║   ██║   
███████║███████╗██║  ██║╚██████╔╝███████╗██║  ██║██║ ╚████║   ██║   
╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   

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

Building enabled apps:
Building: apps/app2
apps/app2/dist/app-esbuild.main.js 160 KB 
Building: apps/app1
apps/app1/dist/app-esbuild.main.js 10 KB 
Done
```

## Philosophy
1. No breaking changes (versioned imports)
2. SSG over SSR
3. Always bundle to one-file for 1-SPA

### More...
4. Support bundling multiple apps, SPAs via micro-services / app-routing
5. Support progressive and offline apps

# Install

Only need deno and the file sergeant.ts to install sergeant (imports esbuild)
`deno install -A -f sergeant.ts`

# Commands

```
sergeant
sergeant build
sergeant serve
sergeant serve --dev
```

# Deno Plugins:
Uses:
https://github.com/scriptmaster/esbuild_deno_loader
https://deno.land/x/esbuild_plugin_sass_deno
https://github.com/esbuild/community-plugins#plugins-for-deno

# Security of packages

How packages are downloaded?

Packages are primarily downloaded as ESM modules from https://esm.sh/package/ (instead of registry.npmjs.org).
 + It can be swapped to use enterprise ESM packages repository.
 + Packages 

The package can be looked up in ./vendor/ and ./node_modules/ in the format mod.ts index.mjs index.cjs index.js


# DI

React Context API is an incorrect implementation of a simple DI with prop drilling.
In apps containing 20+ dependencies to provider, the context pattern could become 20+ nested nodes.

DI enables you to directly provide the service/implementation for the consumer.
