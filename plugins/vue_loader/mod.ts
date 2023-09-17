import {
  Factory,
  Storage,
} from "../../vendor/github.com/scriptmaster/vno/dist/mod.ts";
// import { basename } from "https://deno.land/std@0.200.0/path/mod.ts";

export class Loader {
    context: {
        storage?: Storage;
    } = {};

    constructor() {
        this.context = {};
        console.log('Initializing Vue Loader');
    }

    // Other ref: https://github.com/danielroe/nuxt-deno
  async vueCompiler(
    path: string
  ) {
    let vuejs = "";
    if (!this.context.storage) {
      const factory = getFactory();
      this.context.storage = await factory.build(false, true);
      vuejs = `import * as Vue from "vue";\n`;
      vuejs += `const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = Vue;\n`;
      //vuejs += `console.log('----openBlock------', _createVNode, _openBlock, _createBlock);\n`;
      //vuejs += storage.pub_vue.dep + `"vue"`;
      //console.log("plugins/vue_loader:", vuejs);
    }

    const cwd = Deno.cwd();

    const relPath = path.replace(cwd + "/", "");
    // console.log('relPath:', relPath, cwd);
    // console.log(storage, storage.paths[relPath]);
    if (this.context.storage.paths[relPath]) {
      const cmp = this.context.storage.paths[relPath];
      vuejs +=
        cmp?.parsed_data?.instance ||
        `console.log("no parsed_data for ${relPath} in ${cwd}")`;
      vuejs += "\nexport default " + cmp.label + ";\n\n";

      //console.log(vuejs);

      return vuejs;
    }

    vuejs += `console.log("no such vue: ${relPath} in ${cwd}")`;

    return vuejs;
  }
}

function getFactory() {
  return Factory.create();
}
