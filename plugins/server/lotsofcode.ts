import { contentType } from "https://deno.land/std@0.201.0/media_types/content_type.ts";
import { extname } from "https://deno.land/std@0.200.0/path/mod.ts";

export function serveLotsOfCode() {
    const port=50123;

    const defaultResponseOptions = (filename: string) => {
        return {
            headers: {
                "content-type": contentType(extname(filename)) || "application/octet-stream",
            },
        };
    };

    Deno.serve({port}, (req) => {
        console.log(req);
        return new Response('<h1>hi</h1>', defaultResponseOptions('.html'));
    });
}
