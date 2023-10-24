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

# Commands
```
sergeant
sergeant build
sergeant serve
sergeant serve --dev
```

# Install
Only need deno to install sergeant (esbuild is automatically imported):

## sergeant

```
deno install -A -f -n sergeant https://cdn.jsdelivr.net/gh/scriptmaster/sergeant/sergeant.ts
```

Only need deno and sergeant and you can do `sergeant` or `sergeant serve`

### Build All apps:
`sergeant build`

### Live Dev Server all apps:
`sergeant serve`


### Build specific app:
`sergeant build`

### Live Dev Server specific app:
`sergeant serve`


## Installing Deno
https://docs.deno.com/runtime/manual/getting_started/installation

### Windows x64: 
Using PowerShell (Windows):
irm https://deno.land/install.ps1 | iex

#### Or Using Chocolatey:
choco install deno

### MacOS: brew install deno



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

# deno.json

Extra watch dirs

Create app level deno.json and configure watching extra deps:

{
    "watch": "emeraldcss"
}


# denopkg.com

To use GitHub as a package registry for Deno, you only need to replace github.com with denopkg.com like this:
https://denopkg.com/user/repo or repo@tag/path/to/file

Example:

import { opn } from 'https://denopkg.com/hashrock/deno-opn/opn.ts'
opn('https://denopkg.com')

# web framework

https://alosaur.com/docs/intro
