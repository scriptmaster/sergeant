import { NpmSpecifier, parseNpmSpecifier } from "./shared.ts";
import { assertEquals, assertThrows } from "../test_deps.ts";

interface NpmSpecifierTestCase extends NpmSpecifier {
  specifier: string;
}

const NPM_SPECIFIER_VALID: Array<NpmSpecifierTestCase> = [
  {
    specifier: "npm:package@1.2.3/test",
    name: "package",
    version: "1.2.3",
    path: "/test",
  },
  {
    specifier: "npm:package@1.2.3",
    name: "package",
    version: "1.2.3",
    path: null,
  },
  {
    specifier: "npm:@package/test",
    name: "@package/test",
    version: null,
    path: null,
  },
  {
    specifier: "npm:@package/test@1",
    name: "@package/test",
    version: "1",
    path: null,
  },
  {
    specifier: "npm:@package/test@~1.1/sub_path",
    name: "@package/test",
    version: "~1.1",
    path: "/sub_path",
  },
  {
    specifier: "npm:@package/test/sub_path",
    name: "@package/test",
    version: null,
    path: "/sub_path",
  },
  {
    specifier: "npm:test",
    name: "test",
    version: null,
    path: null,
  },
  {
    specifier: "npm:test@^1.2",
    name: "test",
    version: "^1.2",
    path: null,
  },
  {
    specifier: "npm:test@~1.1/sub_path",
    name: "test",
    version: "~1.1",
    path: "/sub_path",
  },
  {
    specifier: "npm:@package/test/sub_path",
    name: "@package/test",
    version: null,
    path: "/sub_path",
  },
  {
    specifier: "npm:/@package/test/sub_path",
    name: "@package/test",
    version: null,
    path: "/sub_path",
  },
  {
    specifier: "npm:/test",
    name: "test",
    version: null,
    path: null,
  },
  {
    specifier: "npm:/test/",
    name: "test",
    version: null,
    path: "/",
  },
];

for (const test of NPM_SPECIFIER_VALID) {
  Deno.test(`parseNpmSpecifier: ${test.specifier}`, () => {
    const parsed = parseNpmSpecifier(new URL(test.specifier));
    assertEquals(parsed, {
      name: test.name,
      version: test.version,
      path: test.path,
    });
  });
}

const NPM_SPECIFIER_INVALID = [
  "npm:@package",
  "npm:/",
  "npm://test",
];
for (const specifier of NPM_SPECIFIER_INVALID) {
  Deno.test(`parseNpmSpecifier: ${specifier}`, () => {
    assertThrows(
      () => parseNpmSpecifier(new URL(specifier)),
      Error,
      "Invalid npm specifier",
    );
  });
}
