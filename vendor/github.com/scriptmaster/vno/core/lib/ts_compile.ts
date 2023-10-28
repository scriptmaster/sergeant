import { colors } from "../utils/deps.ts";

// compile typescript code to string javascrit code

//`({ ${trimmed} })`, path
export async function typescriptCompile(
  source: string,
  path: string,
  cut = true,
): Promise<string> {
//creating random number file path
  const temp = `./${Math.random().toString().replace(".", "")}.ts`;
  try {
//creating a file path
    const file = await Deno.create(temp);
    const encoder = new TextEncoder();
//encode is method onTextEncoder and taking source and encoding source into UTF-8
    await file.write(encoder.encode(source));
//checks ts and js, bundles, and compiles butthischecks

    const { files } = await Deno.emit(temp, {
      bundle: undefined,
      check: true,
      compilerOptions: { strict: false },
    });

    // filter javascript output
    //takes files key/value pairs. flattens it, filters it, anything that doesnt' include file:// will be returned
//   [[1,2],1,2]]
    //[1,2,1,2].filter any element that does not include "file:///"
    const [script] = Object.entries(files).flat().filter((chunk) =>
      !chunk.includes("file:///")
    );

    await Deno.remove(temp, { recursive: true });

    return (cut ? script.substring(3, script.length - 4) : script);

    // return files;
  } catch (error) {
    await Deno.remove(temp, { recursive: true });
    console.log(error);
    throw new Error(
      colors.red(
        `Typescript compilation Error in ${colors.yellow(path)}`,
      ),
    );
  }
}
