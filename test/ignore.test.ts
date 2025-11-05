import ignore from "ignore";
import { describe, expect, it } from "vitest";

describe("ignore tests", () => {
  it("test ignore", async () => {
    const ig = ignore();
    ig.add("node_modules");

    expect(ig.ignores("node_modules")).toMatchInlineSnapshot(`true`);
    expect(ig.ignores("node_modules/")).toMatchInlineSnapshot(`true`);
    expect(ig.ignores("node_modules/123123")).toMatchInlineSnapshot(`true`);
    expect(ig.ignores("node_modules/123123.node_modules")).toMatchInlineSnapshot(`true`);

    expect(ig.ignores("sdaf/node_modules")).toMatchInlineSnapshot(`true`);
    expect(ig.ignores("sdaf/node_modules/")).toMatchInlineSnapshot(`true`);
    expect(ig.ignores("sdaf/node_modules/123123")).toMatchInlineSnapshot(`true`);

    expect(ig.ignores("sdaf/123123.node_modules/")).toMatchInlineSnapshot(`false`);

    expect(ig.ignores("sdaf/.node_modules")).toMatchInlineSnapshot(`false`);
    expect(ig.ignores(".node_modules")).toMatchInlineSnapshot(`false`);
    expect(ig.ignores(".sub/node_modules")).toMatchInlineSnapshot(`true`);
  });
});
