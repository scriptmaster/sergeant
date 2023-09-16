import { Factory, Storage } from "../../vendor/github.com/scriptmaster/vno/dist/mod.ts";
import { basename } from "https://deno.land/std@0.200.0/path/mod.ts";

let storage: Storage;

// https://github.com/danielroe/nuxt-deno
export async function loader(path: string) {

    let vuejs = '';
    if (!storage) {
        const factory = getFactory();
        storage =  await factory.build(false, true);
        vuejs = `import * as Vue from "vue";\n`;
        //vuejs += storage.pub_vue.dep + `"vue"`;
    }

    const cwd = Deno.cwd();

    const relPath = path.replace(cwd + '/', '');
    // console.log('relPath:', relPath, cwd);
    // console.log(storage, storage.paths[relPath]);
    if (storage.paths[relPath]) {
        const cmp = storage.paths[relPath];
        vuejs += cmp?.parsed_data?.instance || `console.log("no parsed_data for ${relPath} in ${cwd}")`;
        vuejs += '\nexport default ' + cmp.label + ';\n\n';

        //console.log(vuejs);

        return vuejs;
    }

    vuejs += `console.log("no such vue: ${relPath} in ${cwd}")`;

    return vuejs;
}

function getFactory() {
    return Factory.create();
    // return Factory.create({
    //     root: "App",
    //     entry: Deno.statSync(path).isFile? basename(path): path,
    //     vue: 3,
    //     options: {
    //         port: 3000
    //     }
    // })
}
